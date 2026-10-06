import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fail, sameOrigin } from '@/lib/http';
import { userClient, commitClient } from '@/lib/supabase/server';
import { devEmailAllowed, devPersonalEnabled } from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
import { financialCommandSchema } from '@/modules/finance/contracts';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail('Origin tidak diizinkan', 403);
  if (!devPersonalEnabled() && (process.env.AUTH_READY !== 'true' || process.env.CORE_READY !== 'true')) return fail('Akses produk belum dibuka', 503);
  const operation = z.uuid().safeParse(request.headers.get('Idempotency-Key'));
  if (!operation.success) return fail('Identitas operasi wajib', 400);
  if (Number(request.headers.get('content-length') ?? 0) > 8000) return fail('Input terlalu besar', 413);
  const client = await userClient();
  const { data: identity, error: authError } = await client.auth.getUser();
  const user = identity.user;
  if (authError || !user?.email_confirmed_at) return fail('Autentikasi diperlukan', 401);
  if (devPersonalEnabled() && !devEmailAllowed(user.email ?? '')) return fail('Akses produk tidak tersedia', 403);
  const { data: current, error: readError } = await client.rpc('read_core');
  if (readError || !current) return fail('Akses produk tidak tersedia', 403);
  const { data: session } = await client.auth.getSession();
  const sessionId = sessionIdFromToken(session.session?.access_token);
  if (!sessionId) return fail('Sesi tidak valid', 401);
  let json: unknown;
  try { json = JSON.parse(await request.text()); } catch { return fail('JSON tidak valid', 400); }
  const parsed = financialCommandSchema.safeParse(json);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Input tidak valid', 400);
  const { error } = await commitClient().rpc('financial_command', { p_owner: user.id, p_session: sessionId, p_operation: operation.data, p_input: parsed.data });
  if (error) return fail(error.code === '23505' ? 'Nama sudah dipakai' : error.code === '22023' ? 'Data tidak valid atau akses objek ditolak' : 'Perubahan belum dapat disimpan', error.code === '23505' || error.code === '22023' ? 409 : 403);
  const [core, financial] = await Promise.all([client.rpc('read_core'), client.rpc('financial_read')]);
  if (core.error || financial.error || !core.data || !financial.data) return fail('Tersimpan, tetapi ringkasan belum dapat dimuat. Muat ulang halaman.', 503);
  return NextResponse.json({ state: core.data.state, financial: financial.data }, { headers: { 'Cache-Control': 'no-store' } });
}
