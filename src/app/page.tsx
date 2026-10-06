import Link from 'next/link';
import { ArrowUpRight, Check, Layers, Droplets, Wallet, CalendarDays } from 'lucide-react';
import { publicLanguage } from '@/lib/public-preferences';
import s from './landing.module.css';
const landing = {
  id: {
    signIn: 'Masuk',
    pill: 'Ruang untuk kebiasaan baik',
    headline: ['Temukan ritmemu.', 'Mulai dari hari ini.'],
    description:
      'Kebiasaan kecil, aktivitas sehari-hari, dan keuangan pribadi. Catat dengan ringan, lihat harimu dengan lebih jelas.',
    start: 'Mulai mencatat',
    preview: 'Jelajahi pratinjau',
    previewHelp: 'Pratinjau menggunakan data sintetis. Tidak memerlukan akun.',
    sample: 'Satu hari, langkah kecil',
    rhythm: 'Ritme yang kamu tentukan.',
    study: 'Waktu untuk belajar',
    studyNote: '30 menit untuk hal baru',
    water: 'Minum air',
    waterNote: 'Sesuai target pilihanmu',
    finance: 'Keuangan lebih tertata',
    financeNote: 'Catatanmu tetap privat',
    steps: 'Setiap langkah punya tempat.',
    devices: 'Dirancang untuk desktop dan mobile.',
    private: 'Data privat. Berbagi selalu pilihanmu.',
    weekdays: ['S', 'S', 'R', 'K', 'J', 'S', 'M'],
  },
  en: {
    signIn: 'Sign in',
    pill: 'Room for better habits',
    headline: ['Find your rhythm.', 'Start today.'],
    description:
      'Habits, daily activities, and personal finances. Keep a light record and see your day more clearly.',
    start: 'Start recording',
    preview: 'Explore preview',
    previewHelp: 'The preview uses synthetic data. No account required.',
    sample: 'One day, a small step',
    rhythm: 'A rhythm you choose.',
    study: 'Time to study',
    studyNote: '30 minutes for something new',
    water: 'Drink water',
    waterNote: 'Your own daily target',
    finance: 'Clearer finances',
    financeNote: 'Your records stay private',
    steps: 'Every step has a place.',
    devices: 'Made for desktop and mobile.',
    private: 'Private by default. Sharing is your choice.',
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },
} as const;
export default async function Landing() {
  const language = await publicLanguage();
  const t = landing[language];
  return (
    <div className={s.page}>
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          <Layers size={26} aria-hidden="true" /> HabitTracker
        </Link>
        <Link href="/login" className={s.secondary}>
          {t.signIn} <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <main className={s.hero}>
        <div>
          <div className={s.pill}>
            <span aria-hidden="true" /> {t.pill}
          </div>
          <h1>
            {t.headline[0]}
            <br />
            {t.headline[1]}
          </h1>
          <p>{t.description}</p>
          <div className={s.actions}>
            <Link className={s.primary} href="/login">
              {t.start} <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link className={s.secondary} href="/preview">
              {t.preview}
            </Link>
          </div>
          <small>{t.previewHelp}</small>
        </div>
        <div className={s.sample}>
          <div className={s.sampleHead}>
            <CalendarDays size={20} aria-hidden="true" /> {t.sample}
          </div>
          <h2>{t.rhythm}</h2>
          <div className={s.days}>
            {t.weekdays.map((d, i) => (
              <div key={i} className={i === 2 ? s.selected : ''} aria-hidden="true">
                <small>{d}</small>
                <b>{i + 5}</b>
                <span />
              </div>
            ))}
          </div>
          <div className={s.row}>
            <div className={s.icon}>
              <Check aria-hidden="true" />
            </div>
            <div>
              <strong>{t.study}</strong>
              <p>{t.studyNote}</p>
            </div>
            <Check size={18} aria-hidden="true" />
          </div>
          <div className={s.row}>
            <div className={s.water}>
              <Droplets aria-hidden="true" />
            </div>
            <div>
              <strong>{t.water}</strong>
              <p>{t.waterNote}</p>
            </div>
          </div>
          <div className={s.row}>
            <div className={s.finance}>
              <Wallet aria-hidden="true" />
            </div>
            <div>
              <strong>{t.finance}</strong>
              <p>{t.financeNote}</p>
            </div>
          </div>
          <div className={s.progress} aria-hidden="true">
            <span />
          </div>
          <small>{t.steps}</small>
        </div>
      </main>
      <footer className={s.footer}>
        <span>{t.devices}</span>
        <span>{t.private}</span>
      </footer>
    </div>
  );
}
