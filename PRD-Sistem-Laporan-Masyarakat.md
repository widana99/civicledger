# PRODUCT REQUIREMENT DOCUMENT (PRD)
# CivicLedger: Sistem Informasi Laporan Infrastruktur & Lingkungan Kota (Smart City Civic Tech)

**Versi Dokumen:** 2.0 (Comprehensive Multi-Platform Edition)  
**Status:** Living Document / Production-Ready Reference  
**Platform:** Web Application (React 18 + Vite + TypeScript) & Mobile Application (Flutter Dart for Android/iOS)  
**Backend & Database:** Supabase (PostgreSQL 15+, Row Level Security, Realtime Engine, Storage, Edge Triggers)  
**Author & Lead Architect:** Gino Putra Widana  

---

## 1. Executive Summary & Product Vision

### 1.1 Latar Belakang Masalah
Di wilayah perkotaan modern, degradasi infrastruktur fisik (jalan berlubang, lampu jalan padam, jembatan rusak) dan masalah lingkungan hidup (tumpukan sampah liar, saluran drainase tersumbat, pencemaran air) seringkali lambat ditangani karena adanya *gap komunikasi* antara warga dengan pemerintah daerah. Keluhan masyarakat umumnya tersebar di media sosial tanpa koordinat presisi, tanpa kepastian tindak lanjut, dan rawan terjadinya duplikasi laporan berulang untuk satu titik masalah yang sama. Di sisi birokrasi, dinas teknis kesulitan mendisposisikan tugas secara akurat kepada petugas lapangan yang memiliki spesialisasi dan wilayah tugas yang relevan, serta kekurangan alat pemantauan berbasis lokasi (*realtime field tracking*).

### 1.2 Visi & Solusi Produk: CivicLedger
**CivicLedger** hadir sebagai platform *Smart City Civic Tech* terpadu berbasis *open-ledger* dan data geospasial real-time yang menjembatani **Masyarakat (Warga)**, **Administrator Command Center Pemkot**, dan **Petugas Tanggap Lapangan (Field Officers)**. 
- Bagi **Masyarakat**, CivicLedger menyediakan kanal pelaporan transparan dengan pelacakan status kronologis berbasis nomor tiket resmi, verifikasi foto/video, deteksi duplikasi radius 100m, serta jaminan perlindungan identitas (opsi anonim).
- Bagi **Administrator Pemkot**, CivicLedger berfungsi sebagai *Executive Command Center* dengan analitik telemetri kota real-time, sistem disposisi tugas cerdas berdasarkan spesialisasi dinas, deteksi dini eskalasi SLA (*overdue reports*), serta monitoring absensi GPS petugas.
- Bagi **Petugas Lapangan**, CivicLedger menyediakan aplikasi mobile native (Flutter) berstandar industri dengan autentikasi biometrik, presensi geofencing GPS, integrasi navigasi instan (Google Maps/Waze), alur kerja validasi foto/video sebelum-dan-sesudah, serta saluran komunikasi posko darurat.

---

## 2. Arsitektur Sistem & Ekosistem Multi-Platform

CivicLedger dirancang dengan arsitektur multi-klien modern yang saling terhubung melalui satu *Unified Database & BaaS Core* (Supabase).

```
                      +------------------------------------------+
                      |         CIVICLEDGER ECOSYSTEM            |
                      +------------------------------------------+
                                           |
      +------------------------------------+-----------------------------------+
      |                                                                        |
      v                                                                        v
+------------------------------------+               +------------------------------------+
|        CIVICLEDGER WEB             |               |      CIVICLEDGER FIELD APP         |
|   (React 18 + Vite + TS + PWA)     |               |    (Flutter Dart - Mobile Native)  |
|------------------------------------|               |------------------------------------|
| - Portal Publik & Landing Page     |               | - Autentikasi Biometrik (Face/Touch|
| - GIS Map Interaktif (Leaflet)     |               | - Presensi GPS Real-Time           |
| - Citizen Dashboard & Pelaporan    |               | - Manajemen Tugas Disposisi        |
| - Algoritma Deteksi Radius 100m    |               | - Deep Link Navigasi (G-Maps/Waze) |
| - Open Data & Statistik Publik     |               | - Upload Bukti Foto & Video Hasil  |
| - Admin Command Center & Analytics |               | - Radar Peta Lapangan Mobile       |
| - Manajemen Roster, Wilayah, User  |               | - Posko Quick Chat (Realtime FAB)  |
+------------------------------------+               +------------------------------------+
                   \                                             /
                    \                                           /
                     v                                         v
         +---------------------------------------------------------------+
         |                  SUPABASE BACKEND CLOUD / BAAS                |
         |---------------------------------------------------------------|
         | • PostgreSQL 15+ with PostGIS Geolocation Extension           |
         | • Row Level Security (RLS) Policies per Role Access          |
         | • Supabase Realtime Replication Engine (WebSockets)           |
         | • Storage Buckets (reports, completion_proofs, avatars)       |
         | • PostgreSQL Triggers & Stored Procedures (Event Notifier)    |
         | • Firebase Cloud Messaging (FCM Push Notifications)           |
         | • Transactional SMTP / Resend Integration for Citizen Emails  |
         +---------------------------------------------------------------+
```

---

## 3. Matriks Peran Pengguna (Role-Based Access Control / RBAC)

CivicLedger menerapkan otorisasi ketat berbasis peran (*Role-Based Access Control*) pada tingkat database via PostgreSQL Row Level Security (RLS) dan routing guards pada frontend:

