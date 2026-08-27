# PRD: Sistem Laporan Masyarakat (Smart City)

**Nama Proyek (sementara):** CivicLedger — Sistem Laporan Infrastruktur & Lingkungan Kota
**Jenis:** Web Application, dirancang mobile-first untuk role Petugas (PWA) (Portofolio)
**Author:** Gino Putra Widana
**Versi:** 1.2 — memperkuat sistem desain agar tidak terkesan generic AI design

---

## 1. Latar Belakang & Tujuan

Masyarakat kerap mengalami masalah infrastruktur dan lingkungan di sekitar tempat tinggal — jalan rusak, sampah menumpuk, lampu jalan mati — namun tidak memiliki kanal terstruktur untuk melaporkannya dan melacak tindak lanjutnya. CivicLedger adalah platform web yang memungkinkan warga melaporkan masalah tersebut secara terverifikasi, dapat dilacak, dan transparan, sekaligus memberi admin/instansi terkait alat untuk mengelola dan menganalisis laporan secara efisien.

**Tujuan proyek (sebagai portofolio):**
- Menunjukkan kemampuan full-stack development (frontend, backend, database, autentikasi & otorisasi)
- Menunjukkan kemampuan merancang sistem dengan logika bisnis nontrivial (state machine status, deteksi duplikasi berbasis lokasi, statistik agregat)
- Melengkapi portofolio yang sudah ada (FitForge, Duitin — keduanya mobile) dengan proyek web yang menunjukkan variasi keahlian

---

## 2. Target Pengguna & Role

### 2.1 Masyarakat (Warga)
Pengguna umum yang ingin melaporkan masalah di lingkungannya, memantau status laporan, dan berinteraksi dengan laporan warga lain.

### 2.2 Admin
Pengelola sistem (mewakili instansi/kelurahan) yang memverifikasi laporan, meng-assign laporan ke Petugas, dan memantau statistik wilayah.

### 2.3 Petugas Lapangan
Perwakilan instansi teknis (misal Dinas PU, Dinas Kebersihan) yang menerima laporan yang di-assign Admin, datang ke lokasi, menangani masalah, dan mengunggah bukti penanganan. Petugas mengakses sistem terutama dari HP saat berada di lapangan, sehingga pengalamannya dirancang mobile-first dan didukung PWA (lihat bagian 3.6 dan 7.5).

---

## 3. Ruang Lingkup Fitur (MVP)

### 3.1 Autentikasi & Profil
- Registrasi & login (email/password, opsional OAuth Google)
- Profil pengguna dasar (nama, wilayah domisili, foto profil opsional)
- Role-based access control (Masyarakat, Admin, Petugas Lapangan)

### 3.2 Pelaporan (Masyarakat)
- Form buat laporan baru:
  - Kategori: Infrastruktur, Kebersihan, Fasilitas Umum, Keamanan & Ketertiban, Lingkungan, Lainnya
  - Deskripsi masalah (teks)
  - Upload foto (minimal 1, maksimal 3-5 foto)
  - Lokasi: pin di peta (Leaflet) + deteksi otomatis via geolocation browser, dengan opsi input manual kecamatan/kelurahan
  - Prioritas default otomatis berdasarkan kategori (bisa dikoreksi admin)
- **Deteksi duplikasi berbasis radius**: saat submit, sistem mengecek laporan lain dalam radius ±100m dengan kategori sama dan status aktif. Jika ditemukan, tampilkan sebagai "laporan serupa" agar user bisa upvote alih-alih membuat laporan baru.
- Riwayat laporan pribadi dengan status masing-masing

### 3.3 Status Laporan (State Machine)
```
Menunggu Verifikasi → Terverifikasi → Ditugaskan → Diproses → Selesai
                    ↘ Ditolak (dengan alasan wajib)
```
- Transisi **Menunggu Verifikasi → Terverifikasi/Ditolak** dilakukan oleh Admin
- Transisi **Terverifikasi → Ditugaskan** terjadi saat Admin meng-assign laporan ke Petugas tertentu
- Transisi **Ditugaskan → Diproses** dilakukan oleh Petugas saat mulai mengerjakan (misal saat tiba di lokasi)
- Transisi **Diproses → Selesai** dilakukan oleh Petugas, wajib disertai foto bukti penanganan
- Setiap perubahan status tercatat dengan timestamp, siapa yang mengubah (Admin/Petugas), dan catatan opsional

