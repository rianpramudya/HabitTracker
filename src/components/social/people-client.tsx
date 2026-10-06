'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import MemberShell from './member-shell';
import MemberAvatar from './member-avatar';
import type { Member } from '@/modules/social/profile-contracts';
import s from './member-pages.module.css';
export default function PeopleClient({
  language,
  theme,
  name,
  owner,
}: {
  language: 'id' | 'en';
  theme: 'light' | 'dark' | 'system';
  name: string;
  owner: string;
}) {
  const en = language === 'en';
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Member[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2 || pending) return;
    setPending(true);
    setError('');
    setSearched(false);
    try {
      const response = await fetch(`/api/social/people?q=${encodeURIComponent(query.trim())}`, {
        cache: 'no-store',
      });
      if (!response.ok)
        throw new Error(en ? 'Search is unavailable. Try again.' : 'Pencarian gagal. Coba lagi.');
      setPeople(await response.json());
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Pencarian gagal');
    } finally {
      setPending(false);
    }
  }
  return (
    <MemberShell language={language} theme={theme} name={name}>
      <Link href="/feed" className={s.back}>
        ← Feed
      </Link>
      <header className={s.header}>
        <span className={s.eyebrow}>{en ? 'Community' : 'Komunitas'}</span>
        <h1>{en ? 'Find people' : 'Cari anggota'}</h1>
        <p>
          {en
            ? 'Find members by display name. Private posts stay private.'
            : 'Cari anggota lewat nama tampilan. Posting pribadi tetap hanya untuk pemiliknya.'}
        </p>
      </header>
      <form className={s.search} onSubmit={search} role="search">
        <label htmlFor="member-query">{en ? 'Member name' : 'Nama anggota'}</label>
        <div>
          <input
            id="member-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            minLength={2}
            maxLength={60}
            autoComplete="off"
            required
            placeholder={en ? 'Type at least 2 letters' : 'Ketik minimal 2 huruf'}
          />
          <button disabled={pending || query.trim().length < 2}>
            {pending ? '…' : en ? 'Search' : 'Cari'}
          </button>
        </div>
      </form>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {pending && <p role="status">{en ? 'Searching…' : 'Mencari anggota…'}</p>}
      {searched && !people.length && (
        <p className={s.empty}>{en ? 'No members found.' : 'Tidak ada anggota yang cocok.'}</p>
      )}
      <ul className={s.people}>
        {people.map((person) => (
          <li key={person.id}>
            <Link href={`/feed/profile/${person.id}`}>
              <MemberAvatar id={person.id} name={person.name} version={person.avatarVersion} />
              <span>
                <strong>{person.name}</strong>
                <small>{en ? 'View profile' : 'Lihat profil'}</small>
              </span>
              <span aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`/feed/profile/${owner}`} className={s.ownLink}>
        {en ? 'Edit my profile' : 'Ubah profil saya'} →
      </Link>
    </MemberShell>
  );
}