| Fitur / Kemampuan | Publik (Guest) | Masyarakat (Warga) | Petugas Lapangan | Admin Pemkot |
|---|:---:|:---:|:---:|:---:|
| Akses Landing Page & Informasi Kota | ✅ | ✅ | ✅ | ✅ |
| Peta Geospasial Publik & Filter Wilayah | ✅ (View only) | ✅ (View & Click) | ✅ | ✅ (Full GIS) |
| Statistik Publik & Tingkat Penyelesaian | ✅ | ✅ | ✅ | ✅ (Full Drilldown) |
| Registrasi Akun Mandiri | ✅ | ✅ (Instant Active) | ✅ (Needs Admin Approval) | ❌ (Pre-provisioned) |
| Membuat Laporan Masalah Baru | ❌ (Redirect Login) | ✅ (Foto + Video + GPS) | ❌ | ✅ (Test/Direct) |
| Pelaporan Mode Anonim | ❌ | ✅ | ❌ | ❌ |
| Deteksi Duplikasi Radius 100m | ❌ | ✅ | ❌ | ❌ |
| Upvote / Dukung Laporan Warga Lain | ❌ | ✅ | ❌ | ❌ |
| Menambahkan Komentar Diskusi | ❌ | ✅ | ✅ (Tugas Terkait) | ✅ (Semua Laporan) |
| Memberikan Rating Bintang 1–5 & Ulasan | ❌ | ✅ (Hanya Pembuat Tiket) | ❌ | ❌ |
| Akses Dashboard Pribadi & Riwayat Tiket | ❌ | ✅ | ❌ | ❌ |
| Akses Mobile Field App (Flutter) | ❌ | ❌ | ✅ | ❌ |
| Presensi Harian GPS + Biometrik | ❌ | ❌ | ✅ | ❌ |
| Menerima & Mengubah Status Tugas | ❌ | ❌ | ✅ (Diproses/Selesai) | ✅ (Full Override) |
| Unggah Bukti Penanganan (Foto & Video) | ❌ | ❌ | ✅ (Wajib) | ✅ |
| Posko Direct Chat Darurat | ❌ | ❌ | ✅ (To Admin) | ✅ (To Officers) |
| Verifikasi & Penolakan Laporan (Wajib Alasan) | ❌ | ❌ | ❌ | ✅ |
| Disposisi Penugasan Petugas Lapangan | ❌ | ❌ | ❌ | ✅ |
| Manajemen Wilayah (Kecamatan/Kelurahan) | ❌ | ❌ | ❌ | ✅ |
| Manajemen Akun Pengguna & Aktivasi Petugas | ❌ | ❌ | ❌ | ✅ |
| Export Data Rekapitulasi (PDF & Excel) | ❌ | ❌ | ❌ | ✅ |

---

## 4. Spesifikasi Fungsional: Platform Web (`CivicLedger Web`)

### 4.1 Portal Publik & Landing Page (`/`)
1. **Hero Header & Dynamic Theme Engine:**
   - Visualisasi bertema *Civic Tech* modern (Deep Navy `#0B132B`, Amber Gold `#D4A843`, Slate, Emerald).
   - Dukungan Dark Mode dan Light Mode yang tersinkronisasi via `ThemeContext` dan `localStorage`.
   - 3D Visual Asset Integration (Spline Scene) & Background Video overlay opsional.
2. **Tab Eksplorasi Nilai Produk:**
   - **SYS-01 Transparansi & Audit Terbuka:** Penjelasan buku besar terbuka (*public ledger*), pelacakan kronologis, dan integritas data anti-manipulasi.
   - **SYS-02 Keunggulan Geospasial AI:** Penjelasan akurasi GPS, klasterisasi titik insiden, dan algoritma pencegah laporan ganda.
   - **SYS-03 Armada Tanggap Lapangan:** Penjelasan kesiapan armada lapangan dengan aplikasi mobile, navigasi terpadu, dan pertanggungjawaban visual.
3. **Live Telemetry Strip:**
   - Menampilkan total laporan masuk, persentase penyelesaian kota (*city-wide resolution rate*), dan rata-rata durasi penanganan secara live dari Supabase.
4. **Pita Kategori Cepat (Pill Filter):**
   - Filter cepat kategori: Infrastruktur Jalan, Kebersihan Kota, Lingkungan Hidup, Fasilitas Umum, Keamanan.
5. **Ticker Laporan Terkini:**
   - Menampilkan kartu tiket (*ticket card*) laporan masyarakat yang baru saja masuk secara real-time.

---

### 4.2 Peta Geospasial Interaktif & Heatmap (`/map`)
1. **Peta Digital Terintegrasi (Leaflet & OpenStreetMap):**
   - Menampilkan seluruh marker insiden kota dengan koordinat GPS valid.
   - Warna marker mencerminkan status laporan (*Pending* = Kuning, *Verified* = Biru, *Assigned/In Progress* = Teal, *Completed* = Hijau, *Rejected* = Merah).
2. **Mode Lapisan Heatmap (Heatmap Overlay Toggle):**
   - Mengubah tampilan marker individual menjadi intensitas sebaran kerapatan masalah (*density heatmap*) untuk identifikasi zona merah (*hotspots*).
3. **Filter Geospasial Multi-Dimensi:**
   - Filter Status (Semua, Menunggu Verifikasi, Terverifikasi, Ditugaskan, Diproses, Selesai).
   - Filter Kategori Masalah (Infrastruktur, Lingkungan, Kebersihan, Pelayanan Publik, Keamanan).
   - Filter Wilayah Administratif (Kecamatan / Kelurahan).
   - Filter Rentang Waktu Terstruktur (`DateTimeFilter`: 24 jam terakhir, 7 hari, 30 hari, kustom).
   - Pencarian Berdasarkan Kata Kunci (Judul, Nomor Tiket, atau Alamat).
4. **Interaksi Marker & Quick Preview Card:**
   - Klik marker membuka *bottom sheet / popup card* dengan informasi tiket, foto thumbnail, kategori, alamat, status, dan tombol menuju Detail Laporan Lengkap.
