import Link from 'next/link';
import { redirect } from 'next/navigation';
import { devAccountEnabled, devEmailAllowed, devPersonalEnabled } from '@/modules/auth/dev-mode';
import { userClient } from '@/lib/supabase/server';
import { publicLanguage } from '@/lib/public-preferences';
import SignOutButton from '@/components/auth/sign-out-button';
import DevActivateForm from '@/components/auth/dev-activate-form';
import { socialDevEnabled } from '@/modules/social/flags';
import s from './page.module.css';

export default async function AccountPage() {
  if (!devAccountEnabled()) redirect('/login');
  const client = await userClient();
  const { data, error } = await client.auth.getUser();
  const email = data.user?.email;
  if (error || !email || !devEmailAllowed(email)) redirect('/login');
  if (devPersonalEnabled()) {
    const { data: core } = await client.rpc('read_core');
    if (core) redirect('/dashboard');
  }
  const en = (await publicLanguage()) === 'en';
  return (
    <main className={s.page}>
      <Link className={s.brand} href="/">
        HabitTracker
      </Link>
      <section className={s.content} aria-labelledby="account-heading">
        <span className={s.kicker}>{en ? 'Local development' : 'Pengembangan lokal'}</span>
        <h1 id="account-heading">{en ? 'Your account is ready' : 'Akunmu sudah dibuat'}</h1>
        <p>
          {en
            ? 'You can sign in with this email and password on this local development server.'
            : 'Kamu dapat masuk dengan email dan password ini di server pengembangan lokal.'}
        </p>
        <div className={s.identity}>
          <span>Email</span>
          <strong>{email}</strong>
        </div>
        <p className={s.limit}>
          {devPersonalEnabled()
            ? en
              ? `Email ownership has not been verified. You may opt in to local habit and finance records below; ${socialDevEnabled() ? 'the development feed is available after activation, while payments remain closed.' : 'feed and payments remain closed.'}`
              : `Kepemilikan email belum diverifikasi. Kamu dapat memilih mengaktifkan catatan habit dan keuangan lokal di bawah; ${socialDevEnabled() ? 'feed development tersedia setelah aktivasi, sedangkan pembayaran tetap tertutup.' : 'feed dan pembayaran tetap tertutup.'}`
            : en
              ? 'Email ownership has not been verified. Habit, finance, feed, and payment access remain closed.'
              : 'Kepemilikan email belum diverifikasi. Akses habit, keuangan, feed, dan pembayaran tetap tertutup.'}
        </p>
        <div className={s.actions}>
          <SignOutButton language={en ? 'en' : 'id'} />
          <Link href="/preview">{en ? 'Explore preview' : 'Jelajahi pratinjau'}</Link>
        </div>
        {devPersonalEnabled() ? <DevActivateForm language={en ? 'en' : 'id'} /> : null}
      </section>
    </main>
  );
}
