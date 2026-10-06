# HabitTracker — Design specification

Versi 1.2 · 5 Oktober 2026 · Acuan: [PRD v0.5](docs/PRD-v0.5.md).

Dokumen ini memuat kontrak desain dan riwayat kandidat eksplorasi. Keputusan implementasi frontend terbaru ada di §10; keputusan itu tidak merupakan persetujuan komersial atau bukti kesiapan rilis. Ketentuan produk mengikuti PRD; §23–29 mengklarifikasi bagian sebelumnya. Empat mockup awal menjadi referensi konten dan kebutuhan desktop/mobile, bukan token final. Nama Rian, tanggal, dan angka pada mockup hanya contoh data.

## 1. Arah visual: ritme harian

HabitTracker membantu orang mencatat satu tindakan kecil dengan cepat, lalu melihat hubungan tindakan itu dengan hari mereka. Identitas visual memakai ritme: deretan hari, bar progres pendek, dan pola aktivitas yang konsisten. Satu elemen paling menonjol adalah **strip minggu interaktif**; bagian lain tenang agar data dan tindakan mudah dibaca.

### Prinsip dan status keputusan visual

Arah yang dituju adalah modern, matang, personal, tetap fun, dan nyaman untuk pencatatan setiap hari. Kritik terhadap UI saat ini menjadi dasar eksplorasi: dominasi indigo, panel putih membulat yang berulang, ikon dalam kotak pastel, dan komposisi dashboard SaaS generik belum memberi HabitTracker karakter yang cukup khas.

- **Agenda sebagai pusat:** tanggal, habit terjadwal, progres, dan aksi pencatatan lebih menonjol daripada salam, statistik sekunder, atau dekorasi. Aksi “Catat aktivitas” mudah ditemukan tanpa harus melewati seluruh daftar habit.
- **Ritme sebagai identitas:** strip minggu interaktif menunjukkan hubungan antarhari; bedakan hari ini, tanggal dipilih, dan aktivitas tercatat. Jangan sekadar membuat tujuh kartu statistik atau menyiratkan streak yang di luar scope.
- **Personal dari isi:** nama habit, pilihan modul, jadwal, serta refleksi milik pengguna membentuk pengalaman. Gunakan copy hangat dan singkat, tanpa kutipan motivasi pengisi ruang atau nada menghakimi hari kosong.
- **Fun yang terarah:** aksen aktivitas dan respons kecil saat berinteraksi boleh memberi karakter. Tidak semua elemen perlu warna cerah, ikon berlatar pastel, atau animasi. Status berhasil tetap berdasarkan konfirmasi server.
- **Hierarki melalui komposisi:** gunakan proporsi, tipografi, ruang, dan pengelompokan. Panel hanya ketika membantu membedakan konteks; jangan membungkus setiap bagian dalam kartu putih membulat yang sama.
- **Identitas mandiri:** indigo/biru tidak otomatis menjadi warna utama. Jangan memakai brand guideline produk lain sebagai identitas HabitTracker. Warna, font, dan bentuk dipilih karena cocok dengan aktivitas harian, bukan karena preset skill atau template.

Layout dua kolom, palet, font, nilai hex, radius, dan dimensi visual saat ini adalah **kandidat untuk diuji**, bukan keputusan final. Prinsip, kontrak fungsi, aksesibilitas, dan aturan PRD tetap mengikat. Uji alternatif komposisi agenda utama dengan ringkasan di bawah maupun di samping; keputusan visual final baru dicatat setelah hasilnya ditinjau di browser pada mobile dan desktop, terang dan gelap. Keputusan ini tidak mengubah stack CSS Modules/CSS variables.

| Bagian yang dievaluasi | Arah eksplorasi                                       | Tanda perbaikan                                                             |
| ---------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| Salam dan ruang atas   | Salam ringkas, konteks tanggal jelas                  | Awal habit dan aksi pencatatan cepat terlihat                               |
| Strip minggu           | Satu ritme visual dengan state yang jelas             | Pengguna mengenali hari ini dan tanggal aktif tanpa mengandalkan warna saja |
| Panel berulang         | Daftar agenda dengan pemisah/pengelompokan seperlunya | Habit menjadi fokus, ringkasan tidak bersaing                               |
| Ikon pastel            | Ikon bebas latar atau bidang seperlunya               | Ikon membantu mengenali aktivitas, bukan memenuhi dekorasi                  |
| Tombol dan warna       | Penekanan sesuai prioritas tindakan                   | Aksi utama mudah dibedakan dari aksi sekunder                               |
| Ring air dan ringkasan | Bentuk penyajian diuji dengan data yang sama          | Target/progres tidak bersaing atau menduplikasi sumber data                 |

## 2. Token desain