### 3.4 Interaksi Sosial
- Upvote/dukung laporan (mencegah duplikasi, menunjukkan urgensi kolektif)
- Komentar pada laporan (warga menambahkan info tambahan)
- Rating penanganan (1-5 bintang) setelah laporan berstatus Selesai
- Notifikasi in-app saat status laporan berubah

### 3.5 Peta & Visualisasi Sebaran (MVP)
- Peta interaktif (Leaflet.js) menampilkan seluruh laporan aktif sebagai marker, dengan warna marker berbeda per status/prioritas
- Filter peta berdasarkan kategori, status, dan wilayah
- Klik marker → preview singkat laporan

### 3.6 Dashboard Admin
- Ringkasan statistik: total laporan, breakdown per status, per kategori, per wilayah (chart)
- Tabel laporan dengan filter & sorting (kategori, wilayah, status, prioritas, tanggal)
- Aksi cepat: verifikasi, tolak (dengan alasan), tambah catatan
- **Assign laporan ke Petugas**: pilih petugas dari daftar (difilter berdasarkan wilayah/spesialisasi), laporan otomatis pindah ke status "Ditugaskan"
- Manajemen wilayah (tambah/edit kecamatan/kelurahan yang tercakup sistem)
- Manajemen akun Petugas (tambah/nonaktifkan petugas, atur wilayah tanggung jawab)
- Export data laporan ke Excel/PDF

### 3.7 Halaman Petugas Lapangan (`/petugas`) — Mobile-First
Halaman terpisah dari dashboard Admin, dioptimalkan untuk digunakan dari HP saat di lapangan:
- **Daftar tugas**: card besar berisi laporan yang di-assign ke petugas tersebut, diurutkan berdasarkan prioritas/jarak
- **Detail tugas**: foto laporan awal, deskripsi, lokasi, tombol "Navigasi" yang membuka deep link ke Google Maps (`https://maps.google.com/?q=lat,lng`)
- **Tombol "Mulai Kerjakan"**: mengubah status laporan dari Ditugaskan → Diproses
- **Tombol "Tandai Selesai"**: membuka form singkat untuk upload foto bukti penanganan, wajib diisi sebelum status berubah ke Selesai
- UI minim teks, elemen tap besar, kontras tinggi — dirancang untuk dipakai sambil berdiri/berjalan, bukan duduk di meja
- Lihat detail teknis PWA di bagian 7.5

### 3.8 Statistik Publik (opsional tapi direkomendasikan)
- Halaman statistik publik: jumlah laporan aktif, tingkat penyelesaian, wilayah paling responsif — untuk transparansi ke warga

---

## 4. Fitur Fase 2 (Roadmap Lanjutan)
- Heatmap area rawan masalah
- Leaderboard wilayah "paling responsif" dan leaderboard Petugas tercepat menyelesaikan tugas
- Notifikasi email/push (Web Push API)
- Laporan anonim dengan opsi privasi
- Fitur estimasi waktu penyelesaian otomatis berdasarkan riwayat kategori

---

## 5. Model Data (Ringkasan Entitas Utama)

| Entitas | Atribut Kunci |
|---|---|
| **User** | id, nama, email, password_hash, role (masyarakat/admin/petugas), wilayah_id, foto_profil |
| **Report** | id, user_id, kategori, deskripsi, foto[], lat, lng, wilayah_id, status, prioritas, petugas_id (nullable), created_at |
| **ReportStatusLog** | id, report_id, status_lama, status_baru, changed_by_user_id, changed_by_role, catatan, timestamp |
| **ReportCompletionProof** | id, report_id, petugas_id, foto_bukti[], catatan_penanganan, completed_at |
| **Upvote** | id, report_id, user_id |
| **Comment** | id, report_id, user_id, isi, created_at |
| **Rating** | id, report_id, user_id, skor, komentar |
| **Wilayah** | id, nama_kecamatan, nama_kelurahan |
| **PetugasSpesialisasi** | id, petugas_id, kategori (mis. Infrastruktur, Kebersihan) |

