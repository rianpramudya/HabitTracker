'use client';
import { useState } from 'react';
import Link from 'next/link';
import s from './moderation-client.module.css';

type Report = {
  id: string;
  postId: string;
  body: string;
  authorName: string;
  reason: string;
  createdAt: string;
};
export default function ModerationClient({ initial }: { initial: Report[] }) {
  const [reports, setReports] = useState(initial);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');
  async function decide(reportId: string, hide: boolean) {
    const reason = decisions[reportId]?.trim();
    if (!reason || pending) return;
    setPending(reportId);
    setError('');
    try {
      const response = await fetch('/api/social/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, hide, reason }),
      });
      if (!response.ok) throw new Error();
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch {
      setError('Keputusan belum tersimpan. Muat ulang sebelum mencoba lagi.');
    } finally {
      setPending(null);
    }
  }
  return (
    <main className={s.main}>
      <Link href="/feed" className={s.back}>
        ← Kembali ke feed
      </Link>
      <span className={s.kicker}>Ruang moderator</span>
      <h1>Laporan komunitas</h1>
      <p>
        Hanya posting yang dilaporkan dan alasan laporannya tersedia di sini. Setiap keputusan
        memerlukan alasan dan tercatat dalam audit.
      </p>
      {error ? (
        <p role="alert" className={s.error}>
          {error}
        </p>
      ) : null}
      {reports.length === 0 ? (
        <p role="status">Tidak ada laporan menunggu tinjauan.</p>
      ) : (
        <ol className={s.list}>
          {reports.map((report) => (
            <li key={report.id}>
              <small>Penulis: {report.authorName}</small>
              <p>{report.body}</p>
              <blockquote>Alasan laporan: {report.reason}</blockquote>
              <label>
                Alasan keputusan
                <input
                  value={decisions[report.id] ?? ''}
                  maxLength={500}
                  onChange={(event) =>
                    setDecisions((current) => ({ ...current, [report.id]: event.target.value }))
                  }
                />
              </label>
              <div className={s.actions}>
                <button
                  disabled={pending !== null || !decisions[report.id]?.trim()}
                  onClick={() => void decide(report.id, true)}
                >
                  Sembunyikan posting
                </button>
                <button
                  disabled={pending !== null || !decisions[report.id]?.trim()}
                  onClick={() => void decide(report.id, false)}
                >
                  Tolak laporan
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
