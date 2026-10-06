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
  if (!parsed.success) return fail('Foto tidak ditemukan', 404);
  const { data, error } = await commitClient().rpc('social_avatar_get', {
    p_owner: access.owner,
    p_session: access.sessionId,
    p_target: parsed.data,
  });
  if (error)
    return fail(
      error.code === '42501' ? 'Akses ditolak' : 'Foto gagal dimuat',
      error.code === '42501' ? 403 : 503,
    );
  if (!data) return fail('Foto tidak ditemukan', 404);
  const bytes = Buffer.from((data as { data: string }).data, 'base64');
  return new Response(bytes, {
    headers: {
      'Content-Type': (data as { mime: string }).mime,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
