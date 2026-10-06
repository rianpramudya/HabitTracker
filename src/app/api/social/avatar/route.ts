import { NextResponse } from 'next/server';
import { fail, sameOrigin } from '@/lib/http';
import { commitClient } from '@/lib/supabase/server';
import { localRequest } from '@/modules/auth/dev-mode';
import { socialIdentity } from '@/modules/social/access';
import { socialDevEnabled } from '@/modules/social/flags';

const MAX_IMAGE = 524288;
function validImage(bytes: Buffer, mime: string) {
  if (mime === 'image/png')
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/webp')
    return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return false;
}
function permitted(request: Request) {
  return socialDevEnabled() && localRequest(request) && sameOrigin(request);
}
export async function POST(request: Request) {
  if (!permitted(request)) return fail('Akses ditolak', 403);
  const size = Number(request.headers.get('content-length'));
  if (!Number.isInteger(size) || size <= 0 || size > 800000) return fail('Foto terlalu besar', 413);
  const access = await socialIdentity();
  if (!access) return fail('Akses ditolak', 403);
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('photo');
  } catch {
    return fail('Foto tidak valid', 400);
  }
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_IMAGE)
    return fail('Foto maksimal 512 KB', 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!validImage(bytes, file.type)) return fail('Gunakan foto PNG, JPEG, atau WebP', 400);
  const { data, error } = await commitClient().rpc('social_avatar_put', {
    p_owner: access.owner,
    p_session: access.sessionId,
    p_mime: file.type,
    p_data: bytes.toString('base64'),
  });
  if (error)
    return fail(
      error.code === '42501' ? 'Akses ditolak' : 'Foto gagal disimpan',
      error.code === '42501' ? 403 : 503,
    );
  return NextResponse.json({ version: data }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function DELETE(request: Request) {
  if (!permitted(request)) return fail('Akses ditolak', 403);
  const access = await socialIdentity();
  if (!access) return fail('Akses ditolak', 403);
  const { error } = await commitClient().rpc('social_avatar_remove', {
    p_owner: access.owner,
    p_session: access.sessionId,
  });
  if (error)
    return fail(
      error.code === '42501' ? 'Akses ditolak' : 'Foto gagal dihapus',
      error.code === '42501' ? 403 : 503,
    );
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
