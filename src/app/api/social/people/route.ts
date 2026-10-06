import { NextResponse } from 'next/server';
import { fail } from '@/lib/http';
import { commitClient } from '@/lib/supabase/server';
import { localRequest } from '@/modules/auth/dev-mode';
import { socialIdentity } from '@/modules/social/access';
import { socialDevEnabled } from '@/modules/social/flags';
import { peopleQuery } from '@/modules/social/profile-contracts';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!socialDevEnabled() || !localRequest(request)) return fail('Feed belum diaktifkan', 404);
  const access = await socialIdentity();
  if (!access) return fail('Akses ditolak', 403);
  const query = peopleQuery.safeParse(new URL(request.url).searchParams.get('q'));
  if (!query.success) return fail('Ketik setidaknya 2 karakter', 400);
  const { data, error } = await commitClient().rpc('social_people', {
    p_owner: access.owner,
    p_session: access.sessionId,
    p_query: query.data,
  });
  if (error)
    return fail(
      error.code === '42501' ? 'Akses feed ditolak' : 'Pencarian gagal',
      error.code === '42501' ? 403 : 503,
    );
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