Peran token berikut adalah kontrak semantik; nilai warna pada tabel adalah kandidat dari baseline sebelumnya untuk pembanding, bukan palet yang harus dipertahankan. Implementasikan sebagai CSS custom properties semantik. Komponen tidak menulis ulang nilai warna per halaman. Tema `system` mengikuti `prefers-color-scheme`; pilihan eksplisit disimpan di preferensi. Inisialisasi tema harus menghindari kilatan tema dan hydration mismatch.

| Token                    | Kandidat terang | Kandidat gelap | Peran                             |
| ------------------------ | --------------- | -------------- | --------------------------------- |
| `--color-canvas`         | `#F5F7FC`       | `#111827`      | Latar aplikasi                    |
| `--color-surface`        | `#FFFFFF`       | `#1B2536`      | Panel, dialog                     |
| `--color-surface-muted`  | `#EDF1F8`       | `#253247`      | Track, hover, bidang sekunder     |
| `--color-text`           | `#17233A`       | `#F1F5FC`      | Judul dan isi                     |
| `--color-text-muted`     | `#53617A`       | `#B4C1D6`      | Keterangan                        |
| `--color-border`         | `#DCE3EE`       | `#3A4961`      | Pemisah dekoratif                 |
| `--color-control-border` | `#74829A`       | `#8A9BB5`      | Batas kontrol yang harus dikenali |
| `--color-primary`        | `#4644C4`       | `#B5B3FF`      | Aksi, hari dipilih, tautan        |
| `--color-on-primary`     | `#FFFFFF`       | `#18163F`      | Isi tombol utama                  |
| `--color-primary-soft`   | `#EEEDFF`       | `#302E55`      | Navigasi aktif, bidang pilihan    |
| `--color-success`        | `#146B52`       | `#78DFC0`      | Selesai, berhasil                 |
| `--color-danger`         | `#B52D45`       | `#FFA8B5`      | Error, tindakan destruktif        |
| `--color-warning`        | `#805000`       | `#FFD18C`      | Konflik/peringatan                |
| `--color-focus`          | `#4644C4`       | `#CECFFF`      | Ring fokus                        |

Palet pembanding yang belum final terdiri atas mineral `#F5F7FC`, ink `#17233A`, indigo `#4644C4`, teal `#16768A`, coral `#BE4A35`, dan violet `#7750AA`. Warna kategori berbeda dari status selesai. Status selalu memakai ikon dan teks atau accessible name.

| Aktivitas       | Foreground terang / soft                   | Foreground gelap / soft |
| --------------- | ------------------------------------------ | ----------------------- |
| Air             | `#126B80` / `#E0F4F9`                      | `#83DCEC` / `#173D49`   |
| Olahraga        | `#A83F2E` / `#FFF0E9`                      | `#FFA88C` / `#492D2B`   |
| Belajar         | `#7147A0` / `#F2ECFB`                      | `#D1B3FA` / `#392B51`   |
| Fasting         | `#805000` / `#FFF4D9`                      | `#FFD18C` / `#443720`   |
| Keuangan        | `#146B52` / `#E3F6EE`                      | `#78DFC0` / `#183E35`   |
| Custom/refleksi | `--color-primary` / `--color-primary-soft` | Sama secara semantik    |

Semua pasangan di atas adalah kandidat token. Verifikasi kontras saat implementasi: teks normal ≥4,5:1, teks besar ≥3:1, kontrol/fokus ≥3:1 terhadap bidang bersebelahan. Border dekoratif tidak boleh menjadi satu-satunya petunjuk kontrol. Jangan menganggap tabel ini sebagai bukti audit WCAG.

### Tema dan peran token

`canvas` adalah bidang halaman; `surface` dan `surface-muted` memisahkan konteks tanpa mewajibkan kartu. `text`/`text-muted` menentukan hierarki baca, bukan alasan menurunkan kontras. `primary`/`on-primary`/`primary-soft` menandai tindakan atau pilihan utama; `success`, `danger`, dan `warning` menyampaikan status. `border` untuk pemisah dekoratif berbeda dari `control-border` yang membantu mengenali kontrol. `focus` harus terbaca pada semua bidang. Warna aktivitas tidak menggantikan warna status.

Terang dan gelap memiliki hierarki yang setara; dark mode bukan sekadar membalik warna atau menambah glow. Uji surface, teks, ikon, fokus, serta state hover/selected/disabled/error pada keduanya. Mode sistem mengikuti perubahan preferensi OS ketika dipilih; pilihan terang/gelap eksplisit tidak ditimpa OS. Pastikan transisi tema tidak menghilangkan input/fokus atau menimbulkan kilatan tema saat halaman dimuat.

### Tipografi, dimensi, dan ikon

