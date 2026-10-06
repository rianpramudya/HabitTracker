# PRD — HabitTracker Web · Addendum v0.6
Versi: 0.6 (addendum atas v0.5) · 6 Oktober 2026
Status: Revisi struktur produk dan logika alur. Bagian v0.5 yang tidak disebut di sini tetap berlaku, terutama §4 (akses), §9 (waktu), §11 (OTP), §12 (lisensi), §15 (keamanan), §24–§29.

Label status (sama dengan v0.5): **[D]** Disepakati (pernyataan pemilik), **[B]** Baseline rancangan, **[T]** Terbuka, **[X]** Ditunda.

---

## 1. Ringkasan perubahan

1. Navigasi berpindah dari "modul teknis" (Olahraga, Air, Fasting...) ke **area kehidupan** sebagai tab: Dashboard, Financial, Health, Working, Education, Home, Feed, Spiritual. **[D]**
2. Ada dua tingkat: **Area** (tab) dan **Fitur** (bagian di dalam area). Pengguna bisa menyalakan/mematikan keduanya di Pengaturan. **[D]**
3. Semua area memakai **empat konsep inti yang sama**: Kebiasaan/Rutinitas, Jadwal, Tugas, Catatan. Tidak ada logika terpisah per tab. **[B]**
4. **Dashboard hanya merangkum**; ia tidak menyimpan data sendiri. **[D]**
5. **Pengaturan diperluas** menjadi pusat kendali: navigasi, bahasa, privasi, keamanan, hapus akun. **[D]**
6. **Spiritual** masuk belakangan dengan gerbang pilih keyakinan, persetujuan, dan privasi tersendiri. **[D]**

---

## 2. Prinsip logika (aturan penyelesai keraguan)

| # | Prinsip | Artinya dalam praktik |
|---|---|---|
| P1 | Satu fakta, satu rumah | Data ditulis di satu tempat. Dashboard, Riwayat, dan Feed hanya membaca. |
| P2 | Dashboard tidak punya data sendiri | Angka di kartu Dashboard harus sama persis dengan halaman areanya. |
| P3 | Template, bukan tabel baru | Jika sesuatu hanya centang/jumlah/durasi (sarapan, vitamin, siram tanaman, salat), ia adalah **Kebiasaan** dengan template. Entitas khusus hanya untuk data yang bentuknya berbeda (ml air, tidur, fasting, ledger, mood). |
| P4 | Empat jenis hal | **Kebiasaan** = tujuan berulang yang dicentang. **Log** = kejadian yang sudah terjadi. **Jadwal** = janji pada waktu tertentu. **Tugas** = pekerjaan yang selesai sekali. |
| P5 | Mematikan bukan menghapus | Menonaktifkan area/fitur menyembunyikan dan menjeda; data tetap utuh dan bisa dibaca di Riwayat. |
| P6 | Tidak menghukum | Tidak ada warna merah/"gagal"/streak untuk hari yang terlewat. Label netral: "Belum". |
| P7 | Tidak ada aksi otomatis atas data bernilai | Transaksi dan posting tidak pernah dibuat otomatis dari fitur lain; selalu lewat konfirmasi pengguna. |
| P8 | Data sensitif tidak bocor ke samping | Spiritual, kesehatan, keuangan, dan isi catatan tidak masuk log sistem, tampilan admin/moderator, atau Feed kecuali pengguna sengaja menuliskannya. |

---

## 3. Peta area

| Tab | Slug | Label ID (usulan) | Label EN | Fungsi | Tahap |
|---|---|---|---|---|---|
| Dashboard | `/dashboard` | Dashboard | Dashboard | Ringkasan semua area aktif. Tidak bisa dinonaktifkan | Inti |
| Financial | `/financial` | Keuangan | Finance | Dompet, transaksi, transfer | Inti |
| Health | `/health` | Kesehatan | Health | Tubuh + Pikiran (menggantikan WorkOut) | Inti |
| Working | `/working` | Pekerjaan | Work | Jadwal kerja, tugas, catatan kerja | Gelombang B |
| Education | `/education` | Pendidikan | Education | Jadwal belajar, tugas, rangkuman, sesi belajar | Gelombang B |
| Home | `/home` | Rumah | Home | Rutinitas rumah, tugas, perawatan, belanja | Gelombang B |
| Feed | `/feed` | Feed | Feed | Sosial sukarela, di balik flag server | Gelombang D |
| Spiritual | `/spiritual` | Spiritual | Spiritual | Ibadah/praktik spiritual | **Segera hadir** |

Di luar tab area:
- **Riwayat** (`/history`): sub-halaman Dashboard, dibuka dari "Riwayat semua aktivitas →". **[B]**
- **Pengaturan** (`/settings`): selalu ada, dibuka dari menu avatar/"Lainnya". Bukan area. **[B]**

Slug dan kunci area tetap; label tampil lewat kunci terjemahan (v0.5 §14). Label di sidebar saat ini campur Inggris/Indonesia; sebaiknya diseragamkan mengikuti bahasa pilihan pengguna. **[B]**

---

## 4. Empat konsep inti

### 4.1 Kebiasaan dan Rutinitas (memperluas v0.5 §7)

Setiap kebiasaan memiliki: judul, **area** (wajib), jenis (checklist/jumlah/durasi, atau berbasis modul sesuai v0.5 §7), **jadwal pengulangan**, **waktu mulai opsional** (HH:mm) dengan durasi opsional, `template_key` opsional, dan catatan opsional.

**Pengulangan yang didukung (baseline):**
- Harian
- Hari tertentu dalam seminggu
- Tiap N hari (N = 2–30), dihitung dari tanggal mulai tetap, sehingga jadwalnya dapat diprediksi