5. **Sinkronisasi Data Real-Time:**
   - Berlangganan langsung ke Supabase Realtime Channel (`realtime:map_reports`). Penambahan atau pembaruan status laporan otomatis menggerakkan/memperbarui marker tanpa reload halaman.

---

### 4.3 Portal Warga: Formulir Pelaporan Masalah (`/app/create-report`)
1. **Identitas & Deskripsi Insiden:**
   - **Judul Laporan:** Maksimal 100 karakter, teks ringkas inti masalah.
   - **Kategori Masalah:** Pilihan radio/card:
     - `infrastruktur` (Jalan rusak, jembatan, trotoar, lampu PJU mati)
     - `lingkungan` (Pohon tumbang, banjir, saluran air meluap, polusi)
     - `kebersihan` (Sampah liar menumpuk, TPS overload, limbah)
     - `pelayanan` (Kerusakan fasilitas taman kota, halte, rambu)
     - `keamanan` (Penerangan minim rawan kriminal, fasilitas umum dirusak)
     - `lainnya`
   - **Deskripsi Detail:** Penjelasan kronologis dan kondisi fisik di lokasi.
   - **Rekomendasi Prioritas Otomatis:** Sistem merekomendasikan tingkat prioritas default berdasarkan kategori (`keamanan` -> *high*, `infrastruktur` -> *medium*, dst.), yang dapat disesuaikan oleh pelapor dan dikoreksi oleh admin.
   - **Estimasi Waktu SLA:** Sistem menampilkan proyeksi batas waktu penyelesaian resmi sesuai standar dinas terkait.
2. **Pemilihan Lokasi Presisi (Geotagging):**
   - **Deteksi Otomatis Browser Geolocation:** Tombol "Gunakan Lokasi Saya Saat Ini" mengambil koordinat akurat perangkat.
   - **Map Pin Picker:** Pin interaktif yang dapat digeser di atas peta Leaflet untuk menentukan titik exact insiden.
   - **Input Alamat & Wilayah:** Pilihan dropdown wilayah administrasi (Kecamatan/Kelurahan) untuk pemetaan ke dinas penanggung jawab.
3. **Bukti Multimedia (Foto & Video):**
   - **Multi-Photo Upload:** Mendukung hingga 5 foto kondisi fisik.
   - **Kompresi Gambar Sisi Klien:** Foto otomatis dikompresi sebelum diunggah (`compressImage`) untuk menghemat kuota dan mempercepat transmisi.
   - **Video Bukti Insiden:** Mendukung unggah 1 klip video (format MP4/WebM/MOV) durasi pendek untuk menangkap dinamika masalah (mis. air meluap, tiang goyang).
4. **Mode Laporan Anonim:**
   - Switch toggle "Laporkan Secara Anonim": Bila aktif, identitas nama pelapor disembunyikan dari tampilan publik (`is_anonymous = true`), namun pelapor tetap dapat memantau riwayat di akun pribadinya.
5. **Algoritma Pencegah Laporan Ganda (Duplicate Detection Engine - Radius 100m):**
   - Saat pelapor menentukan pin lokasi dan kategori, sistem menjalankan kalkulasi geospasial (Haversine Formula / PostGIS) mencari laporan aktif berkategori serupa dalam radius **100 meter**.
   - Jika ditemukan laporan serupa, sistem memunculkan **Modal Deteksi Duplikasi** yang menampilkan daftar laporan terkait di titik tersebut, jarak meter dari pelapor, dan tombol **"Dukung Laporan Ini (Upvote)"** sebagai alternatif cerdas daripada membuat tiket ganda yang membebani petugas.
   - Pelapor tetap memiliki hak untuk melanjutkan pelaporan jika insiden memang berbeda.
6. **Proteksi Bot & Sanitasi Keamanan:**
   - **Honeypot Form Field:** Field tak kasat mata untuk menjebak bot spam otomatis.
   - **Input Sanitization & Rate Limiter:** Sanitasi string berbahaya (mencegah XSS) dan pembatasan frekuensi pengiriman formulir per interval menit.

---

### 4.4 Halaman Detail Laporan & Interaksi Sosial (`/reports/:id`)
1. **Format Tiket Resmi & Identitas Laporan:**
   - Kode Tiket Unik (`ticket_id` format resmi, mis. `CVL-2026-XXXX`).
   - Badge Status, Badge Kategori, dan Badge Prioritas dengan warna semantik terstandarisasi.
2. **Dual-View Adaptation:**
   - **Owner View:** Khusus pemilik laporan (menampilkan opsi batalkan laporan bila masih pending, feedback rating form setelah selesai, dan status alert).
   - **Public View:** Menampilkan informasi umum, tombol Upvote warga, peta lokasi, dan kolom diskusi publik.
3. **Audit Trail Kronologis (Status Timeline Log):**
   - Menampilkan riwayat perjalanan laporan langkah-demi-langkah: waktu dibuat -> diverifikasi admin -> ditugaskan ke petugas -> mulai dikerjakan -> selesai.
   - Setiap tahapan mencatat nama penanggung jawab, timestamp resmi, dan catatan eksekusi.
4. **Galeri Bukti & Before-After Slider:**
   - Menampilkan foto dan video laporan awal warga.
   - Jika laporan telah berstatus "Selesai", ditampilkan foto bukti penanganan dari petugas lapangan lengkap dengan komponen **Before vs After Image Comparison Slider** interaktif.
5. **Fitur Sosial & Transparansi Komunitas:**
   - **Upvote Button:** Tombol dukungan masyarakat satu akun satu suara untuk mendorong urgensi laporan.
   - **Thread Komentar & Diskusi Publik:** Kolom komentar interaktif untuk memberikan informasi terkini atau klarifikasi antar-warga dan instansi.
   - **Rating & Evaluasi Warga:** Setelah tiket selesai, pelapor asli dapat memberikan skor bintang 1–5 dan ulasan kualitatif atas kinerja petugas lapangan.

