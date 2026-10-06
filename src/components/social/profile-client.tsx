'use client';
import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import MemberAvatar from './member-avatar';
import MemberShell from './member-shell';
import AvatarEditor from './avatar-editor';
import type { MemberProfile } from '@/modules/social/profile-contracts';
import s from './member-pages.module.css';

export default function ProfileClient({
  initial,
  language,
  theme,
  viewerName,
}: {
  initial: MemberProfile;
  language: 'id' | 'en';
  theme: 'light' | 'dark' | 'system';
  viewerName: string;
}) {
  const en = language === 'en';
  const [profile, setProfile] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [photoSource, setPhotoSource] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  async function rename(event: FormEvent) {
    event.preventDefault();
    if (!profile.mine || pending || profile.revision == null) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/social/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), revision: profile.revision }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? en
              ? 'Profile changed elsewhere. Reload and try again.'
              : 'Profil berubah di tempat lain. Muat ulang dan coba lagi.'
            : en
              ? 'Could not save name.'
              : 'Nama gagal disimpan.',
        );
      const result = await response.json();
      setProfile((current) => ({ ...current, name: result.name, revision: result.revision }));
      setNotice(en ? 'Name saved.' : 'Nama tersimpan.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan');
    } finally {
      setPending(false);
    }
  }
  function choosePhoto(file: File | undefined) {
    if (!file || pending) return;
    setNotice('');
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError(en ? 'Choose a PNG, JPEG, or WebP image.' : 'Pilih gambar PNG, JPEG, atau WebP.');
      return;
    }
    if (file.size < 1 || file.size > 12 * 1024 * 1024) {
      setError(en ? 'Photo must be 12 MB or smaller.' : 'Foto maksimal 12 MB.');
      return;
    }
    setError('');
    setPhotoSource(file);
  }
  async function upload(file: File): Promise<string | null> {
    setPending(true);
    setError('');
    setNotice('');
    try {
      const body = new FormData();
      body.set('photo', file);
      const response = await fetch('/api/social/avatar', { method: 'POST', body });
      if (!response.ok)
        return en
          ? 'Photo was not saved. Check your connection and try again.'
          : 'Foto belum tersimpan. Periksa koneksi lalu coba lagi.';
      const result = await response.json();
      if (typeof result.version !== 'string')
        return en ? 'Photo was not saved. Try again.' : 'Foto belum tersimpan. Coba lagi.';
      setProfile((current) => ({ ...current, avatarVersion: result.version }));
      setNotice(en ? 'Photo saved.' : 'Foto tersimpan.');
      return null;
    } catch {
      return en
        ? 'Photo was not saved. Check your connection and try again.'
        : 'Foto belum tersimpan. Periksa koneksi lalu coba lagi.';
    } finally {
      setPending(false);
    }
  }
  async function removePhoto() {
    if (pending) return;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/social/avatar', { method: 'DELETE' });
      if (!response.ok) throw new Error(en ? 'Could not remove photo.' : 'Foto gagal dihapus.');
      setProfile((current) => ({ ...current, avatarVersion: null }));
      setNotice(en ? 'Photo removed.' : 'Foto dihapus.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menghapus');
    } finally {
      setPending(false);
    }
  }
  return (
    <MemberShell language={language} theme={theme} name={profile.mine ? profile.name : viewerName}>
      <Link href="/feed" className={s.back}>
        ← Feed
      </Link>
      <section className={s.profileHero}>
        <MemberAvatar id={profile.id} name={profile.name} version={profile.avatarVersion} large />
        <div>
          <span className={s.eyebrow}>
            {profile.mine
              ? en
                ? 'Your profile'
                : 'Profilmu'
              : en
                ? 'Community member'
                : 'Anggota komunitas'}
          </span>
          <h1>{profile.name}</h1>
          <p>
            {profile.mine
              ? en
                ? 'Choose what you share. Your private notes remain yours.'
                : 'Kamu menentukan yang dibagikan. Catatan pribadi tetap milikmu.'
              : en
                ? 'Shared notes from this member.'
                : 'Cerita yang dibagikan anggota ini.'}
          </p>
        </div>
      </section>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className={s.notice} role="status">
          {notice}
        </p>
      )}
      {profile.mine && (
        <section className={s.edit} aria-labelledby="edit-heading">
          <h2 id="edit-heading">{en ? 'Edit profile' : 'Ubah profil'}</h2>
          <form onSubmit={rename}>
            <label htmlFor="profile-name">{en ? 'Display name' : 'Nama tampilan'}</label>
            <div>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={1}
                maxLength={60}
                required
              />
              <button disabled={pending || !name.trim() || name.trim() === profile.name}>
                {pending ? '…' : en ? 'Save name' : 'Simpan nama'}
              </button>
            </div>
          </form>
          <div className={s.photoField}>
            <label htmlFor="profile-photo">{en ? 'Profile photo' : 'Foto profil'}</label>
            <p>
              {en
                ? 'PNG, JPEG, or WebP up to 12 MB. Adjust the crop before saving. Visible to other Feed members.'
                : 'PNG, JPEG, atau WebP hingga 12 MB. Atur potongan sebelum menyimpan. Terlihat oleh anggota Feed lain.'}
            </p>
            <input
              ref={photoInput}
              id="profile-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={pending}
              onChange={(event) => {
                choosePhoto(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            {profile.avatarVersion && (
              <button
                type="button"
                className={s.subtleButton}
                disabled={pending}
                onClick={() => void removePhoto()}
              >
                {en ? 'Remove photo' : 'Hapus foto'}
              </button>
            )}
          </div>
        </section>
      )}
      <section className={s.stories}>
        <div className={s.storiesHeading}>
          <h2>
            {profile.mine
              ? en
                ? 'Your latest notes'
                : 'Cerita terbarumu'
              : en
                ? 'Shared notes'
                : 'Cerita yang dibagikan'}
          </h2>
          <Link href="/feed/people">{en ? 'Find people' : 'Cari anggota'} →</Link>
        </div>
        {profile.posts.length === 0 ? (
          <p className={s.empty}>
            {en ? 'No notes to show yet.' : 'Belum ada cerita untuk ditampilkan.'}
          </p>
        ) : (
          <ol>
            {profile.posts.map((post) => (
              <li key={post.id}>
                <small>
                  {new Intl.DateTimeFormat(en ? 'en-US' : 'id-ID', {
                    dateStyle: 'medium',
                    timeZone: 'UTC',
                  }).format(new Date(post.createdAt))}
                  {post.visibility === 'private' ? ` · ${en ? 'Only me' : 'Hanya saya'}` : ''}
                </small>
                <p>{post.body}</p>
                {post.snapshot && <span>{post.snapshot.label}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
      {photoSource && (
        <AvatarEditor
          source={photoSource}
          language={language}
          onSave={upload}
          onClose={() => {
            setPhotoSource(null);
            photoInput.current?.focus();
          }}
        />
      )}
    </MemberShell>
  );
}