Nilai visual berikut adalah titik awal eksperimen. Keterbacaan, target sentuh, fokus, dan ambang kontras tetap menjadi syarat, bukan kandidat yang boleh dikurangi.

- Kandidat font saat ini: **Plus Jakarta Sans**, fallback `system-ui, sans-serif`; bandingkan dengan alternatif yang memberi karakter personal dan tetap jelas untuk angka/form. Pilihan satu atau dua keluarga beserta perannya diputuskan setelah review browser; host font terpilih secara lokal. Berat 400, 500, 600, 700 saja. Jangan mengandalkan unduhan font saat runtime pengguna.
- Body 16/24 px; metadata 14/20; label kontrol 14/20 medium; judul section 20/28 semibold; page title mobile 26/34 dan desktop 32/40 bold; angka ringkasan 28/36. Angka memakai `font-variant-numeric: tabular-nums`.
- Teks rata kiri; heading tidak all-caps. Panjang paragraf maksimum 70 karakter. Ringkasan uang boleh menyusut sampai 24 px sebelum berpindah baris, tidak dipotong sampai kehilangan nilai.
- Spacing: 4, 8, 12, 16, 24, 32, 48 px. Radius: kontrol 10, panel 18, dialog 24, badge/pill 999 px. Jangan memakai radius sama untuk semua komponen.
- Shadow hanya untuk overlay atau panel mengambang: terang `0 12px 36px rgb(23 35 58 / 12%)`; gelap gunakan pemisahan surface/border, bukan glow.
- Satu keluarga ikon outline seperti Lucide, 20–24 px, stroke konsisten. Ikon habit tidak wajib berada dalam kotak berwarna; uji ikon tanpa latar. Bidang soft 40–44 px hanya kandidat bila membantu pengenalan. Tidak memakai emoji sebagai ikon kontrol.
- Tinggi tombol/input minimum 44 px; kontrol utama 48 px. Ring fokus 2 px dengan offset 3 px. Disabled punya label/status yang dapat dipahami.

## 3. Struktur informasi dan layout

Breakpoint dan ukuran layout di bawah adalah kandidat pengujian. Urutan informasi dan ketersediaan fungsi tetap berlaku; perubahan breakpoint harus dibuktikan pada konten nyata di browser. Wireframe menunjukkan hubungan informasi, bukan bentuk visual final.

### Mobile: 320–767 px

Satu kolom, gutter 16 px (12 px pada 320 px), gap section 24 px. Navigasi bawah tetap menyediakan label; tab hanya muncul sesuai akses dan flag feed server. Tambahkan ruang konten bawah sebesar tinggi navigasi plus `env(safe-area-inset-bottom)`. Tidak ada konten atau tombol tertutup navigasi/keyboard.

Pengaturan diakses dari tombol ikon berlabel pada kanan atas halaman produk, di samping status Privat ketika ruang tersedia. Item Pengaturan tidak diulang di sidebar atau navigasi bawah. Dari halaman Feed, pengguna dapat kembali ke Hari Ini untuk membuka tombol tersebut.

```text
┌──────────────────────────────┐
│ Halo, {nama}          avatar │
│ Hari Ini · tanggal lokal     │
│ Sen Sel Rab Kam Jum Sab Min  │
│  5   6   7   8   9  10  11  │
│ 3 dari 5 selesai ━━━━━ 60%   │
│ Kebiasaan hari ini           │
│ ikon  Gym       45 mnt   ✓   │
│ ikon  Belajar   30 mnt   ✓   │
│ ikon  Minum air 750 ml   +   │
│ …                            │
│ [ + Catat aktivitas ]        │
│ Air · 750 / 2.000 ml         │
│ [ +250 ml ] [ Jumlah lain ]  │
│ Keuangan · pengeluaran      │
│ Rp75.000  [Tambah transaksi] │
│ Refleksi · opsional          │
├──────────────────────────────┤
│ Hari Ini Riwayat [Feed] Keuangan │
└──────────────────────────────┘
```

Air dan Keuangan tetap satu kolom pada layar sempit; baru boleh berdampingan ≥480 px apabila label dan tombol tidak menyempit. Strip tujuh hari membagi lebar merata; angka 16–18 px, label 12–14 px, target sentuh ≥44 px tinggi. Jangan memakai scroll horizontal halaman. Tidak ada CTA floating yang menutup baris.

### Tablet: 768–1099 px

Kandidat navigasi rail 80 px dengan accessible name dan tooltip keyboard; gunakan label terlihat bila ruang memungkinkan, dan uji agar ikon tidak ambigu. Area agenda tetap dominan. Ringkasan boleh dua kolom. Dialog berubah menjadi panel terpusat bila keyboard dan tinggi viewport cukup. Semua fungsi mobile/desktop tersedia.

### Desktop: ≥1100 px

