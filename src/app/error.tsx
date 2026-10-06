'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main style={{ padding: 32 }}>
      <h1>Halaman belum dapat dimuat</h1>
      <p>Coba lagi untuk memuat data terbaru.</p>
      <button onClick={reset}>Coba lagi</button>
    </main>
  );
}
