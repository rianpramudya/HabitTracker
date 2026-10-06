# Review frontend — 5 Oktober 2026

Scope: perombakan visual Hari Ini/navigasi dan konsistensi halaman yang sudah ada. Tidak ada perubahan migrasi, Auth, RLS, entitlement, API penyimpanan, atau aktivasi feed/pembayaran. Workspace tidak memiliki `.git`; `git status --short` mengembalikan “not a git repository”.

## Keputusan dan review visual

Agenda tanpa panel berulang dipilih dibanding baseline dashboard kartu. Strip minggu menyatu; aksen raspberry hanya untuk pilihan dan tindakan. Plus Jakarta Sans lokal tetap dipakai dengan hierarki bobot lebih tenang. Desktop mempertahankan ringkasan samping yang lebih sempit, mobile memakai satu alur dengan pencatatan sebelum daftar. Ring air dan panel motivasi dihapus; total dan target air dipisahkan agar angka tidak diulang dalam widget.

Screenshot terbaru berawalan `redesign-`; screenshot lama tanpa awalan bukan pembanding state identik. Ukuran CSS: desktop 1440 × 900, mobile 390 × 844 (emulasi Chromium iPhone, raster DPR 3). Bahasa Indonesia dan fixture yang sama untuk kedua tema; tema sistem mengikuti emulasi OS. File `-viewport` merekam layar awal, file utama full-page. Navigasi fixed pada full-page capture dapat terlihat di tengah gambar sesuai posisi viewport; ruang scroll bawah diuji terpisah.

| Kombinasi     | Screenshot                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------- |
| Desktop light | [Viewport](screenshots/redesign-desktop-light-viewport.png), [full page](screenshots/redesign-desktop-light.png) |
| Desktop dark  | [Viewport](screenshots/redesign-desktop-dark-viewport.png), [full page](screenshots/redesign-desktop-dark.png)   |
| Mobile light  | [Viewport](screenshots/redesign-mobile-light-viewport.png), [full page](screenshots/redesign-mobile-light.png)   |
| Mobile dark   | [Viewport](screenshots/redesign-mobile-dark-viewport.png), [full page](screenshots/redesign-mobile-dark.png)     |

Screenshot tambahan memakai suffix `history`, `finance`, `settings`, `capture` untuk kedua tema, serta `access`, `error`, `empty` per viewport.

Penilaian screenshot: konteks tanggal, pintu pencatatan, progres dan awal habit terlihat pada layar awal; ikon tanpa bidang pastel; desktop ringkasan tidak bersaing dengan agenda; kedua tema menunjukkan fokus/status dan hierarki yang setara. Halaman sekunder menggunakan token yang sama. Mobile tetap menyediakan tambah habit dan semua tab aktif. Tab feed tidak ditampilkan.

## Skill yang dibaca dan diterapkan

- `frontend-design`: kritik terhadap dashboard generik, agenda sebagai pusat dan satu detail khas pada tanggal aktif.
- `ui-ux-pro-max`: hierarki/touch/reflow, query lokal `focus not obscured --domain ux`; hasil membedakan syarat AA dan AAA. Scroll padding/margin serta pemulihan fokus diterapkan.
- `webapp-testing`: inspeksi rendered UI, interaksi, screenshot, console/network. Memakai runner Playwright TypeScript yang sudah ada agar tes tetap satu suite, bukan membuat runner Python kedua.
- `vercel:nextjs`: CSS Modules/global CSS; dokumentasi CSS dari paket Next.js lokal dibaca, stack tetap tanpa Tailwind.
- `vercel:react-best-practices`: review JSX, accessible names pada navigasi tablet, landmark unik, hooks tema, fokus navigasi, pemisahan domain dari tampilan. Tidak menambah dependensi atau cache privat.
- `vercel:verification`: penelusuran simpan membedakan jalur preview in-memory dengan jalur API tertutup. Tidak mengklaim persistensi cloud dari toast atau data preview.

Semua skill di atas tersedia. Skill Supabase tidak dipicu untuk implementasi database karena area itu tidak diubah; pengujian RLS embedded yang sudah ada tetap dijalankan sebagai regresi.

## Bukti pengujian

