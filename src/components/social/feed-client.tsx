'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag, UsersRound } from 'lucide-react';
import MemberAvatar from './member-avatar';
import type { SocialPost } from '@/modules/social/contracts';
import ProductNavigation from '@/components/product-navigation';
import navStyles from '@/components/dashboard.module.css';
import s from './feed-client.module.css';

type EntryOption = { id: string; label: string; module: string };
type PageData = { posts: SocialPost[]; hasMore: boolean };

export default function FeedClient({
  owner,
  language,
  name,
  theme,
  entries,
  initial,
}: {
  owner: string;
  language: 'id' | 'en';
  name: string;
  theme: 'light' | 'dark' | 'system';
  entries: EntryOption[];
  initial: PageData | null;
}) {
  const en = language === 'en';
  const [posts, setPosts] = useState<SocialPost[]>(initial?.posts ?? []);
  const [hasMore, setHasMore] = useState(initial?.hasMore ?? false);
  const [joined, setJoined] = useState(initial !== null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'community'>('private');
  const [entryId, setEntryId] = useState('');
  const [review, setReview] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = language;
  }, [theme, language]);

  const load = useCallback(
    async (append = false, cursor?: SocialPost) => {
      setLoading(true);
      setError('');
      try {
        const query = cursor ? `?at=${encodeURIComponent(cursor.createdAt)}&id=${cursor.id}` : '';
        const response = await fetch(`/api/social${query}`, { cache: 'no-store' });
        if (response.status === 403)
          throw new Error(
            en
              ? 'Feed access could not be verified. Reload the page or sign in again.'
              : 'Akses feed belum dapat diperiksa. Muat ulang halaman atau masuk kembali.',
          );
        if (!response.ok) throw new Error();
        const result = (await response.json()) as PageData;
        setJoined(true);
        setPosts((current) => (append ? [...current, ...result.posts] : result.posts));
        setHasMore(result.hasMore);
      } catch (cause) {
        setError(
          cause instanceof Error && cause.message
            ? cause.message
            : en
              ? 'Could not load the feed. Try again.'
              : 'Feed gagal dimuat. Coba lagi.',
        );
      } finally {
        setLoading(false);
      }
    },
    [en],
  );

  async function send(command: Record<string, unknown>) {
    if (pending) return false;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (!response.ok) {
        if (response.status === 409)
          throw new Error(
            en
              ? 'This post changed. Reload and try again.'
              : 'Posting berubah. Muat ulang lalu coba lagi.',
          );
        throw new Error(en ? 'Could not save this action.' : 'Tindakan belum dapat disimpan.');
      }
      setNotice(en ? 'Saved.' : 'Tersimpan.');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan');
      return false;
    } finally {
      setPending(false);
    }
  }

  async function publish() {
    const command = editing
      ? {
          action: 'edit',
          id: editing,
          version: posts.find((post) => post.id === editing)?.version,
          body,
          visibility,
        }
      : { action: 'create', id: crypto.randomUUID(), body, visibility, entryId: entryId || null };
    if (await send(command)) {
      setBody('');
      setEntryId('');
      setVisibility('private');
      setReview(false);
      setEditing(null);
      await load();
    }
  }

  return (
    <div className={navStyles.shell}>
      <a className={navStyles.skip} href="#feed-main">
        {en ? 'Skip navigation' : 'Lewati navigasi'}
      </a>
      <ProductNavigation active="feed" language={language} name={name} socialAvailable />
      <div className={navStyles.workspace}>
        <main id="feed-main" className={`${navStyles.main} ${s.main}`} tabIndex={-1}>
          <div className={s.intro}>
            <span className={s.eyebrow}>
              {en ? 'Your space, shared by choice' : 'Ruangmu, berbagi atas pilihanmu'}
            </span>
            <h1>Feed</h1>
            <p>
              {en
                ? 'Small notes from the days that matter. Nothing from your private records is posted automatically.'
                : 'Cerita kecil dari hari yang berarti. Catatan pribadimu tidak pernah terbit otomatis.'}
            </p>
            {joined ? <nav className={s.memberLinks} aria-label={en ? 'Feed pages' : 'Halaman Feed'}>
              <Link href="/feed/people">{en ? 'Find people' : 'Cari anggota'} ↗</Link>
              <Link href={`/feed/profile/${owner}`}>{en ? 'My profile' : 'Profil saya'} ↗</Link>
            </nav> : null}
          </div>
          {error ? (
            <p className={s.error} role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className={s.notice} role="status">
              {notice}
            </p>
          ) : null}
          {joined === false ? (
            <section className={s.join} aria-labelledby="join-title">
              <UsersRound size={28} aria-hidden />
              <h2 id="join-title">
                {en ? 'Join this development feed' : 'Bergabung ke feed development'}
              </h2>
              <p>
                {en
                  ? 'Only members with access can see community posts. Your posts start private; sharing with the community requires a separate choice each time.'
                  : 'Hanya anggota berakses yang melihat posting komunitas. Posting baru selalu privat; berbagi ke komunitas harus dipilih setiap kali.'}
              </p>
              <button
                disabled={pending}
                onClick={async () => {
                if (await send({ action: 'join', consent: 'social-dev-v1' })) {
                  setJoined(true);
                  await load();
                }
                }}
              >
                {pending ? '…' : en ? 'Join feed' : 'Gabung ke feed'}
              </button>
            </section>
          ) : null}
          {joined ? (
            <div className={s.columns}>
              <section className={s.composer} aria-labelledby="compose-title">
                <h2 id="compose-title">
                  {editing
                    ? en
                      ? 'Edit note'
                      : 'Ubah catatan'
                    : en
                      ? 'Write a note'
                      : 'Tulis cerita kecil'}
                </h2>
                <p>
                  {en
                    ? 'A thought, a milestone, or just a sentence about today.'
                    : 'Sebuah pikiran, pencapaian, atau satu kalimat tentang hari ini.'}
                </p>
                <label htmlFor="social-body">{en ? 'Your note' : 'Ceritamu'}</label>
                <textarea
                  id="social-body"
                  maxLength={2000}
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                    setReview(false);
                  }}
                  rows={5}
                  disabled={pending}
                />
                <small>{body.trim().length}/2000</small>
                {!editing ? (
                  <>
                    <label htmlFor="social-entry">
                      {en ? 'Optional activity card' : 'Kartu aktivitas opsional'}
                    </label>
                    <select
                      id="social-entry"
                      value={entryId}
                      onChange={(event) => setEntryId(event.target.value)}
                      disabled={pending}
                    >
                      <option value="">{en ? 'No card' : 'Tanpa kartu'}</option>
                      {entries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
                <fieldset>
                  <legend>{en ? 'Who can read this?' : 'Siapa yang dapat membaca?'}</legend>
                  <label>
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === 'private'}
                      onChange={() => setVisibility('private')}
                      disabled={pending}
                    />
                    {en ? 'Only me' : 'Hanya saya'}
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === 'community'}
                      onChange={() => setVisibility('community')}
                      disabled={pending}
                    />
                    {en ? 'Community members' : 'Anggota komunitas'}
                  </label>
                </fieldset>
                {visibility === 'community' ? (
                  <p className={s.hint}>
                    {en
                      ? 'Community members can read the text you choose to publish. Avoid personal health or money details in free text.'
                      : 'Anggota komunitas dapat membaca teks yang kamu terbitkan. Hindari detail kesehatan atau keuangan pribadi dalam teks bebas.'}
                  </p>
                ) : null}
                {review ? (
                  <div className={s.review}>
                    <strong>{en ? 'Review before publishing' : 'Tinjau sebelum terbit'}</strong>
                    <p>{body.trim()}</p>
                    <small>
                      {visibility === 'private'
                        ? en
                          ? 'Only me'
                          : 'Hanya saya'
                        : en
                          ? 'Community members'
                          : 'Anggota komunitas'}
                    </small>
                    <button disabled={pending} onClick={() => void publish()}>
                      {pending
                        ? en
                          ? 'Saving…'
                          : 'Menyimpan…'
                        : editing
                          ? en
                            ? 'Save changes'
                            : 'Simpan perubahan'
                          : en
                            ? 'Publish'
                            : 'Terbitkan'}
                    </button>
                  </div>
                ) : (
                  <button disabled={!body.trim() || pending} onClick={() => setReview(true)}>
                    {en ? 'Review note' : 'Tinjau catatan'}
                  </button>
                )}
                {editing ? (
                  <button
                    className={s.textButton}
                    onClick={() => {
                      setEditing(null);
                      setBody('');
                      setReview(false);
                      setVisibility('private');
                    }}
                  >
                    {en ? 'Cancel edit' : 'Batal mengubah'}
                  </button>
                ) : null}
              </section>
              <section className={s.stream} aria-labelledby="stream-title">
                <div className={s.streamHeading}>
                  <h2 id="stream-title">{en ? 'Latest notes' : 'Cerita terbaru'}</h2>
                  <button className={s.textButton} onClick={() => void load()} disabled={loading}>
                    {en ? 'Refresh' : 'Muat ulang'}
                  </button>
                </div>
                {loading && posts.length === 0 ? (
                  <p role="status">{en ? 'Loading feed…' : 'Memuat feed…'}</p>
                ) : null}
                {!loading && posts.length === 0 ? (
                  <div className={s.empty}>
                    <p>
                      {en
                        ? 'No notes yet. Your first note can stay just for you.'
                        : 'Belum ada cerita. Catatan pertamamu boleh hanya untukmu.'}
                    </p>
                  </div>
                ) : null}
                <ol className={s.list}>
                  {posts.map((post) => (
                    <li key={post.id} className={s.post}>
                      <div className={s.postMeta}>
                        <MemberAvatar id={post.authorId} name={post.authorName} version={post.authorAvatarVersion} />
                        <div>
                          <strong><Link className={s.authorLink} href={`/feed/profile/${post.authorId}`}>{post.authorName}</Link></strong>
                          <small>
                            {new Intl.DateTimeFormat(en ? 'en-US' : 'id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                              timeZone: 'UTC',
                            }).format(new Date(post.createdAt))}{' '}
                            ·{' '}
                            {post.visibility === 'private'
                              ? en
                                ? 'Only me'
                                : 'Hanya saya'
                              : en
                                ? 'Community'
                                : 'Komunitas'}
                          </small>
                        </div>
                      </div>
                      <p className={s.postBody}>{post.body}</p>
                      {post.snapshot ? (
                        <div className={s.snapshot}>
                          <span>{en ? 'Activity card' : 'Kartu aktivitas'}</span>
                          <strong>{post.snapshot.label}</strong>
                          {post.snapshot.kind !== 'finance' && post.snapshot.amount != null ? (
                            <small>{post.snapshot.amount}</small>
                          ) : null}
                        </div>
                      ) : null}
                      <div className={s.postActions}>
                        {post.mine ? (
                          <>
                            <button
                              onClick={() => {
                                setEditing(post.id);
                                setBody(post.body);
                                setVisibility(post.visibility);
                                setReview(false);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                            >
                              {en ? 'Edit' : 'Ubah'}
                            </button>
                            <button
                              disabled={pending}
                              onClick={async () => {
                                if (
                                  window.confirm(en ? 'Delete this post?' : 'Hapus posting ini?') &&
                                  (await send({
                                    action: 'delete',
                                    id: post.id,
                                    version: post.version,
                                  }))
                                )
                                  await load();
                              }}
                            >
                              {en ? 'Delete' : 'Hapus'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setReporting(reporting === post.id ? null : post.id);
                                setReason('');
                              }}
                            >
                              <Flag size={15} aria-hidden />
                              {en ? 'Report' : 'Laporkan'}
                            </button>
                            <button
                              disabled={pending}
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    en ? 'Block this member?' : 'Blokir anggota ini?',
                                  ) &&
                                  (await send({ action: 'block', ownerId: post.authorId }))
                                )
                                  await load();
                              }}
                            >
                              {en ? 'Block' : 'Blokir'}
                            </button>
                          </>
                        )}
                      </div>
                      {reporting === post.id ? (
                        <form
                          onSubmit={async (event) => {
                            event.preventDefault();
                            if (await send({ action: 'report', id: post.id, reason })) {
                              setReporting(null);
                              setReason('');
                            }
                          }}
                        >
                          <label>
                            {en ? 'Reason for report' : 'Alasan laporan'}
                            <input
                              value={reason}
                              onChange={(event) => setReason(event.target.value)}
                              maxLength={500}
                              required
                            />
                          </label>
                          <button disabled={pending || !reason.trim()}>
                            {en ? 'Submit report' : 'Kirim laporan'}
                          </button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ol>
                {hasMore ? (
                  <button
                    className={s.more}
                    disabled={loading}
                    onClick={() => void load(true, posts.at(-1))}
                  >
                    {loading ? (en ? 'Loading…' : 'Memuat…') : en ? 'Load more' : 'Muat lainnya'}
                  </button>
                ) : null}
              </section>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
