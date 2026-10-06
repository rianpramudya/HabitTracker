import { NextResponse } from 'next/server';
import { fail } from '@/lib/http';
import { commitClient } from '@/lib/supabase/server';
import { localRequest } from '@/modules/auth/dev-mode';
import { socialIdentity } from '@/modules/social/access';
import { socialDevEnabled } from '@/modules/social/flags';
import { memberId } from '@/modules/social/profile-contracts';

export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!socialDevEnabled() || !localRequest(request)) return fail('Feed belum diaktifkan', 404);
  const access = await socialIdentity();
  if (!access) return fail('Akses ditolak', 403);
  const parsed = memberId.safeParse((await context.params).id);
  if (!parsed.success) return fail('Profil tidak ditemukan', 404);
  const { data, error } = await commitClient().rpc('social_profile', {
    p_owner: access.owner,
    p_session: access.sessionId,
    p_target: parsed.data,
  });
  if (error)
    return fail(
      error.code === '42501' ? 'Akses feed ditolak' : 'Profil gagal dimuat',
      error.code === '42501' ? 403 : 503,
    );
  if (!data) return fail('Profil tidak ditemukan', 404);
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
