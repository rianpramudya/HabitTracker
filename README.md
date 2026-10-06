# HabitTracker

Web responsif Next.js App Router + TypeScript + CSS Modules. Implementasi development, belum siap menerima data nyata.

## Menjalankan lokal

Gunakan Node.js 24 LTS (`.nvmrc`) dan npm. Install `npm ci`, salin `.env.example` ke `.env.local` lalu isi URL dan publishable key bila belum tersedia. Jangan menimpa `.env.local` yang sudah dikonfigurasi.

```sh
npm run dev
```

Buka http://127.0.0.1:3000 untuk landing; http://127.0.0.1:3000/preview untuk dashboard interaktif desktop/mobile. Server hanya listen loopback. Pratinjau memakai data sintetis dan state sementara; refresh mengembalikan fixture. Tidak ada akun/lisensi palsu atau penulisan data pratinjau ke Supabase.

## Status fitur

| Area | Status |
|---|---|
| Landing dan dashboard | Berfungsi pada preview, mobile/tablet/desktop |
| Habit/air/olahraga/belajar/custom | Pencatatan, rule efektif, arsip, progres; domain dan preview |
| Keuangan | Wallet, income/expense/transfer, saldo derived, edit/delete, history; domain dan preview |
| Refleksi | Mood/catatan privat di preview |
| Tema/bahasa | Light/dark/system, Indonesia/Inggris |
| Database | Migrasi normalized/RLS/atomic commit tersedia dan diuji PostgreSQL embedded; sudah diterapkan pada development/staging |
| Auth/Supabase produk | Publishable client dikonfigurasi; login/OTP/setup/session/consent belum dibuka |
| Telegram/feed/payment/admin | Endpoint fail closed; belum implementasi lengkap |

Jangan mengubah `AUTH_READY`/`CORE_READY` menjadi true untuk melewati blocker. Service-role key belum tersedia; commit adapter tidak berfungsi tanpa konfigurasi server. `CORE_READY` tidak berarti seluruh PRD terpenuhi.

## Pengujian

```sh
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm run format:check
```

Tests database memakai PGlite PostgreSQL embedded dan schema auth sintetis. Tidak menggantikan adversarial Auth API Supabase aktual. E2E menguji preview/client domain serta penolakan endpoint produk, bukan penyimpanan cloud. Hasil dan screenshot di [docs/VERIFICATION.md](docs/VERIFICATION.md).

## Database dan keamanan

Proyek teridentifikasi: `HabbitTrackerV1` / `oxsgbjlysojlwyrmfmjc`, organisasi HabbitTracker, region Seoul. Pemeriksaan awal menemukan nol akun dan nol tabel public. Tidak mengubah region/paket atau mengirim email kepada pihak lain. Migrasi foundation dan hardening telah diterapkan setelah persetujuan eksplisit pemilik. Seluruh 13 tabel memakai RLS; auth aplikasi masih tertutup sambil konfigurasi server dan email disiapkan.

[ERD](docs/ERD.md), [progres dan blocker](docs/PROGRESS.md), [PRD](docs/PRD-v0.5.md), [desain](DESIGN.md), dan [aturan AI](AGENTS.md) adalah acuan. Payment tetap tahap akhir, tanpa harga/provider/refund yang dikarang.
