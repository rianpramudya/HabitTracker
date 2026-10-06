'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Layers } from 'lucide-react';
import { authCopy } from '@/modules/auth/copy';
import {
  authRequest,
  authDestination,
  type AuthScreen,
  type AuthFailure,
  type AuthResult,
} from '@/modules/auth/contracts';
import s from './account-form.module.css';

export default function AccountForm({
  screen: initialScreen,
  language: initialLanguage,
  development,
}: {
  screen: AuthScreen;
  language: 'id' | 'en';
  development: boolean;
}) {
  const screen = initialScreen;
  const [language, setLanguage] = useState(initialLanguage);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [adult, setAdult] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthFailure | 'mismatch' | null>(null);
  const busy = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const t = authCopy[language];
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function changeLanguage(value: 'id' | 'en') {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: value }),
      });
      if (!response.ok) throw new Error();
      setLanguage(value);
    } catch {
      setError('network');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function submit() {
    if (busy.current) return;
    setError(null);
    const payload =
      screen === 'login'
        ? { action: screen, email: email.trim(), password }
        : { action: screen, email: email.trim(), password, adult };
    if (screen === 'register' && password !== confirm) {
      setError('mismatch');
      return;
    }
    if (!authRequest.safeParse(payload).success) {
      setError('invalid');
      return;
    }
    busy.current = true;
    setPending(true);
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result: AuthResult = await response.json();
      if (!response.ok || !result.ok) {
        setError(
          !result.ok &&
            ['unavailable', 'invalid', 'rate_limited', 'credentials'].includes(result.code)
            ? result.code
            : 'unavailable',
        );
        return;
      }
      window.location.assign(authDestination(result.next));
    } catch {
      setError('network');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <main className={s.page}>
      <header className={s.header}>
        <Link href="/" className={s.brand}>
          <Layers aria-hidden size={24} />
          HabitTracker
        </Link>
        <label className={s.language}>
          {t.language}
          <select
            aria-label={t.language}
            value={language}
            disabled={pending}
            onChange={(e) => void changeLanguage(e.target.value as 'id' | 'en')}
          >
            <option value="id">Indonesia</option>
            <option value="en">English</option>
          </select>
        </label>
      </header>
      <div className={s.layout}>
        <aside className={s.intro}>
          <span className={s.rhythm} aria-hidden>
            ● ─ ○ ─ ○ ─ ○
          </span>
          <h2>{t.intro}</h2>
          <p>{t.description}</p>
          <Link href="/preview">{t.preview}</Link>
        </aside>
        <section className={s.panel} aria-labelledby="account-title">
          <h1 id="account-title">{t[screen]}</h1>
          <p className={s.help}>{t[`${screen}Help`]}</p>
          {screen === 'register' ? (
            <ol className={s.steps} aria-label={t.register}>
              {t.registrationSteps.map((step, index) => (
                <li key={step} aria-current={index === 0 ? 'step' : undefined}>
                  <span aria-hidden="true">{index + 1}</span>
                  <span>{step}</span>
                  {index === 0 ? (
                    <span className={s.visuallyHidden}> — {t.currentStep}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
          <p className={s.notice}>{development ? t.devNotice : t.notice}</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
            aria-busy={pending}
          >
            <label>
              {t.email}
              <input
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={pending}
              />
            </label>
            <label>
              {t.password}
              <span className={s.password}>
                <input
                  name="password"
                  type={visible ? 'text' : 'password'}
                  autoComplete={screen === 'register' ? 'new-password' : 'current-password'}
                  minLength={screen === 'register' ? 15 : undefined}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={pending}
                />
                <button
                  type="button"
                  aria-label={visible ? t.hide : t.show}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            {screen === 'register' ? (
              <>
                <p className={s.passwordHelp}>{t.passwordHelp}</p>
                <label>
                  {t.confirm}
                  <input
                    name="confirm-password"
                    type={visible ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={15}
                    maxLength={128}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={pending}
                  />
                </label>
              </>
            ) : null}
            {screen === 'register' ? (
              <label className={s.checkbox}>
                <input
                  name="adult"
                  type="checkbox"
                  checked={adult}
                  onChange={(e) => setAdult(e.target.checked)}
                  required
                  disabled={pending}
                />
                <span>{t.adult}</span>
              </label>
            ) : null}
            {error ? (
              <p ref={errorRef} role="alert" tabIndex={-1} className={s.error}>
                {t[error]}
              </p>
            ) : null}
            <button className={s.primary} disabled={pending}>
              {pending ? t.pending : screen === 'login' ? t.login : t.create}
            </button>
            {pending ? <p role="status">{t.pending}</p> : null}
          </form>
          <nav
            className={s.links}
            aria-label={language === 'id' ? 'Navigasi akun' : 'Account navigation'}
          >
            {screen === 'login' ? (
              <p>
                {t.newAccount} <Link href="/auth/register">{t.register}</Link>
              </p>
            ) : (
              <Link href="/login">
                <ArrowLeft size={16} aria-hidden />
                {t.back}
              </Link>
            )}
          </nav>
        </section>
      </div>
    </main>
  );
}
