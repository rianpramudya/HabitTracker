import { z } from 'zod';
import { NextResponse } from 'next/server';
import { fail, sameOrigin } from '@/lib/http';
import { commitClient, userClient } from '@/lib/supabase/server';
import { devEmailAllowed, localRequest } from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
import { socialDevEnabled } from '@/modules/social/flags';

export const dynamic = 'force-dynamic';
const decision = z.strictObject({
  reportId: z.uuid(),
  hide: z.boolean(),
  reason: z.string().trim().min(1).max(500),
});

async function moderator(request: Request) {
  if (!socialDevEnabled() || !localRequest(request)) return null;
  const client = await userClient();
  const { data: identity, error } = await client.auth.getUser();
  if (error || !identity.user?.email || !devEmailAllowed(identity.user.email)) return null;
  const { data: session } = await client.auth.getSession();
  const token = session.session?.access_token;
  const sessionId = sessionIdFromToken(token);
  if (!token || !sessionId) return null;
  const { data: assurance, error: mfaError } =
    await client.auth.mfa.getAuthenticatorAssuranceLevel(token);
  if (mfaError || assurance.currentLevel !== 'aal2') return null;
  return { owner: identity.user.id, sessionId };
}

export async function GET(request: Request) {
  const access = await moderator(request);
  if (!access) return fail('Moderasi tidak tersedia', 403);
  const { data, error } = await commitClient().rpc('social_moderation_queue', {
    p_owner: access.owner,
    p_session: access.sessionId,
  });
  if (error) return fail('Moderasi tidak tersedia', 403);
  return NextResponse.json({ reports: data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail('Origin tidak diizinkan', 403);
  const access = await moderator(request);
  if (!access) return fail('Moderasi tidak tersedia', 403);
  let parsed;
  try {
    const body = await request.text();
    if (body.length > 800) return fail('Input terlalu besar', 413);
    parsed = decision.safeParse(JSON.parse(body));
  } catch {
    return fail('Input tidak valid', 400);
  }
  if (!parsed.success) return fail('Input tidak valid', 400);
  const { data, error } = await commitClient().rpc('social_moderate', {
    p_owner: access.owner,
    p_session: access.sessionId,
    p_report: parsed.data.reportId,
    p_hide: parsed.data.hide,
    p_reason: parsed.data.reason,
  });
  if (error || !data)
    return fail(
      error?.code === '40001' ? 'Laporan sudah ditangani' : 'Tindakan tidak tersedia',
      error?.code === '40001' ? 409 : 403,
    );
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
