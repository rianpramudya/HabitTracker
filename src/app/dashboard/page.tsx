import { redirect } from 'next/navigation';
import Dashboard from '@/components/dashboard';
import { devEmailAllowed, devPersonalEnabled } from '@/modules/auth/dev-mode';
import { userClient } from '@/lib/supabase/server';
import type { State } from '@/modules/tracking/domain';
import { socialDevEnabled } from '@/modules/social/flags';

export const dynamic = 'force-dynamic';

export default async function ProductDashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (!devPersonalEnabled()) redirect('/account');
  const client = await userClient();
  const { data: identity, error: authError } = await client.auth.getUser();
  const email = identity.user?.email;
  if (authError || !email || !devEmailAllowed(email)) redirect('/login');
  const { data, error } = await client.rpc('read_core');
  if (error || !data) redirect('/account');
  const { view } = await searchParams;
  const initialPage =
    view === 'history' || view === 'finance' || view === 'settings' ? view : 'today';
  return (
    <Dashboard
      initial={data.state as State}
      socialAvailable={socialDevEnabled()}
      initialPage={initialPage}
    />
  );
}