Kandidat A: sidebar 224 px; area konten maksimum 1280 px, gutter 32 px. Kolom utama `minmax(0, 1fr)` dan kolom ringkasan 320–360 px, gap 24 px. Header dan strip minggu milik kolom utama; widget air, keuangan, refleksi di sisi kanan. Daftar habit menjadi satu surface, bukan kartu berulang. Sidebar menempatkan akun dan bantuan di bawah. Tidak ada panel motivasi besar.

Kandidat B: agenda dalam satu alur utama, ringkasan pendukung di bawah dengan lebar baca terkendali. Bandingkan keduanya pada habit pendek/panjang dan modul nonaktif. Dua kolom hanya dipilih bila mempercepat pemindaian dan pencatatan; jangan mempertahankannya demi kemiripan dengan dashboard umum. Navigasi desktop tetap menyediakan item sidebar setara sesuai PRD.

```text
┌───────────┬──────────────────────┬────────────────┐
│ Brand     │ Halo, {nama}         │                │
│ Hari Ini  │ tanggal / strip minggu│ Air            │
│ Riwayat   │ progres              │ +250 / lainnya │
│ Feed*     │ daftar habit         ├────────────────┤
│ Keuangan  │                      │ Keuangan       │
│ Pengaturan│ + Catat aktivitas    ├────────────────┤
│ akun      │                      │ Refleksi       │
└───────────┴──────────────────────┴────────────────┘
* Hanya saat flag feed dan akses pengguna mengizinkan.
```

## 4. Komponen dan perilaku

| Komponen          | Kontrak                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| AppShell          | Shell produk, shell akses terbatas, dan shell administratif berbeda; role/flag dari server                                                 |
| WeekStrip         | Hari ini, tanggal dipilih, dan indikator aktivitas dibedakan; nama lengkap tanggal tersedia untuk pembaca layar; minggu Senin–Minggu       |
| DailyProgress     | Pembilang/penyebut habit terjadwal; 0 jadwal menampilkan “Tidak ada kebiasaan terjadwal”, tanpa 0%/100% buatan                             |
| HabitRow          | Nama, target/progres, ikon sumber, status, aksi konteks; detail dan aksi selesai dua kontrol terpisah tanpa nested button                  |
| QuickCapture      | Pilih modul aktif → input → tinjau bila perlu → simpan; modul tidak tersedia tidak menerima data                                           |
| HydrationWidget   | Target dari satu habit hidrasi aktif; tanpa habit hanya total ml dan “Belum ada target”; ring bukan kontrol atau indikator kesehatan medis |
| FinanceSummary    | Label periode, pemasukan/pengeluaran terpisah; tanpa transaksi tampil “Belum ada transaksi tercatat”; tidak mengasumsikan pengeluaran nol  |
| CapturePanel      | Bottom sheet mobile, dialog desktop; judul dan close jelas; focus trap, Escape, focus return, scroll internal, keyboard aman               |
| FormField         | Label permanen, unit, bantuan, error inline yang terhubung; validasi server tetap wajib                                                    |
| SaveFeedback      | Idle → pending → berhasil/gagal/konflik; live region tidak membacakan ulang seluruh halaman                                                |
| Timeline/Calendar | Kalender ditambah daftar yang setara secara aksesibilitas; filter dan pagination tidak menghapus konteks tanggal                           |
| VisibilityPicker  | Default “Hanya saya”; “Komunitas” menjelaskan siapa yang melihat sebelum Terbitkan                                                         |
| StatusBanner      | Status akun/lisensi, alasan yang aman ditampilkan, dan tindakan yang memang tersedia                                                       |

Checklist manual bisa ditandai langsung dengan status pending. Habit bersumber log membuka pencatatan log, bukan tombol yang memaksa selesai. Tanggal masa depan boleh ditinjau sebagai jadwal, tetapi penyelesaian ditolak. Fasting menampilkan rencana/rentang aktual terpisah dan membutuhkan konfirmasi manual selesai. Jangan membuat timer latar belakang.

Progress dan angka canonical berubah sesudah respons server berhasil. Selama pending, tampilkan spinner kecil/status “Menyimpan…”; cegah submit berulang dan gunakan identitas operasi yang sama saat retry. Gagal mempertahankan input. Tidak memakai optimistic success untuk uang, lisensi, atau penyelesaian aktivitas.

## 5. Rancangan halaman dan alur

### Akun dan onboarding

Landing sederhana menjelaskan tracking, keuangan, Telegram, dan fitur sosial yang benar-benar tersedia. Harga/masa akses belum diputuskan: jangan menulis angka, diskon, atau janji “seumur hidup”. Daftar menerima email dan deklarasi usia baseline 18+, lalu OTP, baru tetapkan password. OTP menerima paste/autofill kode utuh dan menjelaskan kedaluwarsa/resend tanpa membuka keberadaan akun. Login, recovery, setup terputus, serta perubahan email memiliki state tersendiri.

