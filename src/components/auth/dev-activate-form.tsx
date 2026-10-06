'use client';
import { useState } from 'react';

export default function DevActivateForm({ language }: { language: 'id' | 'en' }) {
  const en = language === 'en';
  const [name, setName] = useState('');
  const [health, setHealth] = useState(false);
  const [finance, setFinance] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        setPending(true);
        setError(false);
        try {
          const response = await fetch('/api/account/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, health, finance, understood }),
          });
          if (!response.ok) throw new Error();
          window.location.assign('/dashboard');
        } catch {
          setError(true);
          setPending(false);
        }
      }}
    >
      <h2>{en ? 'Use your account for private records' : 'Gunakan akun untuk catatan pribadi'}</h2>
      <p>
        {en
          ? 'This is a local development version. Your records will be stored in the Supabase development project. Email ownership has not been verified, and this is not a production release.'
          : 'Ini versi pengembangan lokal. Catatanmu akan disimpan di proyek Supabase development. Kepemilikan email belum diverifikasi dan ini belum rilis produksi.'}
      </p>
      <label>
        {en ? 'Display name' : 'Nama tampilan'}
        <input
          name="name"
          autoComplete="name"
          maxLength={60}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={health}
          onChange={(event) => setHealth(event.target.checked)}
          disabled={pending}
          required
        />
        {en
          ? 'I choose to store habit, activity and hydration records in development.'
          : 'Saya memilih menyimpan catatan kebiasaan, aktivitas, dan hidrasi di development.'}
      </label>
      <label>
        <input
          type="checkbox"
          checked={finance}
          onChange={(event) => setFinance(event.target.checked)}
          disabled={pending}
          required
        />
        {en
          ? 'I choose to store personal finance records in development.'
          : 'Saya memilih menyimpan catatan keuangan pribadi di development.'}
      </label>
      <label>
        <input
          type="checkbox"
          checked={understood}
          onChange={(event) => setUnderstood(event.target.checked)}
          disabled={pending}
          required
        />
        {en
          ? 'I understand that email verification, recovery and production safeguards are not finished.'
          : 'Saya paham verifikasi email, pemulihan akun, dan perlindungan produksi belum selesai.'}
      </label>
      {error ? (
        <p role="alert">
          {en
            ? 'Access could not be activated. No records were created; try again.'
            : 'Akses belum dapat diaktifkan. Belum ada catatan dibuat; coba lagi.'}
        </p>
      ) : null}
      <button disabled={pending} type="submit">
        {pending
          ? en
            ? 'Activating…'
            : 'Mengaktifkan…'
          : en
            ? 'Start private records'
            : 'Mulai catatan pribadi'}
      </button>
    </form>
  );
}