Bulanan, serta "tiap N hari sejak terakhir selesai" (lebih alami untuk menyiram tanaman), **[X]/[T]** sampai ada keputusan.

**Rutinitas** bukan entitas terpisah. Ia adalah kebiasaan checklist yang punya waktu mulai. Contoh dari pemilik: 07:00 menyapu, 08:00 mandi, 09:00 mencuci piring. **[D]**

Aturan:
- Area asal habit berbasis modul tetap: hidrasi/olahraga/fasting → Health; belajar → Education; "catat keuangan" → Financial. Habit custom (checklist/jumlah/durasi) boleh berada di area mana pun kecuali Feed.
- Memindahkan habit ke area lain hanya mengubah pengelompokan. Progres dan riwayat tidak berubah.
- Urutan tampil: berdasarkan waktu mulai; yang tanpa waktu di bawahnya dengan label "Kapan saja".
- Tidak ada status otomatis "terlewat". Jika waktu mulai lewat dan belum dicentang, tampilannya tetap "Belum" (P6).
- `template_key` unik per pengguna di antara habit aktif. Menambah template yang sudah aktif (misal "Mandi" sudah ada di Health) diperingatkan agar tidak dobel (P1).
- Template hanyalah saran awal yang bisa diubah. Menambahkannya tidak pernah otomatis; pengguna mencentang sendiri (v0.5 §7: modul tidak otomatis membentuk habit).

### 4.2 Jadwal

Jadwal adalah janji pada waktu tertentu yang **tidak dicentang selesai**: kelas, kuliah, rapat, shift, ujian, jadwal ibadah mingguan.

Isi: judul, area (Working/Education/Home/Spiritual), waktu mulai–selesai, pengulangan (sekali, harian, hari tertentu, tiap N hari), **masa berlaku** (dari–sampai opsional, misal satu semester), lokasi opsional, catatan, label opsional (§4.5).

Aturan:
- Pengecualian per tanggal: "libur/dibatalkan hari ini" tanpa merusak seri.
- Mengedit seri memakai pilihan **"Kejadian ini saja"** atau **"Seterusnya"** (seri lama berakhir sehari sebelumnya, seri baru dibuat). **Tidak ada opsi yang menulis ulang tanggal lampau**, konsisten dengan versi tanggal efektif v0.5 §7.
- Pergantian semester: akhiri masa berlaku jadwal lama, lalu buat yang baru (aksi "Duplikat sebagai jadwal baru" tersedia).
- Tabrakan waktu hanya diperingatkan, tidak diblokir.
- Waktu jadwal adalah **jam dinding** menurut zona waktu pengguna saat ini (kelas jam 08:00 tetap jam 08:00). Ini berbeda dengan log, yang menyimpan UTC dan tanggal lokal historis (v0.5 §9).
- Jadwal **bukan bukti kejadian**: tidak masuk Riwayat. Alasannya sama seperti fasting: berakhirnya jadwal bukan bukti selesai.
- Minggu ganjil/genap **[X]**.

**Cara membedakan Jadwal dan Rutinitas dalam UI:** pertanyaan tunggal "Perlu dicentang selesai?" → Ya = Kebiasaan/Rutinitas; Tidak = Jadwal.

### 4.3 Tugas **[D]**

Pekerjaan sekali selesai, dipakai di **Working, Education, Home**.

| Bidang | Aturan |
|---|---|
| Judul | Wajib |
| Deskripsi | Opsional, maksimal 2.000 karakter **[D]** (pemilik meminta tempat mengisi deskripsi) |
| Area | Sesuai tab tempat dibuat |
| Tenggat | Tanggal opsional, jam opsional |
| Status | **Belum selesai / Selesai** **[D]**; menyimpan `completed_at` |
| Prioritas | Opsional (rendah/normal/tinggi), default normal **[B]** |
| Label | Opsional (§4.5) |

Aturan:
- Pengguna bisa membalikkan status (selesai → belum); `completed_at` dikosongkan.
- "Lewat tenggat" adalah **penanda turunan** (tenggat lewat dan belum selesai) dengan warna netral, bukan status.
- Tugas bisa diselesaikan lebih awal dari tenggat. Larangan "penyelesaian tanggal masa depan" di v0.5 §7 berlaku untuk habit dan log berbasis tanggal, bukan tugas; `completed_at` tidak boleh di masa depan.
- Tugas selesai muncul di Riwayat pada tanggal lokal `completed_at`.
- Tugas **tidak dihitung** dalam persentase progres harian (§5.1); ia ditampilkan sebagai hitungan terpisah.
- Pengulangan tugas tidak ada; yang berulang adalah Kebiasaan.
- Sub-tugas dan status "sedang dikerjakan" **[T]**, bukan rilis pertama.
- Edit memakai kontrol versi (v0.5 §9). Hapus = soft delete; data terhapus tidak masuk ringkasan.
- Filter: Hari ini · Mendatang · Tanpa tenggat · Selesai.

### 4.4 Catatan harian

Satu mesin catatan dengan beberapa jenis; maksimal satu per jenis per tanggal.

| Jenis | Area | Isi |
|---|---|---|
| Jurnal/refleksi | Health › Pikiran | Mood opsional, catatan, **hal yang disyukuri** (opsional) |
| Rangkuman belajar | Education | Teks singkat "apa yang kupelajari hari ini" **[D]**, maksimal 2.000 karakter |
| Catatan kerja | Working | "Hasil hari ini", opsional, fitur **default mati** **[B]** |

Semua privat. Edit boleh; penyimpanan ulang (retry) tidak membuat entri ganda. Gratitude sengaja menjadi bidang di jurnal, bukan tabel baru (P3).

### 4.5 Label

