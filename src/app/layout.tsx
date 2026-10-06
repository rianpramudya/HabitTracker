import type { Metadata } from 'next';
import '@/styles/globals.css';
import { publicLanguage } from '@/lib/public-preferences';
export const metadata: Metadata = {
  title: 'HabitTracker — Temukan ritmemu',
  description: 'Kebiasaan, aktivitas, dan keuangan dalam satu ritme harian.',
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const language = await publicLanguage();
  return (
    <html lang={language}>
      <body>{children}</body>
    </html>
  );
}
