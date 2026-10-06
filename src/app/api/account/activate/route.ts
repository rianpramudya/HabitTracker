import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sameOrigin } from '@/lib/http';
import { devEmailAllowed, devPersonalEnabled, localRequest } from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
import { publicLanguage } from '@/lib/public-preferences';
import { devAdminAuthClient, userClient } from '@/lib/supabase/server';

const inputSchema = z.strictObject({
  name: z.string().trim().min(1).max(60),
  health: z.literal(true),
  finance: z.literal(true),
  understood: z.literal(true),
});

function failure(status: number) {
  return NextResponse.json(
    { ok: false, code: 'unavailable' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return failure(403);
  if (!localRequest(request) || !devPersonalEnabled()) return failure(503);
  if (Number(request.headers.get('content-length')) > 512) return failure(413);
  let parsed;
  try {
    const body = await request.text();
    if (body.length > 512) return failure(413);
    parsed = inputSchema.safeParse(JSON.parse(body));
  } catch {
    return failure(400);
  }
  if (!parsed.success) return failure(400);
  try {
    const client = await userClient();
    const { data, error } = await client.auth.getUser();
    const email = data.user?.email;
    if (error || !data.user || !email || !devEmailAllowed(email)) return failure(401);
    const { data: session } = await client.auth.getSession();
    const sessionId = sessionIdFromToken(session.session?.access_token);
    if (!sessionId) return failure(401);
    const writer = devAdminAuthClient();
    const { data: activated, error: writeError } = await writer.rpc('activate_dev_account', {
      p_owner: data.user.id,
      p_session: sessionId,
      p_email: email,
      p_name: parsed.data.name,
      p_language: await publicLanguage(),
      p_health: parsed.data.health,
      p_finance: parsed.data.finance,
    });
    if (writeError || !activated) return failure(503);
    return NextResponse.json(
      { ok: true, next: 'dashboard' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return failure(503);
  }
}