Pengelompokan ringan milik pengguna per area, yang dipakai Tugas, Jadwal, dan Catatan. Di UI diberi nama sesuai konteks: **Mata pelajaran/kuliah** (Education), **Proyek** (Working), **Ruangan/kategori** (Home). Label yang sudah dirujuk diarsipkan, tidak dihapus (seperti dompet/kategori di v0.5 §8). Satu mesin untuk semua area, tanpa tabel mata pelajaran terpisah.

---

## 5. Spesifikasi per tab

### 5.1 Dashboard **[D]**

Tujuan: satu layar yang menjawab "hari ini aku perlu apa dan sudah sampai mana". Murni ringkasan.

**Isi dari atas ke bawah:**
1. Sapaan, tanggal, dan **pita minggu** Senin–Minggu. Titik di bawah tanggal = jumlah habit terjadwal hari itu (maksimal 5 titik, sisanya "+n"); titik terisi = selesai. Tanggal tanpa jadwal tidak bertitik.
2. **Kebiasaan hari ini** (gabungan semua area aktif yang ditampilkan di Dashboard, kecuali Spiritual). Dikelompokkan/diurutkan menurut waktu, lalu area. Lebih dari 8 item dilipat dengan "Lihat semua". Bilah progres = habit selesai / habit aktif terjadwal (v0.5 §7).
   - Tombol **"+"** di samping judul = tambah **kebiasaan**.
   - Tombol **"Catat aktivitas"** = catat **log** (kejadian yang sudah terjadi). Dua tombol ini berbeda arti dan label sebaiknya dibedakan jelas.
3. **Kartu ringkasan per area** (hanya area aktif dan berstatus "tampilkan di Dashboard"); lihat tabel di bawah.
4. Tautan "Riwayat semua aktivitas →".

**Aturan:**
- Hari tanpa habit terjadwal menampilkan pesan netral ("Tidak ada kebiasaan terjadwal hari ini"), bukan 0% (v0.5 §7).
- Tugas, Jadwal, dan Spiritual **tidak masuk persentase**. Spiritual tampil sebagai hitungan deskriptif di kartunya sendiri, supaya ibadah tidak "dinilai" dengan angka. **[B, mohon konfirmasi]**
- Tanggal lampau: bisa dilihat dan dikoreksi. Tanggal depan: hanya lihat; centang ditolak (v0.5 §7).
- Tidak ada konten Feed di Dashboard.
- Tidak ada area aktif → keadaan kosong dengan ajakan ke Pengaturan › Area & navigasi.
- Opsi tampilan "Sembunyikan nominal" untuk kartu Keuangan. **[B]**

| Kartu | Menampilkan (maks. 3–4 baris) | Aksi cepat | Tautan |
|---|---|---|---|
| Health | Air x / target ml, menit olahraga hari ini, tidur semalam, fasting aktif | **+250 ml**, catat olahraga | `/health` |
| Financial | Pemasukan dan pengeluaran hari ini; saldo total (bisa disembunyikan) | Catat pengeluaran/pemasukan | `/financial` |
| Working | Tugas jatuh tempo hari ini, lewat tenggat, jadwal berikutnya | Tambah tugas | `/working` |
| Education | Jadwal berikutnya, tugas tenggat dekat, menit belajar hari ini, status rangkuman hari ini | Mulai catat sesi, tulis rangkuman | `/education` |
| Home | Rutinitas hari ini x/y, tugas rumah hari ini, perawatan jatuh tempo | Centang rutinitas | `/home` |
| Spiritual | Hitungan ibadah hari ini, hari besar terdekat. Bisa disembunyikan | — | `/spiritual` |

Kartu "Asupan air" dan "Keuangan" yang sudah ada di Dashboard saat ini menjadi bagian kartu Health dan Financial. Itu penyesuaian bentuk, bukan fitur baru.

### 5.2 Financial

Aturan keuangan v0.5 §8 berlaku penuh (ledger, dompet, kategori, metode pembayaran, transfer atomik, saldo awal, arsip).

Struktur halaman: **Ringkasan · Transaksi · Dompet · Kategori**. Transfer dibuat dari halaman web (bot hanya pemasukan/pengeluaran, v0.5 §13).

Tambahan:
- Habit "Catat keuangan" (checklist, area Financial) tetap manual dan tidak otomatis selesai dari transaksi (v0.5 §7).
- Dari Home › Daftar belanja ada aksi **"Catat sebagai pengeluaran"** yang membuka form transaksi **terisi awal** (judul/catatan). Pengguna harus mengonfirmasi nominal, dompet, dan kategori; transaksi tidak pernah dibuat otomatis (P7).
- Budget/investasi tetap **[X]**.

### 5.3 Health (menggantikan WorkOut) **[D]**

Pembagian dalam tab: **Tubuh · Pikiran · Kebiasaan sehat**.

**Tubuh**
| Fitur | Entitas | Catatan |
|---|---|---|
| Olahraga | Sesi olahraga | Ditautkan eksplisit ke satu habit olahraga (v0.5 §7) |
| Air | Log air (ml) | Target dari satu habit hidrasi aktif; 250 + 500 = 750 ml (AC07) |
| Fasting | Rencana + sesi | Konfirmasi manual selesai; lintas tengah malam dibukukan ke tanggal mulai (v0.5 §7) |
| Tidur | Sesi tidur (jam tidur, jam bangun → durasi) | **Dibukukan ke tanggal bangun** **[B]**, karena pengguna membuka aplikasi pagi hari dan mengharapkan "tidur semalam" masuk hari ini. Beda dengan fasting, dan perbedaan ini sengaja. Konfirmasi di §14 |
| Pola makan, Obat & vitamin, Perawatan diri | Kebiasaan dengan template | Sarapan, sayur/buah, kurangi gula, minum vitamin, skincare, sikat gigi, mandi. **Tanpa dosis atau saran medis**; target ditetapkan pengguna (v0.5 §7) |