Untuk pengujian development lokal sementara, formulir daftar menampilkan email, password, konfirmasi password, dan deklarasi usia tanpa langkah OTP. Tampilkan batas lingkungan serta status akses terbatas dengan jelas setelah akun dibuat. Alur ini tidak mengganti desain pendaftaran beta/publik di atas; jangan menampilkan status email terverifikasi kepada pengguna hanya karena akun development dapat masuk.

Untuk akun pemilik yang diizinkan pada development lokal, halaman akun juga menampilkan pilihan terpisah untuk menyimpan catatan kebiasaan/kesehatan dan keuangan di proyek Supabase development. Jelaskan bahwa kepemilikan email, pemulihan, dan perlindungan produksi belum selesai. Setelah nama dan seluruh pilihan disetujui lalu server mengonfirmasi aktivasi, arahkan ke Hari Ini dengan data akun sendiri; kegagalan tetap di formulir dan tidak menampilkan keberhasilan palsu. Akses ini sementara per akun, sementara feed dan pembayaran tetap tertutup. Ini pengecualian implementasi development, bukan rancangan rilis publik.

Onboarding terverifikasi belum berlisensi hanya preferensi dasar/consent; tidak membuat habit, log, atau dompet. Setelah akses aktif, onboarding produk menawarkan habit dan dompet awal dengan pilihan pengguna, bukan auto-seeding data bisnis. Persetujuan modul sensitif dan Telegram terpisah serta berlabel jelas.

### Hari Ini

Prioritas konten mobile: konteks tanggal → minggu → progres → habit → pencatatan cepat → air → keuangan → refleksi. Aksi masuk pencatatan harus tersedia dekat judul agenda atau area awal daftar, sehingga daftar panjang tidak menenggelamkannya; pemilihan modul rinci dapat tetap di bagian pencatatan cepat. Modul nonaktif tidak menghasilkan widget baru; riwayat lamanya tetap tersedia. Mood/catatan opsional privat. Salam menggunakan nama profil aman, bukan hardcode “Rian”. Tanggal terpilih bukan hari ini diberi judul tanggal yang sebenarnya.

### Riwayat

Kalender dan timeline lintas modul termasuk transaksi. Filter modul/periode dan total mingguan/bulanan tersedia di mobile. Detail sumber menyediakan edit/hapus dengan konfirmasi sesuai dampak. Transfer internal tampil satu kejadian. Konflik edit menawarkan memuat versi terbaru dan mempertahankan draf pengguna; tidak menimpa diam-diam. Perubahan zona waktu tidak menggeser tanggal historis.

### Keuangan

Saldo per dompet, ledger, kategori, metode, dan periode. Form tipe pemasukan/pengeluaran/transfer mengubah field yang relevan. Dompet sumber/tujuan berbeda dari metode pembayaran; saldo awal berbeda dari pemasukan. Transfer hanya web pada rilis pertama. Nominal positif integer IDR, format `Intl.NumberFormat` sesuai bahasa. Saldo negatif diberi peringatan. Arsip dompet/kategori menjaga transaksi historis; dompet arsip tidak menerima transaksi baru.

### Feed

Halaman sendiri, kronologis, pagination eksplisit; tidak masuk Hari Ini. Composer: teks → kartu opsional → visibilitas → tinjau → Terbitkan. Snapshot keuangan hanya “Sudah mencatat keuangan”. Jangan menampilkan nominal/dompet/saldo dari log ke kartu. Edit/hapus milik sendiri, lapor/blokir tersedia; posting tidak membuka log sumber. Tidak ada likes, komentar, follow, media, atau chat.

Perluasan development 6 Oktober 2026: nama penulis pada posting menuju profil anggota; halaman pencarian menemukan anggota Feed aktif melalui nama tampilan, bukan email. Profil orang lain hanya menampilkan cerita yang sengaja dibagikan ke komunitas. Pemilik dapat mengubah nama dan memasang/menghapus satu foto profil kecil. Foto profil adalah identitas akun, **bukan izin media pada posting**. Foto disajikan melalui pemeriksaan akses dan blokir yang sama dengan Feed; akun yang diblokir atau kehilangan akses tidak boleh ditemukan melalui URL langsung. Tampilan profil memakai avatar bundar sederhana, garis pemisah, dan tipografi; formulir edit hanya pada profil sendiri. Pemilihan foto membuka editor dengan geser, zoom, preview avatar, Simpan dan Batal; penyimpanan dimulai hanya setelah Simpan. Saat gagal, editor tetap terbuka dan foto lama tetap tampil; keberhasilan mengganti foto setelah respons server. Sumber PNG/JPEG/WebP maksimal 12 MB, hasil crop JPEG/PNG maksimal 512 KB. Penyimpanan final perlu ditinjau sebelum beta.

