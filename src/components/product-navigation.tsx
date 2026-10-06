'use client';

import Link from 'next/link';
import { BookOpen, BriefcaseBusiness, Dumbbell, LayoutDashboard, Layers, LockKeyhole, LogOut, MoreHorizontal, UsersRound, Wallet } from 'lucide-react';
import { copy } from '@/lib/i18n';
import s from './dashboard.module.css';

export type ProductPage = 'today' | 'history' | 'finance' | 'settings' | 'feed' | 'workout' | 'working' | 'education';

export default function ProductNavigation({
  active,
  language,
  name,
  preview = false,
  socialAvailable = false,
  onNavigate,
}: {
  active: ProductPage;
  language: 'id' | 'en';
  name: string;
  preview?: boolean;
  socialAvailable?: boolean;
  onNavigate?: (page: 'today' | 'history' | 'finance' | 'settings') => void;
}) {
  const t = copy[language];
  const items = [
    { id: 'today' as const, label: 'Dashboard', href: '/dashboard', Icon: LayoutDashboard },
    { id: 'finance' as const, label: 'Financial', href: '/financial', Icon: Wallet },
    { id: 'feed' as const, label: 'Feed', href: socialAvailable ? '/feed' : '/modules/feed', Icon: UsersRound },
    { id: 'workout' as const, label: 'WorkOut', href: '/modules/workout', Icon: Dumbbell },
    { id: 'working' as const, label: 'Working', href: '/modules/working', Icon: BriefcaseBusiness },
    { id: 'education' as const, label: 'Education', href: '/modules/education', Icon: BookOpen },
  ];
  const label = language === 'id' ? 'Navigasi utama' : 'Main navigation';
  const item = (
    id: (typeof items)[number]['id'],
    text: string,
    Icon: typeof LayoutDashboard,
    mobile: boolean,
    href: string,
  ) => {
    const selected = active === id || (id === 'today' && (active === 'history' || active === 'settings'));
    const className = selected ? (mobile ? s.mobileActive : s.navActive) : '';
    const content = (
      <>
        <Icon size={mobile ? 21 : 20} aria-hidden />
        <span>{text}</span>
        {!mobile && selected ? <span className={s.navDot} /> : null}
      </>
    );
    return preview && onNavigate && (id === 'today' || id === 'finance') ? (
      <button
        key={id}
        type="button"
        onClick={() => onNavigate(id)}
        className={className}
        aria-current={selected ? 'page' : undefined}
        aria-label={text}
        title={text}
      >
        {content}
      </button>
    ) : (
      <Link
        key={id}
        href={href}
        className={className}
        aria-current={selected ? 'page' : undefined}
        aria-label={text}
        title={text}
      >
        {content}
      </Link>
    );
  };
  return (
    <>
      <aside className={s.sidebar} aria-label={t.profile}>
        <Link className={s.brand} href="/">
          <span className={s.brandIcon}>
            <Layers size={22} aria-hidden />
          </span>
          <span>
            HabitTracker<span className={s.brandSub}>Find your daily rhythm</span>
          </span>
        </Link>
        <nav aria-label={label} className={s.nav}>
          {items.map(({ id, label: text, Icon, href }) => item(id, text, Icon, false, href))}
        </nav>
        <div className={s.sidebarBottom}>
          <div className={s.privacyNote}>
            <LockKeyhole size={16} aria-hidden />
            <span>
              {language === 'id' ? 'Harimu, ruang privatmu.' : 'Your day, your private space.'}
            </span>
          </div>
          {onNavigate ? (
            <button className={s.profile} onClick={() => onNavigate('settings')}>
              <span className={s.avatar}>{name.slice(0, 1)}</span>
              <span>
                <strong>{name}</strong>
                <small>{preview ? 'Preview workspace' : t.profile}</small>
              </span>
              <MoreHorizontal size={18} aria-hidden />
            </button>
          ) : (
            <Link className={s.profile} href="/dashboard?view=settings">
              <span className={s.avatar}>{name.slice(0, 1)}</span>
              <span>
                <strong>{name}</strong>
                <small>{t.profile}</small>
              </span>
              <MoreHorizontal size={18} aria-hidden />
            </Link>
          )}
          <Link href="/" className={s.leave}>
            <LogOut size={15} aria-hidden />
            {language === 'id' ? 'Kembali ke beranda' : 'Back to home'}
          </Link>
        </div>
      </aside>
      <nav
        className={s.mobileNav}
        aria-label={language === 'id' ? 'Navigasi mobile' : 'Mobile navigation'}
      >
        {items.map(({ id, label: text, Icon, href }) => item(id, text, Icon, true, href))}
      </nav>
    </>
  );
}