**Pikiran**
| Fitur | Entitas |
|---|---|
| Jurnal harian (mood + catatan + syukur) | Catatan harian jenis refleksi |
| Meditasi / latihan napas | Kebiasaan durasi (template) |
| Digital detox | Kebiasaan checklist/durasi (template) |

Aturan: data kesehatan memerlukan persetujuan modul terpisah dan berversi (v0.5 §26). Semua fitur bisa dimatikan satu per satu (§6).

### 5.4 Working **[D]**

Struktur: **Hari ini · Jadwal · Tugas · Kebiasaan kerja · Catatan kerja (opsional)**.

- **Jadwal kerja**: shift, rapat, tenggat acara (jadwal berulang atau sekali) sesuai §4.2.
- **Tugas**: sesuai §4.3, dengan status selesai/belum, deskripsi pekerjaan, tenggat, prioritas, dan label **Proyek**.
- **Kebiasaan kerja**: habit custom di area Working, misal "fokus 90 menit" (durasi).
- **Catatan kerja**: fitur default mati.
- Pencatatan jam kerja dan lembur **[X]**.

### 5.5 Education **[D]**

Struktur: **Hari ini · Jadwal · Tugas · Rangkuman · Sesi belajar · Mata pelajaran**.

- **Jadwal**: sekolah, kuliah, ujian, kegiatan lain secara fleksibel (judul bebas, masa berlaku, label mata pelajaran opsional; tidak terikat satu institusi).
- **Tugas**: sesuai §4.3, dengan label mata pelajaran, status, dan deskripsi tugas.
- **Rangkuman harian**: satu per tanggal (§4.4). Ini jawaban atas tumpang-tindih jurnal vs refleksi: rangkuman belajar di sini, perasaan dan jurnal hari itu di Health › Pikiran.
- **Sesi belajar**: durasi positif, ditautkan ke satu habit belajar (contoh di Dashboard: "Waktu untuk belajar 30/30 menit").
- **Kebiasaan belajar**: baca buku, bahasa, coding (template durasi/jumlah halaman).
- Fitur "Belajar" yang ada di Pengaturan saat ini = Sesi belajar.

### 5.6 Home **[D]**

Struktur: **Hari ini · Jadwal · Tugas rumah · Perawatan · Belanja**.

- **Hari ini**: rutinitas berurutan menurut waktu, yaitu kebiasaan checklist ber-waktu yang dibuat pengguna secara manual (menyapu, mandi, mencuci piring...). Tidak ada pengingat push di rilis pertama (§14).
- **Jadwal**: misal jadwal laundry, kunjungan tukang.
- **Tugas rumah**: pekerjaan sekali selesai (perbaiki keran).
- **Perawatan**: tanaman dan hewan peliharaan sebagai kebiasaan berinterval ("tiap 3 hari").
- **Belanja**: daftar centang sederhana, dengan aksi "Catat sebagai pengeluaran" (§5.2). Perencanaan menu **[X]**; sementara bisa memakai daftar biasa.
- "Mandi" dan "sikat gigi" bisa hidup di Health maupun Home; aturan `template_key` unik mencegah dobel (§4.1).

### 5.7 Feed

Aturan v0.5 §10 berlaku penuh. Tambahan:
- Tab tampil hanya jika **flag server ON untuk pengguna itu** dan pengguna **mengaktifkan sendiri** di Pengaturan. Klien tidak bisa membuka flag (AC36).
- Isi kartu snapshot dari area baru sebatas agregat atau status yang dipilih pengguna: jenis aktivitas + durasi/jumlah, status centang, atau hitungan ("3 tugas selesai"). **Judul/deskripsi tugas, rangkuman, jurnal tidak ikut otomatis.** Keuangan tetap hanya "Sudah mencatat keuangan".
- **Spiritual tidak tersedia sebagai kartu snapshot.** **[B]**

### 5.8 Spiritual **[D, tahap: segera hadir]**

Di Pengaturan tampil sebagai "Segera hadir" dan tidak bisa dinyalakan. Rute dan API ditolak selama tahap rilis belum dibuka.

**Gerbang pertama (landing tab):**
1. Penjelasan singkat: data ini hanya milik pengguna, tidak masuk Feed/Telegram/laporan, dan bisa dihapus kapan saja.
2. **Persetujuan modul** terpisah, berversi dan bertanggal (v0.5 §26).
3. **Pilih keyakinan:** Islam · Kristen (Protestan) · Katolik · Hindu · Buddha · Konghucu · Lainnya/atur sendiri. Opsi **"Atur sendiri"** wajib ada agar pengguna tidak dipaksa menyebut agama. **[B]**
4. Tawaran **paket awal** (daftar saran yang dicentang sendiri; tidak ada yang dibuat otomatis).

**Isi setelah memilih:** Hari ini (jadwal ibadah/praktik harian), Jadwal mingguan (misal ibadah hari tertentu), Hari besar, Catatan praktik.

**Contoh paket awal (ilustrasi, semuanya dapat diubah):**
- **Islam:** salat lima waktu (checklist per waktu, jam diisi pengguna), tilawah (durasi/jumlah halaman + deskripsi misal surah), dzikir, puasa sunnah, hari besar.
- **Kristen/Katolik:** ibadah/misa mingguan (jadwal), doa dan renungan harian, pengingat hari besar (Jumat Agung, Paskah, Natal).
- **Hindu, Buddha, Konghucu, dan lainnya:** paket awal **belum ditulis**. Ini perlu narasumber/reviewer dari masing-masing komunitas; produk tidak boleh mengarang praktik keagamaan.

