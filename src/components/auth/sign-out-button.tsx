'use client';
import { useState } from 'react';
export default function SignOutButton({ language }: { language: 'id' | 'en' }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setFailed(false);
          try {
            const response = await fetch('/api/account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'logout' }),
            });
            if (!response.ok) throw new Error();
            window.location.assign('/login');
          } catch {
            setFailed(true);
            setPending(false);
          }
        }}
      >
        {pending
          ? language === 'id'
            ? 'Keluar…'
            : 'Signing out…'
          : language === 'id'
            ? 'Keluar'
            : 'Sign out'}
      </button>
      {failed ? (
        <p role="alert">
          {language === 'id' ? 'Gagal keluar. Coba lagi.' : 'Could not sign out. Try again.'}
        </p>
      ) : null}
    </div>
  );
}
