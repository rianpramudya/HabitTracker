import Link from 'next/link';
export default function NotFound() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Halaman tidak ditemukan</h1>
      <p>Tautan mungkin sudah berubah.</p>
      <Link href="/">Kembali ke beranda</Link>
    </main>
  );
}