**Aturan:**
- Status salat = checklist "sudah/belum", tanpa label "terlewat" (P6).
- Jam salat dan tanggal hari besar **diisi manual** di rilis pertama. Perhitungan otomatis butuh lokasi, metode hitung, dan sumber kalender resmi, sehingga **[T]** (§14). Tanggal hari besar yang dihitung tidak boleh keliru diam-diam.
- Mengganti keyakinan: pengguna memilih menyimpan, mengarsipkan, atau menghapus item dari paket sebelumnya.
- **Hapus data Spiritual** satu tombol (ekspor ditawarkan lebih dulu).
- Tidak masuk persentase global, tidak tersedia di Telegram, tidak bisa dibagikan ke Feed, tidak muncul di log sistem. Di Dashboard bisa disembunyikan.
- Status hukum "keyakinan beragama" sebagai kategori data menurut UU PDP perlu ditinjau reviewer hukum (§26). Sampai ada hasilnya, perlakukan sekuat data sensitif.

---

## 6. Aktivasi area dan fitur

**Tiga lapis agar sesuatu terlihat:** (1) rilis/flag/lisensi dari server, lalu (2) area dinyalakan pengguna, lalu (3) fitur di dalam area dinyalakan pengguna. Klien tidak menentukan lapis 1.

**Tidak bisa dimatikan:** Dashboard, Pengaturan, dan inti Kebiasaan. Kebiasaan adalah fondasi, bukan modul. Entri "Kebiasaan" di daftar Modul aktif Pengaturan sekarang dipindah menjadi bagian tetap.

**Dua sakelar per area:** **Aktif** (tab dan fitur tersedia) dan **Tampilkan di Dashboard** (kartu ringkasan). Pengguna bisa menyimpan area aktif tanpa kartunya.

**Efek mematikan area (atau fitur):**
| Hal | Perilaku |
|---|---|
| Tab dan menu mobile | Hilang |
| Kartu Dashboard dan aksi cepat | Hilang |
| Menu Telegram | Item area itu hilang |
| Data | **Tetap utuh**; terbaca di Riwayat dan ikut ekspor |
| Penulisan baru lewat web/API/bot | **Ditolak server** di area nonaktif |
| Mengaktifkan kembali | Semua kembali; jadwal habit lanjut sejak tanggal aktif |

**Dialog bila masih ada habit aktif di area/fitur itu** (memperluas v0.5 §7, yang hanya menawarkan "batal atau arsipkan"):
- **Jeda** (default): habit disembunyikan, **tidak terjadwal, tidak dihitung, dan tidak dianggap gagal** mulai tanggal efektif; lanjut otomatis saat diaktifkan kembali.
- **Arsipkan** habit terkait mulai tanggal efektif.
- **Batal**.

Jeda tidak membutuhkan status baru pada habit: ia **diturunkan** dari periode aktivasi (efektif-bertanggal). Habit terjadwal pada tanggal D hanya jika habit aktif **dan** area aktif pada D **dan** fitur aktif pada D. Tanggal sebelum perubahan tidak berubah.

**Urutan dan navigasi mobile (baseline):** pengguna bisa mengurutkan tab. Bilah bawah mobile = Dashboard + 3 tab pertama sesuai urutan pengguna + **"Lainnya"** (sheet berisi tab sisa, Riwayat, Pengaturan). Desktop menampilkan seluruh sidebar. Tidak ada fitur yang hilang di mobile/tablet (v0.5 §6).

**Onboarding:** minimal satu area dipilih. Setelah itu pengguna boleh mematikan semuanya (Dashboard tampil keadaan kosong).

Akun tanpa lisensi aktif tidak melihat area sama sekali (shell terbatas v0.5 §6). Pengaturan area tersimpan hanya setelah akses aktif.

---

## 7. Pengaturan

Pengaturan berubah dari satu halaman panjang menjadi **daftar bagian** (master–detail di desktop, daftar lalu halaman detail di mobile). **[B]**

| # | Bagian | Isi | Catatan |
|---|---|---|---|
| 1 | Profil | Nama panggilan, avatar huruf awal, email (ubah → reauth + verifikasi email baru, AC28) | Foto profil **[X]** |
| 2 | **Area & navigasi** | Sakelar Aktif + Tampilkan di Dashboard per area; fitur per area (daftar lipat); urutan tab; Spiritual "Segera hadir"; Feed muncul hanya bila flag server ON | Menggantikan "Modul aktif" |
| 3 | Tampilan | **Bahasa aplikasi** (Indonesia/English), tema (Terang/Gelap/Sistem), format jam 12/24, sembunyikan nominal | Awal minggu tetap Senin (v0.5 §8) |
| 4 | Zona waktu | Zona waktu | Catatan di layar: tidak menggeser tanggal log lama (AC13) |
| 5 | Kebiasaan | Daftar habit per area dengan status Aktif/Diarsipkan; pustaka template | Menggantikan "Kelola kebiasaan" |
| 6 | Pengingat | Placeholder "Segera hadir" | Kanal pengingat **[T]** (§14) |
| 7 | Integrasi | Telegram: kaitkan/lepas, pemberitahuan opt-in bahwa pesan melewati server Telegram (v0.5 §26) | |
| 8 | Akses & lisensi | Status akses, pesanan, grant | Pembelian belum dibuka |
| 9 | Keamanan | Ubah password (aturan §24), sesi aktif dan "keluar dari semua perangkat", MFA | MFA pengguna tahap berikutnya; admin/moderator/support wajib |
| 10 | **Privasi & data** | Persetujuan per modul (versi, tanggal, cabut), **ekspor data** (reauth), **hapus data per area**, **hapus akun** | Spiritual, Health, Financial dengan persetujuan terpisah |
| 11 | Sosial | Visibilitas default, daftar blokir | Hanya tampil bila Feed ON |
| 12 | Bantuan & tentang | Hubungi bantuan, kebijakan privasi, ketentuan layanan, versi, Keluar | |

