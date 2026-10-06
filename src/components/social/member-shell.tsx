'use client';
import { useEffect } from 'react';
import ProductNavigation from '@/components/product-navigation';
import nav from '@/components/dashboard.module.css';
import s from './member-pages.module.css';
export default function MemberShell({
  language,
  theme,
  name,
  children,
}: {
  language: 'id' | 'en';
  theme: 'light' | 'dark' | 'system';
  name: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  }, [theme, language]);
  return (
    <div className={nav.shell}>
      <a className={nav.skip} href="#member-main">
        {language === 'id' ? 'Lewati navigasi' : 'Skip navigation'}
      </a>
      <ProductNavigation active="feed" language={language} name={name} socialAvailable />
      <div className={nav.workspace}>
        <main id="member-main" className={`${nav.main} ${s.main}`} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