### Pengaturan dan akses

Kelompok profil; habit/modul; tampilan/bahasa/zona waktu; lisensi/pesanan; Telegram; privasi/data. Tema tiga pilihan berlabel Terang/Gelap/Sistem. Nonaktifkan modul dengan habit terkait meminta memilih batal atau arsip efektif; jelaskan riwayat tetap tersedia. Tautkan Telegram menjelaskan pemrosesan melalui Telegram dan unlink, bukan menampilkan konfigurasi webhook.

### Operasional

Moderator hanya konten yang dilaporkan, keputusan/alasan dan audit. Admin: metadata minimum, grant bertanggal, suspend/restore, pesanan/refund/rekonsiliasi. Support: tiket dan status tersamarkan. Tidak ada tampilan ledger/kesehatan privat atau impersonation. Aksi berisiko menampilkan dampak konkret, MFA/reauth, konfirmasi, dan hasil provider yang sebenarnya.

## 6. Keadaan akses

| Keadaan                                | Tampilan dan tindakan                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Pengunjung                             | Landing, daftar/login; tanpa data produk/feed                                                                                   |
| Pending OTP                            | Verifikasi, resend sesuai limit, koreksi alamat, batal; tanpa checkout                                                          |
| Verified, password setup belum selesai | Lanjut setup; jalur privacy terbatas; tanpa produk/checkout                                                                     |
| Verified-unpaid                        | Shell terbatas: ringkasan akses, checkout/status, preferensi dasar, bantuan, privasi/data, logout; ekspor kosong tetap tersedia |
| Lisensi/grant aktif                    | Shell produk; onboarding habit/dompet; tab Feed hanya ketika flag/cohort mengizinkan                                            |
| Revoked/grant expired                  | Shell terbatas, bantuan, status akses, ekspor/hapus; tanpa tulis/baca produk berbayar                                           |
| Suspended                              | Jalur bantuan/banding dan permintaan hak data aman; tanpa sesi produk normal                                                    |
| Pembayaran pending                     | “Pembayaran sedang diverifikasi”; refresh/status; redirect tidak menampilkan akses aktif                                        |
| Refund pending                         | Status permintaan; tidak mengklaim refund selesai atau akses tercabut sampai terverifikasi                                      |

Menyembunyikan UI tidak menggantikan pemeriksaan server. Feed OFF menyembunyikan tab dan menolak API sosial. Publik inti boleh diluncurkan tanpa feed sesuai gate PRD; jangan menjualnya sebagai fitur aktif.

## 7. State, microcopy, dan motion

Setiap halaman/form mendefinisikan loading, empty, error, offline, conflict, dan access-denied yang relevan. Skeleton mengikuti struktur tanpa angka fiktif; error fetch tidak berubah menjadi total nol. Offline: “Tidak tersambung. Input belum disimpan.” Tidak menjanjikan sinkronisasi offline. Draf sensitif hanya di memori secara default; jangan simpan di localStorage tanpa desain privasi yang disetujui.

Contoh copy: “Tambah air”, “Simpan transaksi”, “Belum ada kebiasaan terjadwal”, “Perubahan belum tersimpan. Coba lagi.”, “Data sudah berubah di perangkat lain. Muat versi terbaru.” Toast bukan satu-satunya tempat error form. UI bahasa Indonesia/Inggris memakai translation keys; posting pengguna tetap bahasa asal.

Kandidat timing dalam baseline PRD 120–250 ms: status/checkmark 120–160 ms, bar progres 180–220 ms setelah sukses, panel 220–250 ms dengan easing `cubic-bezier(.2,.8,.2,1)`. Animasi menjelaskan tindakan, tidak menjadi bukti simpan. Tanpa confetti berulang, bouncing, parallax, atau progress loop. `prefers-reduced-motion: reduce` menghapus transform/pergerakan nonesensial; status teks dan fokus tetap bekerja. Tidak ada animasi stagger setiap kartu. Perubahan tanggal memberi konteks isi agenda yang berubah, panel menjelaskan asal/tujuan fokus, dan feedback simpan menjelaskan hasil tindakan. Jangan menunda input demi animasi; reduced motion tetap mempertahankan perubahan state melalui teks/ikon tanpa gerak nonesensial.

## 8. Kriteria review desain

Implementasi diperiksa pada 320, 390, 768, 1100, dan 1440 px; terang/gelap/sistem; bahasa Indonesia/Inggris; nama panjang, nominal besar, tanpa jadwal, modul nonaktif, feed OFF, serta shell unpaid. Uji zoom 200%, reflow setara 320 px, keyboard, screen reader, reduced motion, safe area, dan keyboard mobile.