**Akun terverifikasi belum berlisensi (shell terbatas, v0.5 §6):** hanya bagian Profil, Tampilan, Zona waktu, Akses & lisensi, Keamanan, Privasi & data (ekspor kosong tetap tersedia), Bantuan, Keluar.

**Hapus akun (alur):** Privasi & data → Hapus akun → penjelasan apa yang dihapus dan apa yang dipertahankan (bukti pembayaran sesuai retensi, riwayat chat Telegram tidak ikut terhapus) → tawaran **ekspor dulu** → reauth ≤5 menit → ketik konfirmasi → sesi dan bot dicabut, posting dihapus (v0.5 §15, AC22). Masa tenggang penghapusan **[T]**.

**Hapus data per area:** aksi terpisah per area (misal hapus seluruh data Spiritual). Ekspor ditawarkan lebih dulu, reauth diminta, hasilnya mengikuti retensi yang disetujui.

---

## 8. Alur utama

### 8.1 Onboarding produk (setelah akses aktif)
1. Sambutan, nama panggilan.
2. **Pilih area** (≥1). Spiritual tampil "Segera hadir"; Feed tidak ditawarkan di sini.
3. Persetujuan modul sensitif untuk area terpilih (Health, Financial). Menolak satu area **hanya menonaktifkan area itu**, tidak menghalangi yang lain (v0.5 §26).
4. **Paket awal per area (opsional):** daftar saran yang dicentang sendiri. Tidak dicentang berarti tidak ada yang dibuat.
5. Jika Financial dipilih: buat dompet pertama (saldo awal opsional; boleh dilewati, tetapi transaksi baru bisa dibuat setelah ada dompet).
6. Masuk Dashboard.

### 8.2 Memilih jenis tambahan: pohon keputusan untuk pengguna

| Yang ingin kulakukan | Pilih |
|---|---|
| Sesuatu yang kulakukan berulang dan ingin kucentang | **Kebiasaan/Rutinitas** |
| Aku harus hadir di waktu tertentu (kelas, rapat, ibadah mingguan) | **Jadwal** |
| Pekerjaan satu kali yang bisa selesai | **Tugas** |
| Mencatat sesuatu yang **sudah terjadi** (minum 250 ml, lari 30 menit, jajan Rp20.000) | **Catat aktivitas** (log) |
| Menulis ringkasan/perasaan hari ini | **Catatan harian** |

Tombol "+" di area manapun hanya menampilkan jenis yang relevan untuk area itu.

### 8.3 Hari biasa
Buka Dashboard → lihat kebiasaan dan kartu → centang atau catat → progres berubah **hanya setelah server mengonfirmasi** (v0.5 §14) → buka tab area bila perlu detail.

### 8.4 Siklus tugas
Buat (judul, deskripsi, tenggat, label) → muncul di tab dan kartu Dashboard saat jatuh tempo → ubah status selesai → tampil di Riwayat → bisa dibalikkan. Edit bersamaan → konflik ditampilkan, tidak ditimpa diam-diam.

### 8.5 Ganti semester / ganti shift
Jadwal lama: "Akhiri sampai tanggal X" → "Duplikat sebagai jadwal baru" → ubah → simpan. Kejadian lampau tidak berubah.

### 8.6 Mematikan area
Pengaturan → Area & navigasi → matikan → bila ada habit aktif, dialog tiga pilihan (§6) → tanggal efektif (default hari ini) → area hilang dari navigasi.

### 8.7 Spiritual (saat dirilis)
Buka tab → gerbang (§5.8) → paket awal → Hari ini. Ganti keyakinan dan hapus data tersedia di dalam tab.

### 8.8 Akses dicabut/ditangguhkan
Mengikuti v0.5 §4 dan §25. Semua area terkunci; hanya shell terbatas, ekspor, dan bantuan.

---

## 9. Privasi lintas area (matriks)

| Data | Riwayat | Dashboard | Snapshot Feed | Telegram | Moderator/Admin/Support | Log sistem |
|---|---|---|---|---|---|---|
| Habit (centang/jumlah/durasi) | Ya | Ya | Bila dipilih pengguna | Ya (kecuali Spiritual) | Tidak | Tanpa isi |
| Kesehatan (air, olahraga, tidur, fasting) | Ya | Ya | Jenis + angka bila dipilih | Air, olahraga, fasting | Tidak | Tanpa isi |
| Jurnal, rangkuman, catatan kerja | Ya | Hanya status "sudah/belum" | **Tidak** | **Tidak** | Tidak | **Tanpa isi** |
| Tugas/jadwal (Working, Education, Home) | Tugas selesai saja | Hitungan dan judul di Dashboard privat | Hanya hitungan | Tidak (rilis pertama) | Tidak | Tanpa judul/deskripsi |
| Keuangan | Ya | Ya | Hanya status | Pemasukan/pengeluaran | Tidak | Tanpa isi |
| **Spiritual** | Ya (bisa disembunyikan) | Hitungan (bisa disembunyikan) | **Tidak** | **Tidak** | Tidak | **Tanpa isi** |

Ekspor memuat semua data pengguna di semua area, termasuk area nonaktif. Penerapan RLS, kepemilikan FK, dan larangan baca admin mengikuti v0.5 §15 dan §25.

---

## 10. Perubahan data konseptual (delta ERD)

