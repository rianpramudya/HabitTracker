import { NextResponse } from 'next/server';
import { fail, sameOrigin } from '@/lib/http';
import { commitClient, userClient } from '@/lib/supabase/server';
import { devEmailAllowed, localRequest } from '@/modules/auth/dev-mode';
import { sessionIdFromToken } from '@/modules/auth/session-id';
import { socialAction, socialCursor } from '@/modules/social/contracts';
import { socialDevEnabled } from '@/modules/social/flags';

export const dynamic = 'force-dynamic';

async function identity() {
  const reader = await userClient();
  const { data: userResult, error } = await reader.auth.getUser();
  const user = userResult.user;
  if (error || !user || !user.email || !devEmailAllowed(user.email)) return null;
  const { data: snapshot } = await reader.rpc('read_core');
  if (!snapshot) return null;
  const { data: session } = await reader.auth.getSession();
  const sessionId = sessionIdFromToken(session.session?.access_token);
  return sessionId ? { owner: user.id, sessionId } : null;
}

function response(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  if (!socialDevEnabled() || !localRequest(request)) return fail('Feed belum diaktifkan', 404);
  const access = await identity();
  if (!access) return fail('Akses ditolak', 403);
  const params = new URL(request.url).searchParams;
  let at: string | null = null;
  let id: string | null = null;
  if (params.has('at') || params.has('id')) {
    const parsed = socialCursor.safeParse({ at: params.get('at'), id: params.get('id') });
    if (!parsed.success) return fail('Cursor tidak valid', 400);
    at = parsed.data.at;
    id = parsed.data.id;
  }
  const { data, error } = await commitClient().rpc('social_feed', {
    p_owner: access.owner,
    p_session: access.sessionId,
    p_at: at,
    p_id: id,
    p_limit: 20,
  });
  if (error)
    return fail(
      error.code === '42501' ? 'Belum bergabung dengan feed' : 'Feed gagal dimuat',
      error.code === '42501' ? 403 : 503,
    );
  return response(data);
}

export async function POST(request: Request) {
  if (!socialDevEnabled() || !localRequest(request)) return fail('Feed belum diaktifkan', 404);
  if (!sameOrigin(request)) return fail('Origin tidak diizinkan', 403);
  if (Number(request.headers.get('content-length') ?? 0) > 5000)
    return fail('Input terlalu besar', 413);
  const access = await identity();
  if (!access) return fail('Akses ditolak', 403);
  let raw: unknown;
  try {
    const body = await request.text();
    if (body.length > 5000) return fail('Input terlalu besar', 413);
    raw = JSON.parse(body);
  } catch {
    return fail('JSON tidak valid', 400);
  }
  const parsed = socialAction.safeParse(raw);
  if (!parsed.success) return fail('Input tidak valid', 400);
  const command = parsed.data;
  const args = { p_owner: access.owner, p_session: access.sessionId };
  const writer = commitClient();
  let result;
  switch (command.action) {
    case 'join':
      result = await writer.rpc('social_join', args);
      break;
    case 'create':
      result = await writer.rpc('social_create', {
        ...args,
        p_id: command.id,
        p_body: command.body,
        p_visibility: command.visibility,
        p_entry_id: command.entryId,
      });
      break;
    case 'edit':
      result = await writer.rpc('social_edit', {
        ...args,
        p_id: command.id,
        p_version: command.version,
        p_body: command.body,
        p_visibility: command.visibility,
      });
      break;
    case 'delete':
      result = await writer.rpc('social_remove', {
        ...args,
        p_id: command.id,
        p_version: command.version,
      });
      break;
    case 'block':
    case 'unblock':
      result = await writer.rpc('social_block', {
        ...args,
        p_target: command.ownerId,
        p_block: command.action === 'block',
      });
      break;
    case 'report':
      result = await writer.rpc('social_report', {
        ...args,
        p_post: command.id,
        p_reason: command.reason,
      });
      break;
  }
  if (result.error) {
    const status =
      result.error.code === '40001'
        ? 409
        : result.error.code === '42501'
          ? 403
          : result.error.code === '23505'
            ? 409
            : 400;
    return fail(
      status === 409 ? 'Posting berubah. Muat ulang feed.' : 'Tindakan tidak dapat disimpan',
      status,
    );
  }
  return response({ ok: true, result: result.data });
}