---

### 4.5 Portal Warga: Dashboard & Riwayat Laporan (`/app/dashboard` & `/app/my-reports`)
1. **Statistik Personal Warga:**
   - Ringkasan total laporan saya, laporan sedang diproses, dan laporan berhasil diselesaikan.
2. **Status Singkat Infrastruktur Kota:**
   - Widget ringkas persentase resolusi masalah di kota.
3. **Mini Radar Map:**
   - Peta mini yang menampilkan titik-titik laporan di sekitar tempat tinggal pengguna.
4. **Daftar Laporan Saya:**
   - Daftar tiket milik pengguna dengan filter status (Semua, Aktif, Selesai, Ditolak), pencarian, dan tautan langsung ke detail tiket.

---

### 4.6 Pusat Notifikasi Terpadu (`/app/notifications`)
1. **Kategori Notifikasi Otomatis:**
   - `status_change`: Perubahan status tiket (mis. diverifikasi, diproses, selesai).
   - `assignment`: Laporan diteruskan ke petugas teknis dinas tertentu.
   - `comment`: Tanggapan baru dari petugas atau warga pada tiket yang dipantau.
   - `escalation`: Notifikasi peringatan keterlambatan penanganan SLA.
   - `system`: Pengumuman pemeliharaan sistem atau persetujuan akun.
2. **Aksi & Manajemen Notifikasi:**
   - Filter berdasarkan tipe notifikasi.
   - Tombol "Tandai Semua Sudah Dibaca" (*Mark all as read*).
   - Klik notifikasi langsung membuka halaman laporan atau sub-menu terkait.

---

### 4.7 Portal Statistik Publik & Eksekutif (`/stats`)
1. **Mode Tampilan Warga (Citizen Transparency View):**
   - Ringkasan laporan masuk vs selesai.
   - Grafik distribusi kategori masalah terbanyak.
   - Indeks kepuasan warga (*Average Rating Score*) dan distribusi bintang 1–5.
   - Peringkat responsivitas per wilayah kecamatan/kelurahan.
2. **Mode Tampilan Eksekutif (Admin Executive View):**
   - Analitik tren laporan harian dan bulanan (*Recharts Area Chart*).
   - Metrik rata-rata durasi penyelesaian (*Mean Time to Resolution / MTTR*) dalam hitungan hari/jam.
   - Matriks beban kerja dan kinerja petugas per dinas.
   - Fitur **Export Statistik ke PDF Resmi** (dengan kop dokumen, ringkasan eksekutif, dan tabel agregat) serta **Export Data ke Excel/CSV**.

---

### 4.8 Dashboard Eksekutif Admin (`/app/admin`)
1. **KPI Metric Cards:**
   - Total Laporan Terdaftar
   - Menunggu Verifikasi (*Pending*)
   - Sedang Ditangani (*Assigned & In Progress*)
   - Berhasil Selesai (*Completed*)
   - Laporan Ditolak (*Rejected*)
   - Tingkat Keberhasilan (*Completion Rate %*)
   - Rata-Rata Durasi Penanganan (*Avg Resolution Days*)
   - **Laporan Ter-eskalasi (Overdue / SLA Breach):** Laporan pending yang melampaui batas 3 hari tanpa respon.
2. **Visualisasi Data Dinamis (Recharts):**
   - Area chart tren volume laporan masuk vs selesai.
   - Pie chart proporsi status laporan.
   - Bar chart beban kasus per kategori infrastruktur.
3. **Urgent Reports Queue:**
   - Widget antrean darurat yang memprioritaskan laporan berkategori prioritas *Urgent* dan *High* untuk tindakan cepat verifikator.

---

### 4.9 Manajemen & Verifikasi Laporan Admin (`/app/admin/reports` & `/app/admin/reports/:id`)
1. **Tabel Laporan Komprehensif:**
   - Pencarian real-time berdasarkan nomor tiket, judul, alamat, atau nama pelapor.
   - Multi-filter: Status, Kategori, Rentang Tanggal (`DateTimeFilter`), Prioritas, dan Toggle khusus "Hanya Laporan Ter-eskalasi".
   - Sorting berdasarkan Terkini, Terlama, dan Tingkat Urgensi.
   - Pagination server/client-side yang mulus.
   - Tombol **Export Data ke CSV** dan **Export Data ke Excel Formatted**.
2. **Mesin Verifikasi & Disposisi Petugas (`AdminReportDetailPage`):**
   - **Tindakan Verifikasi:** Mengubah status dari `pending` menjadi `verified`.
   - **Tindakan Penolakan:** Membuka modal penolakan dengan kewajiban mengisi alasan penolakan secara tertulis (`rejected_reason`). Status berubah menjadi `rejected`.
   - **Koreksi Kategori & Prioritas:** Admin dapat merevisi kategori atau menaikkan level urgensi menjadi `urgent`.
   - **Modal Cerdas Penugasan Petugas (Intelligent Dispatch Modal):**
     - Menampilkan daftar petugas yang aktif.
     - Menyaring petugas berdasarkan **kecocokan wilayah** (wilayah kerja sama dengan lokasi laporan) dan **spesialisasi kategori** (mis. petugas Dinas Bina Marga untuk laporan infrastruktur jalan).
     - Menampilkan indikator **beban kerja aktif** (berapa tugas yang sedang dikerjakan masing-masing petugas) agar beban kerja merata (*workload balancing*).
     - Saat petugas dipilih dan di-assign, status tiket otomatis berpindah ke `assigned`, timestamp dicatat, dan petugas menerima notifikasi instan.
   - **Pengiriman Notifikasi Email Otomatis:** Integrasi trigger pengiriman email konfirmasi status ke pelapor saat status tiket diperbarui.

