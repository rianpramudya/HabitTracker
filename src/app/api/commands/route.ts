import { NextResponse } from 'next/server';
import { z } from 'zod';
import { userClient, commitClient } from '@/lib/supabase/server';
import { fail, sameOrigin } from '@/lib/http';
import { applyCommand, DomainError, type State } from '@/modules/tracking/domain';
import { devEmailAllowed, devPersonalEnabled } from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail('Origin tidak diizinkan', 403);
  const devPersonal = devPersonalEnabled();
  if (!devPersonal && (process.env.AUTH_READY !== 'true' || process.env.CORE_READY !== 'true'))
    return fail('Akses produk belum dibuka', 503);
  const operation = z.uuid().safeParse(request.headers.get('Idempotency-Key'));
  if (!operation.success) return fail('Identitas operasi wajib', 400);
  if (Number(request.headers.get('content-length') ?? 0) > 24000)
    return fail('Input terlalu besar', 413);
  try {
    const client = await userClient();
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();
    if (authError || !user || !user.email_confirmed_at) return fail('Autentikasi diperlukan', 401);
    if (devPersonal && !devEmailAllowed(user.email ?? ''))
      return fail('Akses produk tidak tersedia', 403);
    const body = await request.text();
    if (body.length > 24000) return fail('Input terlalu besar', 413);
    let input: unknown;
    try {
      input = JSON.parse(body);
    } catch {
      return fail('JSON tidak valid', 400);
    }
    const { data, error } = await client.rpc('read_core');
    if (error || !data) return fail('Akses produk tidak tersedia', 403);

    // getUser validates identity; guard/session authorization is rechecked in transactional RPC.
    const { data: session } = await client.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return fail('Sesi tidak tersedia', 401);
    const sessionId = sessionIdFromToken(token);
    if (!sessionId) return fail('Sesi tidak valid', 401);
    const writer = commitClient();
    const { data: previous, error: lookupError } = await writer.rpc('committed_operation', {
      p_owner: user.id,
      p_session: sessionId,
      p_operation: operation.data,
      p_input: input,
    });
    if (lookupError) return fail('Operasi tidak tersedia', 403);
    if (previous)
      return NextResponse.json(
        { state: previous.state },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    const state = applyCommand(data.state as State, input, operation.data);
    const { data: result, error: writeError } = await writer.rpc('commit_core', {
      p_owner: user.id,
      p_session: sessionId,
      p_revision: data.revision,
      p_operation: operation.data,
      p_input: input,
      p_state: state,
    });
    if (writeError)
      return fail(
        writeError.code === '40001'
          ? 'Data berubah di perangkat lain. Muat versi terbaru.'
          : 'Perubahan tidak dapat disimpan',
        writeError.code === '40001' ? 409 : 403,
      );
    return NextResponse.json({ state: result.state }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof DomainError) return fail(e.message, e.status);
    return fail('Perubahan tidak dapat disimpan. Input tetap tersedia.', 503);
  }
}