Dashboard harus memperlihatkan konteks tanggal, progres, dan setidaknya awal daftar habit pada viewport mobile representatif tanpa salam dekoratif menghabiskan layar. Semua aksi memiliki target ≥44 px; kontrol tidak dibedakan hanya lewat warna. Lampirkan screenshot dan hasil interaksi nyata saat implementasi. Screenshot desktop saja tidak cukup.

### Penilaian screenshot dan bukti browser

Untuk perombakan visual, wajib ada empat kombinasi: mobile terang, mobile gelap, desktop terang, desktop gelap. Baseline capture 390 × 844 dan 1440 × 900 px, dilengkapi pemeriksaan 320/768/1100 px. Ambil viewport awal dan full-page dengan data sintetis yang sama agar perbandingan adil; sertakan state panel/form serta empty/error yang berubah. Catat viewport, tema, bahasa, route, skenario, dan temuan setiap capture.

| Aspek       | Kriteria lulus review                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Prioritas   | Tanggal, progres, awal agenda, dan pintu pencatatan terlihat pada viewport awal representatif; ringkasan tidak mendominasi habit        |
| Karakter    | Ritme minggu menjadi ciri yang dapat dijelaskan; tidak bergantung pada indigo, kartu seragam, dan kotak pastel untuk membentuk hierarki |
| Keterbacaan | Nama panjang dan nominal besar utuh; label/unit jelas; kepadatan nyaman tanpa ruang kosong yang mendorong aksi terlalu jauh             |
| Responsif   | Mobile punya satu alur utama, desktop memakai ruang untuk tugas; tidak ada overflow, konten tertutup navigasi, atau fungsi hilang       |
| Tema        | Terang/gelap sama-sama menunjukkan pemisahan bidang, status, kontrol, dan fokus; pilihan sistem diuji terpisah di browser               |
| State       | Loading tidak membuat angka palsu, empty memberi tindakan yang relevan, error mempertahankan input dan jalur retry                      |
| Interaksi   | Hari terpilih, aksi utama, kontrol selesai/detail, dan pending/sukses terbaca tanpa warna sebagai satu-satunya petunjuk                 |

Setiap aspek dicatat sebagai lulus/perlu revisi beserta bukti, bukan nilai estetika tanpa alasan. Screenshot tidak membuktikan interaksi atau aksesibilitas: lengkapi dengan uji keyboard/focus trap/return, pembaca layar, kontras terukur, reduced motion, keyboard mobile, dan pemeriksaan console/network browser. Keputusan final mencantumkan kandidat yang diuji, alasan pilihan, bukti browser, dan batas yang masih terbuka. Tidak menetapkan token final hanya dari mockup atau keluaran skill.

| Area                   | Acuan PRD / penerimaan                                |
| ---------------------- | ----------------------------------------------------- |
| Shell dan akses        | §4–6, §25; AC03, AC05, AC26–29, AC34, AC36            |
| Tracking/waktu         | §7, §9; AC06–09, AC13–14                              |
| Keuangan/riwayat       | §8; AC10–12                                           |
| Sosial                 | §10, §23; AC15–17, AC36                               |
| Auth/pembayaran        | §11–12, §24; AC01–02, AC19–20, AC23–25, AC28, AC32–33 |
| UX/privasi/operasional | §14, §26–28; AC21–22, AC29–31, AC35, AC37             |

Selesai desain berarti kontrak ini diterapkan dan diuji, bukan sekadar warna baru. Baseline ERD tersedia di [docs/ERD.md](docs/ERD.md); lengkapi invariant modul terkait sebelum implementasi datanya. Nama produk, baseline bisnis, kebijakan hukum, dan konfigurasi provider yang terbuka tetap mengikuti proses keputusan PRD.

## 9. Skill dan proses desain

- `frontend-design` dipakai untuk eksplorasi dan kritik arah visual: susun alternatif komposisi, palet, dan tipografi yang spesifik untuk rutinitas harian, lalu kritik kecenderungan generiknya sebelum implementasi.
- `ui-ux-pro-max` dipakai untuk memeriksa hierarki, navigasi, formulir, responsivitas, dan aksesibilitas; hasil pemeriksaan menjadi kriteria yang dapat diuji.
- `webapp-testing` dipakai untuk memeriksa hasil UI serta interaksi di browser, dengan screenshot dan bukti perilaku yang relevan.

