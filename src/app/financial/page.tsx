import { redirect } from 'next/navigation';
import FinancialClient from '@/components/financial/financial-client';
import { devEmailAllowed, devPersonalEnabled } from '@/modules/auth/dev-mode';
import { userClient } from '@/lib/supabase/server';
import { localDate, type State } from '@/modules/tracking/domain';
import type { FinancialSnapshot } from '@/modules/finance/contracts';
import { socialDevEnabled } from '@/modules/social/flags';

export const dynamic = 'force-dynamic';

export default async function FinancialPage() {
  if (!devPersonalEnabled() && (process.env.AUTH_READY !== 'true' || process.env.CORE_READY !== 'true')) redirect('/account');
  const client = await userClient();
  const { data: identity } = await client.auth.getUser();
  if (!identity.user?.email || !identity.user.email_confirmed_at) redirect('/login');
  if (devPersonalEnabled() && !devEmailAllowed(identity.user.email)) redirect('/login');
  const [core, financial] = await Promise.all([client.rpc('read_core'), client.rpc('financial_read')]);
  if (core.error || !core.data) redirect('/account');
  if (financial.error || !financial.data) throw new Error('Financial belum tersedia. Periksa migrasi database development.');
  const state = core.data.state as State;
  const today = localDate(new Date(), state.preferences.timezone);
  return <FinancialClient initial={state} initialFinancial={financial.data as FinancialSnapshot} today={today} socialAvailable={socialDevEnabled()} />;
}