| Entitas baru/berubah | Isi dan invariant |
|---|---|
| `area_activation` | pemilik, kunci (area atau fitur dari registry kode), aktif/tidak, **tanggal efektif**, tampil di Dashboard, urutan. Efektif-bertanggal seperti `habit_rule_version`. Tidak ada kunci di luar registry. |
| Registry area/fitur | Kode (bukan tabel pengguna): kunci, induk, `release_stage` (live/beta/coming_soon), apakah sensitif/butuh consent |
| `habit` (diperluas) | + `area`, `start_time`, `duration_min`, `recurrence_type` + parameter (hari/N), `template_key` unik per pemilik di antara habit aktif |
| `event` + `event_exception` | Jadwal: area, waktu mulai/selesai, pengulangan, masa berlaku, label. Pengecualian per tanggal |
| `task` | Pemilik, area, judul, deskripsi, tenggat, status, `completed_at`, prioritas, label, versi, soft delete |
| `label` | Pemilik, area, nama; diarsipkan, tidak dihapus bila dirujuk |
| `daily_note` | Pemilik, area, jenis (reflection/study_summary/work_log), tanggal, isi; unik (pemilik, jenis, tanggal). Jenis reflection punya mood dan syukur |
| `sleep_session` | Pemilik, waktu tidur/bangun (UTC), zona waktu, tanggal lokal = tanggal bangun, durasi konsisten |
| `list` + `list_item` | Daftar belanja milik pengguna di area Home |
| `spiritual_profile` | Pemilik, keyakinan (atau "atur sendiri"), referensi persetujuan. Dikecualikan dari semua tampilan administratif |
| `religious_day` | Data sistem per tahun: keyakinan, nama, tanggal, **sumber**, tanggal verifikasi. Tidak ada tanpa sumber terverifikasi **[T]** |
| `consent_record` | Pemilik, tujuan (per modul), versi teks, status, waktu (v0.5 §26) |

Invariant: semua FK memastikan pemilik sama (task/event tidak boleh merujuk label pemilik lain); area pada task/event/label hanya dari himpunan yang diizinkan; tidak ada cascade generik yang menghapus ledger atau audit pembayaran. Konvensi waktu v0.5 §9 berlaku untuk log; jadwal memakai jam dinding (§4.2).

---

## 11. Dampak pada bagian v0.5

| Bagian v0.5 | Perubahan |
|---|---|
| §2 tabel topik, baris "Modul" | Diganti "Area dan fitur" (peta §3 dan §5) |
| §3 scope rilis | Tambah Working, Education (jadwal/tugas/rangkuman), Home, dan Spiritual (gelombang akhir). Perubahan scope perlu persetujuan pemilik (§13) |
| §6 navigasi | "Hari Ini" menjadi **Dashboard**; Riwayat menjadi sub-halaman; tab mobile mengikuti §6 baru; Pengaturan sesuai §7 |
| §7 modul dan habit | Habit memiliki area, waktu, dan pengulangan lebih luas; "nonaktif modul" menjadi aktivasi area/fitur dengan opsi **Jeda** |
| §10 feed | Tambahan aturan snapshot (§5.7); Spiritual tidak tersedia |
| §13 Telegram | Menu mengikuti area aktif; Spiritual, tugas, jadwal, jurnal, dan tidur tidak ada di bot rilis pertama |
| §14 mobile | Bilah bawah 5 slot dengan "Lainnya" |
| §16 ERD | Delta §10 |
| §20/§23 tahapan dan gerbang | §13 |
| §26 privasi | Consent per area; Spiritual masuk review hukum |
| AC08, AC09 | AC09 diperluas oleh AC39 |

---

## 12. Kriteria penerimaan tambahan

| ID | Skenario dan hasil |
|---|---|
| AC38 | Area nonaktif: tab, kartu Dashboard, aksi cepat, dan menu bot hilang; **penulisan ditolak server** lewat web/API/bot; data tetap terbaca di Riwayat dan ikut ekspor; aktif kembali memulihkan semuanya |
| AC39 | Mematikan area/fitur yang punya habit aktif menampilkan pilihan Batal/Jeda/Arsipkan. Pada Jeda, hari dalam rentang jeda tidak menghitung habit itu dan tidak menandainya gagal; riwayat sebelumnya tidak berubah; aktif kembali melanjutkan jadwal |
| AC40 | Angka kartu Dashboard identik dengan halaman areanya untuk tanggal yang sama; Dashboard tidak menulis data selain lewat aksi domain yang sama dengan halaman area |
| AC41 | Persentase progres hanya menghitung habit terjadwal (bukan tugas, jadwal, maupun Spiritual); hari tanpa jadwal menampilkan pesan netral |
| AC42 | Pengulangan harian, hari tertentu, dan tiap N hari menghasilkan hari terjadwal yang benar; perubahan jadwal tidak mengubah tanggal lampau |
| AC43 | Edit jadwal "Seterusnya" tidak mengubah kejadian lampau; pengecualian per tanggal berlaku; jadwal tidak muncul di Riwayat sebagai kejadian; jam dinding tetap saat zona waktu diganti |
| AC44 | Tugas: status dan deskripsi bisa diubah dan dibalikkan; selesai muncul di Riwayat pada tanggal lokal selesai; "lewat tenggat" turunan; edit bersamaan menghasilkan konflik jelas; tugas/label pengguna lain tidak bisa dibaca atau ditautkan |
| AC45 | Rangkuman belajar satu per tanggal; retry tidak menduplikasi; terbaca hanya pemiliknya |
| AC46 | Tidur lintas tengah malam dibukukan ke tanggal bangun dengan durasi benar; ganti zona waktu tidak menggeser tanggal historis |
| AC47 | Spiritual belum dirilis: rute/API ditolak. Setelah dirilis: tanpa persetujuan tidak ada data tersimpan; ganti keyakinan tidak menghapus data tanpa pilihan eksplisit; hapus data Spiritual menghapus tuntas dan ekspor lebih dulu memuatnya |
| AC48 | Isi Spiritual, jurnal, rangkuman, dan deskripsi tugas tidak ada di log sistem, tidak terbaca moderator/admin/support, tidak masuk snapshot Feed, tidak tersedia di bot |
| AC49 | Template yang sudah aktif diperingatkan agar tidak dobel; memindahkan habit antar-area tidak mengubah progres atau riwayat |
| AC50 | Hapus data per area dan hapus akun: reauth, ekspor ditawarkan, sesi/bot dicabut, hasil sesuai retensi |
| AC51 | Pengaturan (bahasa, tema, zona waktu, area, urutan tab) tersimpan dan berlaku lintas perangkat; shell akun belum berlisensi hanya menampilkan bagian yang diizinkan; bilah mobile 5 slot tidak menghilangkan akses ke area manapun |
| AC52 | Tab Feed hanya tampil bila flag server ON **dan** pengguna opt-in; sakelar klien tidak bisa membuka akses |
| AC53 | "Catat sebagai pengeluaran" dari daftar belanja tidak membuat transaksi tanpa konfirmasi pengguna |