---

### 4.10 Manajemen Petugas Lapangan Admin (`/app/admin/petugas`)
Halaman ini dibagi menjadi 3 tab fungsional berdaya guna tinggi:
1. **Tab Roster Petugas:**
   - Direktori seluruh petugas dinas teknis terdaftar.
   - Pengaturan Wilayah Penugasan (Kecamatan/Kelurahan).
   - Pengaturan Tag Spesialisasi Kategori (Infrastruktur, Lingkungan, Kebersihan, Keamanan, Pelayanan).
   - Metrik Kinerja Petugas: Total tugas selesai, rata-rata skor bintang dari warga, dan jumlah tugas aktif saat ini.
   - Switch status aktif / non-aktif petugas.
2. **Tab Presensi GPS Realtime (Live Attendance Monitoring):**
   - Rekam jejak absensi harian seluruh petugas lapangan secara live.
   - Menampilkan tipe presensi: Absen Masuk (`check_in`), Mulai Istirahat (`break_start`), Selesai Istirahat (`break_end`), Absen Pulang (`check_out`).
   - Status ketepatan waktu: Tepat Waktu (`on_time`) vs Terlambat (`late`).
   - Metode otentikasi: Biometrik Sidik Jari/Wajah (`biometric`) vs Manual.
   - Titik koordinat lintang & bujur GPS serta alamat reverse-geocoded saat presensi dilakukan.
3. **Tab Posko Direct Chat (Saluran Komando Cepat Realtime):**
   - Saluran obrolan langsung dua arah antara Admin Posko dengan Petugas Lapangan.
   - Kategori pesan: Kendala Lapangan, Kebutuhan Alat/Material, Pertanyaan Laporan, Kondisi Darurat, atau Informasi Umum.
   - Indikator status dibaca (*Read Receipts* / `is_read`) dan penanda bendera darurat (*Flagged Emergency*).

---

### 4.11 Manajemen Wilayah & Pengguna (`/app/admin/wilayah` & `/app/admin/users`)
1. **Manajemen Wilayah Administratif (`/app/admin/wilayah`):**
   - Tambah, edit, dan hapus data wilayah (Kecamatan & Kelurahan).
   - Penomoran kode unik wilayah untuk standarisasi disposisi.
2. **Manajemen Pengguna & Otoritas (`/app/admin/users`):**
   - Daftar seluruh akun pengguna (Masyarakat, Petugas, Admin).
   - Fitur perubahan Role pengguna.
   - Fitur aktivasi / suspensi akun pengguna.
   - **Aktivasi Akun Petugas Baru:** Memvalidasi akun petugas yang baru mendaftar mandiri sebelum mereka dapat login dan bertugas di lapangan.

---

## 5. Spesifikasi Fungsional: Mobile Field App (`CivicLedger Field App`)

Aplikasi mobile didesain khusus menggunakan **Flutter (Dart)** dengan target platform Android & iOS, mengedepankan performa native, keandalan offline, konsumsi baterai efisien, dan antarmuka ergonomis untuk petugas yang bekerja di luar ruangan (*outdoor daylight readability*).

### 5.1 Onboarding, Autentikasi & Keamanan Perangkat
1. **Registrasi Petugas Mandiri:**
   - Input Nama Lengkap, Email Dinas, Nomor WhatsApp/Telepon, Kata Sandi.
   - Pemilihan Instansi / Dinas Asal:
     - Dinas Pekerjaan Umum & Penataan Ruang (PUPR)
     - Dinas Lingkungan Hidup & Kebersihan (DLH)
     - Dinas Pemadam Kebakaran & Penyelamatan
     - Dinas Perhubungan (Dishub)
     - PT Perusahaan Listrik Negara (PLN)
     - Satuan Polisi Pamong Praja (Satpol PP)
2. **Gerbang Verifikasi Akun (`PendingApprovalScreen`):**
   - Setelah registrasi, akun berstatus `is_active = false`.
   - Petugas diarahkan ke layar tunggu persetujuan (*Pending Approval*) hingga Administrator mengonfirmasi keaslian identitas pegawai.
3. **Autentikasi Biometrik 1-Ketukan (Touch ID / Face ID):**
   - Integrasi `local_auth` dan `flutter_secure_storage`.
   - Setelah login pertama, petugas dapat mengaktifkan login biometrik.
   - Login harian dapat dilakukan dalam 1 detik dengan pemindaian sidik jari atau wajah tanpa mengetikkan kata sandi.

---

### 5.2 Sistem Presensi GPS Geofencing (`AttendanceScreen`)
1. **Siklus Presensi Harian 4-Tahap:**
   - **Absen Masuk (`check_in`):** Jam masuk kerja (otomatis mendeteksi status *Late* jika melewati toleransi jam dinas).
   - **Mulai Istirahat (`break_start`) & Selesai Istirahat (`break_end`):** Mencatat jeda istirahat petugas.
   - **Absen Pulang (`check_out`):** Mengakhiri shift kerja harian.
2. **Validasi Lokasi & Sensor Perangkat:**
   - Membaca koordinat GPS akurasi tinggi via `geolocator`.
   - Reverse-geocoding alamat lokasi presensi.
   - Verifikasi biometrik langsung saat menekan tombol presensi untuk memastikan keabsahan kehadiran petugas bersangkutan.
3. **Sinkronisasi Realtime ke Posko:**
   - Presensi yang berhasil langsung memicu notifikasi real-time ke Dashboard Admin Posko (`officer_attendance`).

---

### 5.3 Struktur 5 Tab Utama Navigasi Aplikasi

