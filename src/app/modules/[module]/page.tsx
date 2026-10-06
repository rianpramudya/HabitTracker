import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ProductNavigation, { type ProductPage } from '@/components/product-navigation';
import nav from '@/components/dashboard.module.css';
import { userClient } from '@/lib/supabase/server';
import { devEmailAllowed, devPersonalEnabled } from '@/modules/auth/dev-mode';
import { socialDevEnabled } from '@/modules/social/flags';
import type { State } from '@/modules/tracking/domain';

export const dynamic = 'force-dynamic';
const names: Record<string, string> = { workout: 'WorkOut', working: 'Working', education: 'Education', feed: 'Feed' };

export default async function ModuleStatus({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  if (!(module in names)) notFound();
  if (module === 'feed' && socialDevEnabled()) redirect('/feed');
  if (!devPersonalEnabled() && (process.env.AUTH_READY !== 'true' || process.env.CORE_READY !== 'true')) redirect('/account');
  const client = await userClient();
  const { data: identity } = await client.auth.getUser();
  if (!identity.user?.email || !identity.user.email_confirmed_at) redirect('/login');
  if (devPersonalEnabled() && !devEmailAllowed(identity.user.email)) redirect('/login');
  const { data } = await client.rpc('read_core');
  if (!data) redirect('/account');
  const state = data.state as State;
  return <div className={nav.shell}>
    <a className={nav.skip} href="#main">Lewati navigasi</a>
    <ProductNavigation active={module as ProductPage} language={state.preferences.language} name={state.preferences.name} socialAvailable={socialDevEnabled()} />
    <div className={nav.workspace}><main id="main" className={nav.main} tabIndex={-1}>
      <p style={{ color: 'var(--primary)', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Status modul</p>
      <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', margin: '12px 0' }}>{names[module]}</h1>
      <p style={{ maxWidth: '55ch', color: 'var(--sub)', lineHeight: 1.6 }}>{module === 'feed' ? 'Feed belum diaktifkan untuk akun ini. Postingan pribadi tetap privat dan API komunitas tetap tertutup.' : 'Modul ini sedang dikembangkan. Navigasinya sudah tersedia, tetapi pencatatan khusus modul belum siap.'}</p>
      <p style={{ marginTop: 32 }}><Link href="/dashboard" style={{ color: 'var(--primary)', fontWeight: 700 }}>Kembali ke Dashboard →</Link></p>
      <p><Link href="/dashboard?view=history" style={{ color: 'var(--primary)', fontWeight: 700 }}>Lihat riwayat aktivitas umum →</Link></p>
    </main></div>
  </div>;
}
