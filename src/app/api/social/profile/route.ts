import { NextResponse } from 'next/server';
import { fail, sameOrigin } from '@/lib/http';
import { commitClient } from '@/lib/supabase/server';
import { localRequest } from '@/modules/auth/dev-mode';
import { socialIdentity } from '@/modules/social/access';
import { socialDevEnabled } from '@/modules/social/flags';
import { profileRename } from '@/modules/social/profile-contracts';

export async function PATCH(request: Request) {
  if (!socialDevEnabled() || !localRequest(request)) return fail('Feed belum diaktifkan', 404);
  if (!sameOrigin(request)) return fail('Origin tidak diizinkan', 403);
  if (Number(request.headers.get('content-length') ?? 0) > 1000)
    return fail('Input terlalu besar', 413);
  const access = await socialIdentity();
  if (!access) return fail('Akses ditolak', 403);
  let raw: unknown;
  try {
    raw = JSON.parse(await request.text());
  } catch {
    return fail('JSON tidak valid', 400);
  }
  const parsed = profileRename.safeParse(raw);
  if (!parsed.success) return fail('Nama tidak valid', 400);
  const { data, error } = await commitClient().rpc('social_profile_rename', {
    p_owner: access.owner,
    p_session: access.sessionId,
    p_revision: parsed.data.revision,
    p_name: parsed.data.name,
  });
  if (error)
    return fail(
      error.code === '40001' ? 'Profil berubah. Muat ulang.' : 'Profil gagal disimpan',
      error.code === '40001' ? 409 : error.code === '42501' ? 403 : 400,
    );
  return NextResponse.json(
    { name: parsed.data.name, revision: data },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