```
[ BOTTOM NAVIGATION BAR - FIELD APP ]
(1) Tugas Saya  |  (2) Pantau Kota  |  (3) Radar Live  |  (4) Riwayat Selesai  |  (5) Profil Petugas
```

#### Tab 1: Tugas Saya (`TaskListTab`)
- Menampilkan seluruh tiket laporan warga yang di-disposisikan oleh Admin kepada petugas bersangkutan.
- Filter tab cepat: **Semua Tugas**, **Perlu Ditangani** (`assigned`), dan **Sedang Dikerjakan** (`in_progress`).
- Indikator Visual Kartu Tugas:
  - Label Prioritas (*Urgent*, *High*, *Medium*, *Low*).
  - Penghitung sisa waktu SLA resmi (*Countdown Timer / Deadline Badge*).
  - Jarak kilometer dari posisi GPS petugas ke lokasi insiden.
  - Alamat lengkap dan kategori dinas.

#### Tab 2: Pantau Kota (`CityReportsTab`)
- Menampilkan seluruh laporan publik yang ada di kota untuk memberikan kesadaran situasional (*situational awareness*) kepada petugas mengenai insiden-insiden lain di sekitarnya.

#### Tab 3: Radar Peta Lapangan (`OfficerMapTab`)
- Peta interaktif berbasis `flutter_map` dan OpenStreetMap.
- Menampilkan titik posisi GPS live petugas bersanding dengan pin seluruh tugas yang sedang di-assign kepadanya.
- Ketuk pin untuk memunculkan kartu tugas singkat dan rute jarak.

#### Tab 4: Riwayat Selesai (`CompletedHistoryTab`)
- Arsip digital seluruh pekerjaan yang berhasil dituntaskan oleh petugas.
- Menampilkan foto bukti penyelesaian (*before/after*), catatan pekerjaan yang pernah diinput, serta nilai rating bintang yang diberikan oleh warga pelapor.

#### Tab 5: Profil Petugas (`ProfileTab`)
- Informasi identitas diri, NIP/ID Dinas, instansi penugasan, dan nomor telepon.
- Kartu Metrik Kinerja Pribadi:
  - Total tugas diselesaikan (*Completion Count*).
  - Rata-rata skor kepuasan publik (*Average Rating Stars*).
- Pengaturan Keamanan: Aktif/non-aktifkan autentikasi biometrik.
- Tombol Logout sesi aplikasi.

---

### 5.4 Eksekusi Tugas & Alur Penanganan di Lapangan

```
[Petugas Buka Tugas] 
       │
       ▼
[Detail Tugas] ──(Klik Navigasi)──► Buka Google Maps / Waze (Rute Turn-by-Turn)
       │
       ▼
[Klik "Mulai Kerjakan"] ──────────► Status: Ditugaskan (assigned) -> Diproses (in_progress)
       │                            (Notifikasi instan dikirim ke warga pelapor)
       ▼
[Penanganan di Lokasi Selesai]
       │
       ▼
[Buka Form "Tandai Selesai"]
       ├── Ambil Foto Bukti Hasil (1 hingga 5 Foto via Kamera)
       ├── Rekam Video Bukti Hasil (Hingga 2 Menit via Kamera)
       ├── Tulis Catatan Ringkasan Tindak Lanjut Teknis
       │
       ▼
[Klik "Kirim Bukti & Selesaikan"] ─► Status: Diproses (in_progress) -> Selesai (completed)
                                    (Tercatat di ReportCompletionProof & Notifikasi ke Warga)
```

1. **Detail Penugasan Lengkap (`TaskDetailScreen`):**
   - Menampilkan foto laporan awal warga dengan resolusi tinggi.
   - Deskripsi keluhan warga dan koordinat lintang/bujur.
   - Perhitungan jarak real-time dari posisi petugas saat ini ke titik insiden (dalam km).
2. **Deep Link Navigasi Turn-by-Turn:**
   - Tombol **"Buka Navigasi Peta"** memicu intent `url_launcher` untuk membuka **Google Maps** (`https://maps.google.com/?q=lat,lng`) atau **Waze** untuk panduan mengemudi ke titik insiden tanpa perlu copy-paste alamat manual.
3. **Transisi Status "Mulai Kerjakan":**
   - Menekan tombol "Mulai Kerjakan" memicu modal konfirmasi.
   - Status tiket berubah dari `assigned` menjadi `in_progress`.
   - Warga pelapor langsung menerima notifikasi: *"Petugas telah tiba di lokasi dan sedang menangani laporan Anda."*
4. **Alur Penyelesaian Tugas Berbukti (`CompleteTaskScreen`):**
   - Petugas tidak diizinkan menyelesaikan tugas tanpa bukti fisik.
   - **Upload Multi-Foto Hasil (1–5 Foto):** Diambil langsung menggunakan kamera perangkat atau galeri dengan kompresi otomatis.
   - **Upload Video Bukti Hasil (Maks. 2 Menit):** Merekam bukti fisik berfungsinya kembali fasilitas (mis. lampu jalan sudah menyala, air saluran sudah mengalir lancar).
   - **Catatan Penanganan:** Kolom deskripsi pekerjaan teknis yang dilakukan (mis. *"Penambalan aspal cold-mix sepanjang 4 meter telah selesai"*).
   - **Validasi & Finalisasi:** Status tiket resmi berubah menjadi `completed`, timestamp selesai dicatat, dan warga pelapor dipersilakan mengisi rating.

---