---

## 6. Tech Stack yang Direkomendasikan

Selaras dengan stack portofolio yang sudah kamu pakai untuk website (React/Next.js 14 + Tailwind):

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, shadcn/ui untuk komponen dasar
- **Peta**: Leaflet.js + OpenStreetMap (gratis, tidak butuh API key berbayar seperti Mapbox/Google Maps)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage) — konsisten dengan pengalaman kamu di FitForge, dan PostGIS extension di Supabase bisa dipakai untuk query radius secara efisien
- **Chart/statistik**: Recharts atau Chart.js
- **PWA (khusus halaman `/petugas`)**: `next-pwa` untuk service worker & manifest, akses kamera via `<input capture="environment">`, offline caching untuk draft update status
- **Deployment**: Vercel (frontend) + Supabase (backend), keduanya gratis untuk tier portofolio

---

## 7. Sistem Desain: "Civic Ledger"

### 7.1 Konsep
Identitas visual terinspirasi dari catatan/buku besar kota — rapi, terpercaya, namun tetap hangat karena melibatkan warga. Elemen signature: kartu laporan bergaya "tiket resmi" dengan nomor unik dan tepi bergaris putus-putus, seolah setiap laporan adalah entri tercatat resmi di buku besar kota.

### 7.2 Menghindari Kesan "Generic AI Design"
Tiga pola yang paling sering muncul di desain buatan AI dan sengaja **dihindari** di proyek ini:
1. Background krem hangat + font serif kontras tinggi + aksen terracotta — kesannya template blog/SaaS generik
2. Background nyaris hitam + satu aksen neon terang — kesannya "dark mode developer tool" generik
3. Layout broadsheet dengan garis tipis di mana-mana dan kolom rapat ala koran — kesannya template editorial generik

Sebagai gantinya, "Civic Ledger" mengambil warna dan bentuk dari **dunia nyata subjeknya**: rambu jalan, tiket antrian resmi, dan dokumen kota — bukan tren desain SaaS/AI yang sedang populer. Aturan tambahan untuk menjaga ini:
- **Tanpa gradient dekoratif** di background atau tombol — warna solid saja, sesuai prinsip flat design
- **Tanpa drop shadow tebal** pada card — pakai hairline border 1px sebagai pemisah visual
- **Tanpa ikon emoji** di UI produksi — gunakan icon set line-based konsisten (misal Lucide/Phosphor), bukan campuran emoji dan icon
- **Tanpa ilustrasi stok generik** (karakter flat 3D, ilustrasi "empty state" pasaran) — untuk empty state gunakan tipografi + micro-copy yang jelas, bukan gambar dekoratif
- **Satu signature element per halaman**, bukan banyak elemen "wow" sekaligus — misal di halaman laporan, signature-nya adalah kartu bergaya tiket; di dashboard admin, signature-nya adalah tabel dengan status-log yang bisa di-expand seperti buku kas

### 7.3 Palet Warna
| Peran | Hex | Kegunaan |
|---|---|---|
| Background | `#F6F7F5` | Latar utama |
| Ink (teks utama) | `#16233D` | Judul, teks primer |
| Aksen sinyal | `#E8A33D` | Status "Diproses", elemen perhatian |
| Aksen positif | `#2E8B7F` | Status "Selesai" |
| Aksen bahaya | `#C1503D` | Prioritas tinggi, status "Ditolak" |
| Netral sekunder | `#8891A0` | Teks sekunder, border |

Prinsip pemakaian: latar tetap netral di 90% halaman, warna aksen (amber/teal/merah bata) hanya dipakai untuk elemen yang membawa makna status — bukan dekorasi. Ini membuat warna aksen terasa informatif, bukan sekadar estetika.