Skill tersebut adalah panduan kerja, bukan sumber token warna otomatis. Hasilnya harus sesuai PRD dan diuji pada UI nyata. Eksplorasi → kritik → prototype sintetis → review browser mobile/desktop dan terang/gelap → revisi → catat keputusan visual final. Aturan pemilihan skill, fallback ketika tidak tersedia, dan bukti pelaksanaannya mengikuti [AGENTS.md](AGENTS.md). Tidak semua skill diperlukan untuk setiap tugas kecil; perubahan dokumentasi ini tidak berarti pengujian UI atau keputusan visual final sudah selesai.

## 10. Keputusan visual implementasi — 5 Oktober 2026

Bagian ini mengunci pilihan untuk iterasi frontend saat ini dan menggantikan status kandidat pada §1–3 sejauh disebut di bawah. Kontrak fungsi, akses, privasi, serta gate PRD tidak berubah. Review pengguna selanjutnya tetap dapat mengubah pilihan visual.

- **Komposisi:** agenda terbuka tanpa panel pembungkus, strip minggu menyatu dengan pemisah atas/bawah; tanggal aktif memakai sudut bawah yang membulat sebagai detail khas. Dibanding baseline kartu terpisah, hubungan antarhari lebih jelas. Sidebar desktop 216 px; konten maksimum 1280 px. Ringkasan desktop 280 px dengan pemisah vertikal, bukan kartu statistik. Dua kolom dipertahankan untuk menjaga agenda dominan dan ringkasan terjangkau; tablet beralih satu alur agenda.
- **Mobile:** satu kolom, gutter 20 px (12 px pada 320 px), navigasi bawah berlabel dan safe area. Aksi pencatatan sebelum daftar habit, tambah habit tetap tersedia, semua tombol utama minimal 44 px. Pemilihan halaman mengembalikan scroll dan fokus ke main. Konten panjang dapat digulir melewati navigasi dengan ruang bawah yang cukup.
- **Warna:** netral hijau keabu-abuan dan raspberry sebagai aksen pilihan/aksi; bukan dominasi indigo. Warna aktivitas tetap sebagai penanda kecil, tanpa kotak pastel. Status selesai tetap hijau dan dibantu checkmark/label.
- **Tipografi:** Plus Jakarta Sans lokal dipertahankan untuk keterbacaan nama habit, angka, dan kedua bahasa. Karakter berasal dari bobot 500–600 pada judul/angka, ritme ruang, serta aksen minggu, bukan penambahan font dekoratif. Salam desktop maksimum 42 px, mobile 30 px; teks habit mobile 15 px (14 px pada 320 px).
- **Ringkasan:** ring hidrasi dihapus. Widget menyajikan total ml satu kali dan target terpisah; progres habit tetap membaca sumber yang sama. Keuangan menampilkan periode dan nominal tanpa grafik dekoratif. Tombol quick capture lebih ringkas, refleksi dipisahkan garis, tidak lagi kartu besar.
- **Halaman lain:** Riwayat, Keuangan, Pengaturan dan dialog memakai token yang sama; landing dan halaman akses tertutup mengikuti bahasa visual ini. Feed/payment tidak diaktifkan. Shell unpaid terautentikasi belum tersedia dan tidak digantikan preview.
- **State:** pending terlihat sebagai status, pesan sukses preview menyebut perubahan sementara, error mempertahankan form. Native dialog mempertahankan fokus/Escape; reduced motion mengikuti aturan global. Preview tetap state memori yang direset saat reload, bukan persistensi cloud.

Token aktual memakai nama pendek pada `src/styles/globals.css`; tabel berikut menggantikan nilai kandidat warna dasar di §2. Token aktivitas yang tidak tercantum tetap mengikuti nilai implementasi semula.

| Peran / CSS variable     | Light     | Dark      |
| ------------------------ | --------- | --------- |
| Canvas `--canvas`        | `#F7F7F2` | `#191F1D` |
| Surface `--surface`      | `#FFFFFF` | `#222B27` |
| Muted `--muted`          | `#EAECE5` | `#303B35` |
| Text `--text`            | `#252C29` | `#F2F4EC` |
| Secondary text `--sub`   | `#59635D` | `#B9C6BB` |
| Divider `--border`       | `#D6DCD4` | `#425248` |
| Control `--control`      | `#77837A` | `#869C8D` |
| Action/focus `--primary` | `#9B2853` | `#F3A9C1` |
| On action `--on-primary` | `#FFFFFF` | `#361422` |
| Selected soft `--soft`   | `#F6E6ED` | `#482B37` |

Bukti screenshot dan hasil pemeriksaan: [FRONTEND-REVIEW.md](docs/FRONTEND-REVIEW.md). Review browser mencakup desktop/mobile dan light/dark dengan data serta bahasa yang sama, halaman sekunder, panel, dan akses tertutup. Bukti otomatis tidak menggantikan uji screen reader manual, perangkat fisik, usability peserta, atau validasi simpan Supabase aktual.
