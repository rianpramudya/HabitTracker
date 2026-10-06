# Bukti verifikasi development

5 Oktober 2026, workspace lokal macOS. Core checks memakai Node.js 24.11.1; Playwright dijalankan dari npm lokal dan Chromium 153. Tidak ada deployment publik atau data pengguna nyata.

## Hasil

| Pemeriksaan | Hasil |
|---|---|
| ESLint TypeScript, React hooks, JSX a11y | Lulus |
| TypeScript strict | Lulus |
| Next.js production build lokal | Lulus |
| Domain/access/PostgreSQL embedded | 26 kasus lulus |
| Browser desktop + mobile | 10 kasus lulus |
| Audit npm production dan seluruh dependency | 0 vulnerabilities pada pemeriksaan terakhir |
| Axe automated WCAG tags | Tidak ada violation pada dashboard terang dan Pengaturan gelap yang diuji |

Browser mencakup viewport desktop 1440×1000, profil mobile iPhone 13 Chromium, reflow 320 px, tablet 768/1100 px dan reduced motion. Uji dialog Escape/focus return, tambah air, pencatatan olahraga, history, transfer dua wallet, theme dan language. API sosial OFF mengembalikan 404, payment belum dibuka 503, command dengan origin salah 403, command produk belum diaktifkan 503.

Tes PostgreSQL memakai PGlite dengan auth.users/auth.sessions/JWT sintetis. Memverifikasi migrasi SQL, read policy milik sendiri, larangan direct writes/RPC bagi authenticated, cross-owner FK, atomic rollback, idempotent replay, key payload mismatch, concurrent revision, revoke/suspend dan native session deletion. Tests ini bukan uji jaringan Auth Supabase, dan belum uji parallel load multi-instance.

## Screenshot

- [Desktop terang](screenshots/desktop-light.png)
- [Desktop gelap](screenshots/desktop-dark.png)
- [Mobile terang](screenshots/mobile-light.png)
- [Mobile gelap](screenshots/mobile-dark.png)

Screenshots memakai fixture sintetis. Browser berhasil membuka halaman tanpa pageerror dalam alur yang diuji. CLI agent-browser tidak tersedia; verifikasi browser memakai Playwright langsung. Otomasi tidak membuktikan kepatuhan WCAG menyeluruh; review screen reader manual, zoom 200%, kontras seluruh states dan perangkat fisik tetap perlu.

## Integrasi Supabase

Plugin membaca organisasi HabbitTracker, proyek HabbitTrackerV1 (`oxsgbjlysojlwyrmfmjc`), status ACTIVE_HEALTHY, PostgreSQL 17.11, region Seoul ap-northeast-2. Query read-only menemukan nol auth.users dan nol public base tables. Publishable key disimpan hanya pada environment lokal yang diabaikan git; nilai tidak dicetak.

Setelah persetujuan eksplisit pemilik, foundation (20261005081621) dan harden_foundation (20261005081835) berhasil diterapkan ke development/staging. Seluruh 13 tabel menunjukkan RLS=true. SQL privilege check: anon_commit=false, authenticated_commit=false, server_commit=true. Hardening mencabut hak API pada event-trigger function provider `rls_auto_enable()` sambil mempertahankan trigger tersebut, dan menambahkan indeks untuk FK aktor audit/entitlement.

Security advisor sesudah hardening tidak mengeluarkan WARN/ERROR. Tujuh INFO [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) pada tabel private memang disengaja: klien tidak punya policy/grant untuk mengaksesnya, sedangkan jalur server memeriksa owner/session/entitlement. [Hak execute security definer](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) yang ditemukan pada fungsi provider telah dicabut. [Indeks foreign key](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) aktor telah ditambahkan. Indeks belum terpakai adalah wajar pada database kosong.

Script `scripts/check-supabase.mjs` memverifikasi penolakan akses anonim lewat jaringan Data API tanpa mencetak key atau payload. Auth public settings terbaca: email aktif, autoconfirm false, signup masih terbuka. Tidak menjalankan signup/OTP atau membuat akun/grant remote. Tidak ada uji takeover terhadap akun asli.

## Batas bukti

Ini bukti fondasi dan simulasi UI. Belum membuktikan auth OTP/password/direct-signup AC23, SMTP, CAPTCHA, sesi provider, cleanup race aktual, consent/hak data, MFA/tooling ops, Telegram, moderasi/feed, payment, budget/load/monitoring, backup/restore atau kesiapan beta. API commit dan schema remote sudah disiapkan. Server secret kini dikonfigurasi lokal; pemeriksaan read-only berhasil HTTP 200 dengan nol profil. Belum ada uji mutasi cloud terautentikasi; `AUTH_READY`/`CORE_READY` harus tetap false. Tidak ada keberhasilan simpan cloud yang diklaim.