### 5.5 Saluran Komando Cepat Posko (`OfficerPoskoChatSheet` - FAB)
- Tombol aksi mengambang (*Floating Action Button*) berbentuk ikon forum selalu tersedia di layar utama aplikasi.
- Ketuk untuk membuka lembar obrolan (*bottom sheet*) interaktif dua arah dengan Tim Admin Posko.
- Fitur Pilihan Kategori Laporan Cepat:
  - `kendala`: Hambatan di jalan (macet, akses tertutup warga, lokasi salah).
  - `alat`: Kekurangan material atau kebutuhan alat berat tambahan.
  - `laporan`: Pertanyaan klarifikasi atas deskripsi warga.
  - `darurat`: Kondisi kecelakaan atau bahaya keamanan mendesak di lapangan.
  - `umum`: Koordinasi administratif standar.
- Mendukung pembaruan pesan real-time melalui WebSocket Supabase.

---

## 6. Model State Machine Laporan (Siklus Hidup Tiket)

Siklus status laporan diatur dengan mesin status (*finite state machine*) ketat untuk menjaga integritas data dan mencegah perubahan status yang tidak sah:

```
                      +----------------------+
                      |      DIBUAT OLEH     |
                      |    WARGA (PENDING)   |
                      +----------------------+
                                  |
                   +--------------+--------------+
                   |                             |
        [Admin Verifikasi]              [Admin Tolak + Alasan]
                   |                             |
                   v                             v
         +--------------------+        +--------------------+
         |     VERIFIED       |        |     REJECTED       |
         +--------------------+        |  (Siklus Berakhir) |
                   |                   +--------------------+
         [Admin Disposisi ke Petugas]
                   |
                   v
         +--------------------+
         |     ASSIGNED       |
         +--------------------+
                   |
         [Petugas Mulai Kerja]
                   |
                   v
         +--------------------+
         |   IN_PROGRESS      |
         +--------------------+
                   |
         [Petugas Selesai + Bukti Foto/Video]
                   |
                   v
         +--------------------+
         |    COMPLETED       |
         |  (Warga Review)    |
         +--------------------+
```

### Matriks Transisi Status:

| Dari Status | Ke Status | Aktor yang Berwenang | Kondisi & Persyaratan Wajib | Efek Samping Sistem |
|---|---|---|---|---|
| *(None)* | `pending` | Warga / Guest Auth | Mengisi judul, deskripsi, kategori, pin lokasi GPS, min. 1 foto bukti. | Generate `ticket_id`, cek duplikasi radius 100m, estimasi SLA, notifikasi ke Admin. |
| `pending` | `verified` | Admin | Menilai validitas laporan dan kelayakan penanganan. | Catat `status_logs`, kirim email/notifikasi ke pelapor bahwa laporan valid. |
| `pending` | `rejected` | Admin | Menolak laporan spam/hoaks. **Wajib mengisi `rejected_reason`**. | Catat `status_logs`, simpan alasan penolakan, kirim notifikasi ke pelapor. Siklus berhenti. |
| `verified` | `assigned` | Admin | Memilih petugas lapangan aktif dari dinas terkait. | Isi `assigned_petugas_id`, isi `assigned_at`, kirim notifikasi ke Petugas terkait & pelapor. |
| `assigned` | `in_progress` | Petugas Lapangan / Admin | Petugas telah tiba di lokasi dan siap melakukan pengerjaan fisik. | Catat `started_at`, catat `status_logs`, kirim notifikasi ke pelapor bahwa pengerjaan dimulai. |
| `in_progress`| `completed` | Petugas Lapangan / Admin | Pengerjaan tuntas. **Wajib unggah minimal 1 foto bukti penanganan** dan catatan. | Simpan ke `completion_proofs`, catat `completed_at`, notifikasi ke pelapor untuk memberikan rating 1–5 bintang. |

---

## 7. Skema Basis Data Lengkap (PostgreSQL / Supabase)

Sistem menggunakan 12 entitas tabel relasional teroptimasi dengan indeks geospasial dan integritas referensial:

### 7.1 Tabel `profiles` (Data Pengguna & Profil)
Menyimpan informasi identitas seluruh pengguna sistem:
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('masyarakat', 'admin', 'petugas')) DEFAULT 'masyarakat',
  wilayah_id UUID REFERENCES public.wilayah(id) ON DELETE SET NULL,
  department TEXT, -- Dinas terkait bagi role petugas
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- False saat petugas baru registrasi
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.2 Tabel `wilayah` (Zona Wilayah Administratif)
Menyimpan wilayah kecamatan/kelurahan untuk zonasi laporan dan petugas:
```sql
CREATE TABLE public.wilayah (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- Mis. "KEC-BDG-01"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.3 Tabel `reports` (Master Data Laporan Warga)
Tabel sentral penyimpan data keluhan dan siklus tiket:
```sql
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id TEXT NOT NULL UNIQUE, -- Format mis. CVL-202609-0012
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('infrastruktur', 'lingkungan', 'kebersihan', 'pelayanan', 'keamanan', 'lainnya')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'assigned', 'in_progress', 'completed', 'rejected')) DEFAULT 'pending',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photo_url TEXT, -- Thumbnail foto utama
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[], -- Multi-foto laporan awal
  video_url TEXT, -- Video bukti laporan awal
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wilayah_id UUID REFERENCES public.wilayah(id) ON DELETE SET NULL,
  assigned_petugas_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rejected_reason TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  sla_deadline TIMESTAMPTZ, -- Target waktu resolusi resmi
  estimated_completion_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.4 Tabel `status_logs` (Audit Trail Kronologis Laporan)
Merekam jejak audit setiap transisi status tiket secara permanen:
```sql
CREATE TABLE public.status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.5 Tabel `completion_proofs` (Bukti Penanganan Tugas Petugas)
Menyimpan bukti fisik penyelesaian tugas dari petugas lapangan:
```sql
CREATE TABLE public.completion_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL, -- Foto utama bukti sesudah
  photo_urls TEXT[] DEFAULT ARRAY[]::TEXT[], -- Multi foto bukti sesudah
  video_url TEXT, -- Video bukti penanganan
  note TEXT, -- Catatan teknis pekerjaan
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.6 Tabel `upvotes` (Dukungan Warga Terhadap Tiket)
Mencegah duplikasi dengan memfasilitasi dukungan warga atas tiket yang sama:
```sql
CREATE TABLE public.upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);
```