---

## 13. Tahapan dan gerbang

Perluasan scope ini besar (jadwal dan tugas hampir setara aplikasi perencana). Urutan yang disarankan agar biaya tidak berlipat:

| Gelombang | Isi | Catatan |
|---|---|---|
| **A** (fase 4–5) | Registry area, `area_activation`, Pengaturan baru, Dashboard shell, **Health** (migrasi dari WorkOut), **Financial**, Education bagian Sesi belajar | Mengubah apa yang sudah ada menjadi struktur baru |
| **B** (fase 5) | **Bangun sekali** primitive Jadwal, Tugas, Label, Catatan di **Education**, lalu pakai ulang di **Working** dan **Home** | Working dan Home murah jika primitive sudah matang |
| **C** | **Spiritual** | Syarat: persetujuan, review hukum, reviewer konten tiap keyakinan, putusan §14 |
| **D** (fase 6, 7B) | **Feed** dan moderasi | Tetap di balik flag (v0.5 §23) |

Beta tertutup fase 7 yang diusulkan: gelombang A + B; Spiritual dan Feed **OFF**. Ini mengubah tabel §23 v0.5, sehingga membutuhkan persetujuan pemilik. Estimasi ulang pekerjaan dibutuhkan sebelum fase dikunci.

Dokumen turunan (urutan): perbarui ERD → design.md (sidebar 8 tab, mobile "Lainnya", kartu Dashboard, Pengaturan master–detail, keadaan "Segera hadir") → AGENTS.md (registry area, aturan penulisan area nonaktif, larangan log isi sensitif).

---

## 14. Keputusan yang masih terbuka

1. **Konfirmasi baseline:** Spiritual tidak masuk % global dan tidak tersedia di bot; tidur dibukukan ke tanggal bangun; Dashboard menyembunyikan nominal opsional; bilah mobile 4 slot + "Lainnya".
2. **Label tab final** (Indonesia/Inggris) dan konsistensi bahasa sidebar.
3. **Kanal pengingat.** v0.5 menunda push/email/Telegram reminder; Home, Spiritual, dan Working jauh kurang bernilai tanpa pengingat. Perlu putusan kanal (in-app saja, Telegram, email, atau push), biaya, dan consent sebelum gelombang B/C.
4. **Sumber waktu salat dan hari besar**: input manual, API pihak ketiga, atau perhitungan internal; konsekuensi lokasi dan consent; sumber kalender yang diakui.
5. **Paket awal tiap keyakinan:** perlu reviewer. Hanya Islam dan Kristen/Katolik yang punya contoh awal di dokumen ini; sisanya jangan dibuat tanpa narasumber.
6. **Status hukum data keyakinan** di bawah UU PDP (reviewer hukum, §26).
7. **Masa tenggang penghapusan akun** dan retensi.
8. **Tugas:** apakah v1 perlu prioritas, sub-tugas, atau status "sedang dikerjakan".
9. **Pengulangan:** "tiap N hari sejak terakhir selesai", bulanan, dan minggu ganjil/genap.
10. **Penamaan label tab dan aksi** "Catat aktivitas" vs "+" agar tidak membingungkan.

---

## 15. Pemetaan UI saat ini → struktur baru

| Sekarang | Menjadi |
|---|---|
| Sidebar: Dashboard, Financial, Feed, WorkOut, Working, Education | Dashboard, Financial, **Health** (rename WorkOut), Working, Education, **Home** (baru), Feed (flag), Spiritual (segera hadir) |
| Dashboard: Kebiasaan hari ini, "+", Catat aktivitas, Riwayat semua aktivitas | Tetap. Tambah kartu per area; "+" = kebiasaan, "Catat aktivitas" = log |
| Dashboard: kartu Asupan air | Bagian kartu Health (aksi +250 ml tetap) |
| Dashboard: kartu Keuangan | Kartu Financial |
| Pengaturan › Profil (Nama, Zona waktu) | Profil + Zona waktu (bagian terpisah) |
| Pengaturan › Tampilan (Bahasa, Tema) | Tetap, ditambah format jam dan sembunyikan nominal |
| Pengaturan › Modul aktif | **Area & navigasi.** Kebiasaan = inti tetap. Olahraga/Air/Fasting/Refleksi → Health. Belajar → Education. Keuangan → Financial |
| Pengaturan › Kelola kebiasaan | Bagian Kebiasaan |
| Pengaturan › Akses & integrasi | Dipecah: Integrasi (Telegram) dan Akses & lisensi |
| Pengaturan › Privasi & data (Ekspor data) | Diperluas: persetujuan, hapus data per area, hapus akun |
| (belum ada) | Keamanan, Pengingat, Sosial, Bantuan & tentang |