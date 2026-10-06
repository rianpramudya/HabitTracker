import { NextResponse } from 'next/server';
import { authRequest } from '@/modules/auth/contracts';
import {
  devAccountEnabled,
  devEmailAllowed,
  devPersonalEnabled,
  localRequest,
} from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
import { sameOrigin } from '@/lib/http';
import { devAdminAuthClient, userClient } from '@/lib/supabase/server';

function result(code: 'unavailable' | 'invalid' | 'credentials', status: number) {
  return NextResponse.json(
    { ok: false, code },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export function GET() {
  return result('unavailable', 503);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return result('invalid', 403);
  if (!localRequest(request) || !devAccountEnabled()) return result('unavailable', 503);
  if (Number(request.headers.get('content-length')) > 1024) return result('invalid', 413);
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 1024) return result('invalid', 413);
    input = JSON.parse(body);
  } catch {
    return result('invalid', 400);
  }
  const parsed = authRequest.safeParse(input);
  if (!parsed.success) return result('invalid', 400);
  const command = parsed.data;
  if (command.action === 'logout') {
    const client = await userClient();
    await client.auth.signOut();
    return NextResponse.json(
      { ok: true, next: 'login' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
  if (command.action !== 'register' && command.action !== 'login')
    return result('unavailable', 503);
  if (!devEmailAllowed(command.email)) return result('unavailable', 503);
  try {
    if (command.action === 'register') {
      // A local allowlist only. This is not proof of inbox ownership.
      const { error } = await devAdminAuthClient().auth.admin.createUser({
        email: command.email,
        password: command.password,
        email_confirm: true,
      });
      if (error) return result('credentials', 400);
    }
    const client = await userClient();
    const { data: signedIn, error } = await client.auth.signInWithPassword({
      email: command.email,
      password: command.password,
    });
    if (error) return result('credentials', 400);
    let next: 'account' | 'dashboard' = 'account';
    if (devPersonalEnabled() && signedIn.user) {
      const sessionId = sessionIdFromToken(signedIn.session?.access_token);
      if (sessionId) {
        const { data: resumed } = await devAdminAuthClient().rpc('resume_dev_session', {
          p_owner: signedIn.user.id,
          p_session: sessionId,
        });
        if (resumed) next = 'dashboard';
      }
    }
    return NextResponse.json({ ok: true, next }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return result('unavailable', 503);
  }
}