### 7.4 Tipografi
- **Display**: Space Grotesk — headline, angka statistik. Dipakai terbatas, hanya di judul halaman dan angka besar pada dashboard
- **Body**: Public Sans — teks umum, form, deskripsi. Dipilih karena punya nuansa "dokumen resmi" tanpa terasa kaku
- **Utility/Mono**: IBM Plex Mono — nomor tiket laporan, koordinat, timestamp, kode status. Font mono di tempat yang tepat (bukan di semua tempat) memberi kesan sistem yang presisi

Skala tipografi disarankan (rem, basis 16px): 2.5 / 2 / 1.5 / 1.25 / 1 / 0.875 — dengan line-height lega (1.4–1.6) untuk body text agar tidak terasa padat.

### 7.5 Prinsip Layout & Komponen
- Flat design, hairline border tipis (`1px solid #E2E4E0`) sebagai pemisah, bukan shadow
- Radius sudut kecil dan konsisten (6px untuk card, 4px untuk button/input) — bukan 0 tajam ala broadsheet, bukan pill penuh ala mobile app generik
- Whitespace lega antar-section (min. 48px di desktop) untuk kesan profesional, tidak sesak
- Kartu laporan bergaya tiket dengan border dashed sebagai signature element di halaman publik
- Tombol primer: warna ink solid (`#16233D`) dengan teks putih — bukan warna aksen, supaya aksen tetap eksklusif untuk status
- Status selalu direpresentasikan dengan **kombinasi warna + label teks + ikon kecil**, tidak hanya warna — penting untuk aksesibilitas (color blind friendly)

### 7.6 Adaptasi Desain untuk Halaman Petugas (`/petugas`) — PWA Mobile-First
Tetap dalam sistem desain "Civic Ledger" yang sama, dengan penyesuaian mobile-first agar tidak terasa seperti "website yang dipaksa jadi app":
- Target tap area minimal 44×44px untuk semua tombol aksi
- Tipografi body dinaikkan 1 tingkat dari desktop (mudah dibaca di bawah sinar matahari/kondisi outdoor)
- Kartu tugas aktif memakai latar solid tipis (`#EFF1EC`) alih-alih hairline border tipis seperti di desktop, supaya batas antar-kartu tetap jelas terlihat di layar kecil dan kondisi cahaya terik
- Navigasi bottom-tab (bukan sidebar): Tugas Aktif, Riwayat, Profil — mengikuti konvensi native app agar Petugas merasa familiar walau berbasis web
- Transisi antar-tab dan status memakai animasi singkat (150–200ms, ease-out) secukupnya — bukan animasi berlebihan yang justru terasa "flashy AI-generated"

---

## 8. Metrik Keberhasilan (untuk konteks portofolio)
- Kelengkapan alur end-to-end (laporan → verifikasi → penugasan → penyelesaian) berjalan tanpa bug
- Waktu load halaman peta & dashboard tetap responsif dengan data dummy 200+ laporan
- Desain konsisten menerapkan sistem desain "Civic Ledger" di seluruh halaman (bukan hanya landing page), termasuk versi PWA Petugas
- Desain lolos self-check "bukan generic AI": tidak ada gradient dekoratif, drop shadow tebal, emoji sebagai ikon, atau ilustrasi stok generik di UI final
- Dokumentasi teknis (README) yang jelas untuk keperluan showcase ke recruiter

---

## 9. Prioritas Pengembangan (Urutan Kerja Disarankan)
1. Setup project + auth (3 role) + skema database
2. CRUD laporan (create, read) + upload foto
3. Deteksi radius duplikasi + peta Leaflet
4. State machine status (termasuk tahap Ditugaskan) + dashboard admin + assignment ke Petugas
5. Halaman `/petugas` mobile-first (daftar tugas, mulai kerjakan, upload bukti selesai)
6. Konfigurasi PWA (manifest, service worker, offline caching dasar) untuk halaman Petugas
7. Fitur sosial (upvote, komentar, rating)
8. Statistik & chart
9. Polish desain sesuai sistem desain "Civic Ledger" (termasuk adaptasi mobile-first Petugas)
10. Testing & deployment
