import { notFound, redirect } from 'next/navigation';
import ProfileClient from '@/components/social/profile-client';
import { commitClient } from '@/lib/supabase/server';
import { socialIdentity } from '@/modules/social/access';
import { socialDevEnabled } from '@/modules/social/flags';
import { memberId, type MemberProfile } from '@/modules/social/profile-contracts';
export const dynamic = 'force-dynamic';
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  if (!socialDevEnabled()) redirect('/dashboard');
  const access = await socialIdentity();
  if (!access) redirect('/login');
  const id = memberId.safeParse((await params).id);
  if (!id.success) notFound();
  const { data, error } = await commitClient().rpc('social_profile', {
    p_owner: access.owner,
    p_session: access.sessionId,
    p_target: id.data,
  });
  if (error?.code === '42501') redirect('/feed');
  if (error) throw new Error('Profil gagal dimuat');
  if (!data) notFound();
  return (
    <ProfileClient
      initial={data as MemberProfile}
      language={access.state.preferences.language}
      theme={access.state.preferences.theme}
      viewerName={access.state.preferences.name}
    />
  );
}