Perintah dijalankan memakai Node 24 (`/usr/local/bin/node`) terhadap CLI lokal yang sama dengan scripts npm.

| Pemeriksaan                             | Hasil                                                                                                                                                                                                                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint (`npm run lint`)                 | Lulus. Temuan awal global fetch/AbortSignal/console pada skrip Node lama diperbaiki lewat konfigurasi ESLint terbatas `scripts/*.mjs`                                                                                                                                                          |
| TypeScript (`npm run typecheck`)        | Lulus                                                                                                                                                                                                                                                                                          |
| Next production build (`npm run build`) | Lulus, termasuk build akhir sesudah perbaikan landmark                                                                                                                                                                                                                                         |
| Vitest (`npm run test`)                 | 26 lulus: domain dan PostgreSQL embedded, termasuk isolasi owner/commit/rollback                                                                                                                                                                                                               |
| Playwright suite awal                   | 10 lulus: capture, history, transfer dan saldo, bahasa/tema, 320 px, keyboard Escape/focus return, 768/1100 px, reduced motion, gate API                                                                                                                                                       |
| Review browser tambahan                 | 2 lulus pada rerun akhir (total 12 skenario browser lulus dalam rangkaian pengujian); axe pada Hari Ini/Riwayat/Keuangan/Pengaturan light/dark; screenshot panel; perubahan air tercermin pada habit dan Riwayat; reload membuktikan preview sementara; error dependensi modul dan empty state |
| Console/network                         | Tidak ada pageerror, console error, atau requestfailed pada skenario review yang berhasil                                                                                                                                                                                                      |
| Formatting                              | Prettier lulus pada source/tests/config serta dokumen yang berubah                                                                                                                                                                                                                             |

Temuan selama iterasi: landmark aside tanpa nama unik dan banner preview di luar landmark telah diperbaiki. Selector tes heading Riwayat dan alert Next.js sempat ambigu; selector diperjelas tanpa mengurangi assertion. Rerun akhir kedua skenario tambahan lulus setelah koreksi selector.

## Batas verifikasi dan blocker

Alur nyata: UI non-preview → `/api/commands` → gate `AUTH_READY`/`CORE_READY` → Supabase. Gate mengembalikan 503, bukan sukses palsu. Preview yang sudah ada memakai domain yang sama namun state di memori; tambah air 250 ml menjadi 1.000 ml, tercatat di Riwayat, dan kembali ke fixture 750 ml sesudah reload. Ini bukan bukti penyimpanan cloud. Tes transfer preview memeriksa saldo kedua dompet; tes database embedded memeriksa isolasi A/B, tidak mewakili konfigurasi Supabase Auth aktual.

SMTP/domain pengirim, jalur signup aman AC23 dan kontrol sesi masih menghalangi autentikasi/data nyata. Shell unpaid terautentikasi belum ada; hanya halaman akses tertutup yang dapat ditinjau. Feed tetap OFF, payment tetap tertutup. Tidak ada akun, grant atau seed remote dibuat untuk memaksa screenshot.

Belum diverifikasi: screen reader manual, Safari/iOS fisik, usability peserta, persistensi cloud end-to-end dan isolasi dua akun Supabase aktual. Axe/Chromium bukan sertifikasi aksesibilitas atau keamanan. Loading route dipertahankan; belum ada kegagalan jaringan simpan cloud yang dapat diuji lewat UI karena gate masih tertutup.

## File implementasi

- `src/components/dashboard.tsx`, `dashboard.module.css`: struktur agenda, ringkasan, navigasi, feedback, fokus dan gaya halaman produk.
- `src/styles/globals.css`: token light/dark/system dan ruang fokus/scroll.
- `src/lib/i18n.ts`: microcopy dan pesan preview sementara.
- `src/app/landing.module.css`, `src/app/login/page.tsx`: konsistensi landing dan akses tertutup.
- `tests/e2e/app.spec.ts`, `tests/e2e/redesign.spec.ts`: regresi dan bukti visual/perilaku.
- `eslint.config.mjs`: global runtime Node untuk skrip pemeriksaan yang sudah ada.
- `DESIGN.md`, `AGENTS.md`: keputusan implementasi visual dan referensi statusnya.
- Dokumen ini dan `docs/screenshots/`: bukti review.
