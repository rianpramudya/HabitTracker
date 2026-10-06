import { redirect } from 'next/navigation';
import PeopleClient from '@/components/social/people-client';
import { socialIdentity } from '@/modules/social/access';
import { socialDevEnabled } from '@/modules/social/flags';
export const dynamic = 'force-dynamic';
export default async function PeoplePage() {
  if (!socialDevEnabled()) redirect('/dashboard');
  const access = await socialIdentity();
  if (!access) redirect('/login');
  return (
    <PeopleClient
      owner={access.owner}
      language={access.state.preferences.language}
      theme={access.state.preferences.theme}
      name={access.state.preferences.name}
    />
  );
}