### 7.7 Tabel `comments` (Diskusi & Tanggapan Laporan)
Ruang komunikasi publik dan koordinasi antar-pihak:
```sql
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.8 Tabel `ratings` (Evaluasi Kinerja oleh Pelapor Asli)
Penilaian skor kepuasan warga atas penyelesaian tiket:
```sql
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.9 Tabel `petugas_spesialisasi` (Matriks Keahlian Dinas Petugas)
Mengkategorikan petugas berdasarkan rumpun keahlian teknis:
```sql
CREATE TABLE public.petugas_spesialisasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petugas_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('infrastruktur', 'lingkungan', 'kebersihan', 'pelayanan', 'keamanan', 'lainnya')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(petugas_id, category)
);
```

### 7.10 Tabel `officer_attendance` (Presensi Harian GPS Petugas)
Mencatat kehadiran dan posisi GPS petugas lapangan secara live:
```sql
CREATE TABLE public.officer_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('check_in', 'break_start', 'break_end', 'check_out')),
  status TEXT NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time', 'late', 'normal')),
  auth_method TEXT NOT NULL DEFAULT 'biometric' CHECK (auth_method IN ('biometric', 'password_fallback', 'manual')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.11 Tabel `officer_direct_chats` (Saluran Komando Posko Realtime)
Obrolan langsung terarah antara Petugas dengan Admin Komando:
```sql
CREATE TABLE public.officer_direct_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'umum' CHECK (category IN ('kendala', 'alat', 'laporan', 'darurat', 'umum')),
  is_flagged BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.12 Tabel `notifications` (Notifikasi Pengguna Multi-Channel)
Menyimpan notifikasi in-app untuk seluruh peran:
```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('status_change', 'comment', 'assignment', 'escalation', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 8. Persyaratan Non-Fungsional (NFR)

### 8.1 Performa & Kecepatan Respons
- **Waktu Muat Awal (FCP):** Web SPA harus memiliki First Contentful Paint < 1.5 detik pada koneksi 4G standar dengan penerapan *React lazy-loading (code splitting)*.
- **Peta Digital Responsif:** Render Leaflet Map dan visualisasi hingga 500+ marker secara simultan harus stabil pada 60 FPS tanpa freezing memori.
- **Efisiensi Flutter App:** Startup aplikasi mobile < 1.2 detik (cold boot) dengan penggunaan *lazy-instantiated tab controllers*.
- **Kompresi Gambar:** Foto yang diunggah dikompresi di sisi klien menjadi ukuran < 1.2 MB dengan kualitas visual tetap tajam untuk analisis teknis.

### 8.2 Keamanan & Privasi Data
- **Row Level Security (RLS) Menyeluruh:** Setiap akses SELECT, INSERT, UPDATE, DELETE di seluruh tabel dibatasi oleh RLS sesuai klaim JWT pengguna.
- **Perlindungan Anonimitas Pelapor:** Jika `is_anonymous = true`, API publik dan query tidak boleh mengembalikan nama atau foto pelapor kepada publik.
- **Proteksi Bot & Spam:** Kombinasi form honeypot, pembatasan laju (*rate limiting* per IP/User), dan sanitasi karakter HTML/script.
- **Penyimpanan Kredensial Mobile:** Kredensial sesi biometrik disimpan di Android Keystore / iOS Keychain menggunakan `flutter_secure_storage`.

### 8.3 Aksesibilitas & Penggunaan Lapangan
- **Outdoor Readability:** UI Mobile Petugas mengadopsi kontras tinggi, label teks tegas (font *Space Grotesk* dan *Plus Jakarta Sans*), serta batas sentuh (*touch target*) minimal 48×48 dp agar nyaman dioperasikan saat berjalan atau memakai sarung tangan kerja.
- **Semantik Status Tri-Faktor:** Setiap status diwakili oleh 3 indikator: **Warna Khusus + Ikon Khusus + Teks Label** untuk mendukung pengguna dengan keterbatasan penglihatan warna (*color-blind friendly*).

### 8.4 Keandalan & Skalabilitas (*Reliability & Availability*)
- **Target Ketersediaan Sistem:** 99.8% uptime bulanan dengan infrastruktur Supabase managed cloud dan hosting Vercel.
- **Sinkronisasi Real-Time:** Toleransi latensi propagasi pembaruan data WebSocket maksimal 500ms dari database ke klien web dan mobile.
- **Cadangan Data:** Daily backup otomatis database PostgreSQL di Supabase.

---

## 9. Rencana Pengembangan Lanjutan (Future Roadmap)

1. **Integrasi Computer Vision AI (Edge AI Damage Recognition):**
   - Deteksi otomatis tingkat keparahan jalan berlubang (*pothole classification*) dan jenis sampah langsung saat warga mengambil foto.
2. **Web Push Notification & Service Worker PWA:**
   - Menghadirkan push notification browser native untuk pengguna web desktop dan mobile web tanpa harus membuka tab browser.
3. **Penyusunan Rute Optimal Multi-Tugas Petugas (TSP Routing Engine):**
   - Menghitung rute perjalanan optimal paling hemat bahan bakar bagi petugas yang memiliki 3+ penugasan dalam satu shift dinas harian.
4. **Leaderboard & Gamifikasi Partisipasi Warga:**
   - Sistem poin dan lencana penghargaan (*Civic Badges*) bagi warga yang aktif melaporkan dan menjaga fasilitas kotanya.
