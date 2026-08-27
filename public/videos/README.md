# 🎬 CivicLedger Video Assets Directory

Letakkan file video background / demonstrasi Anda di folder ini:
`public/videos/`

---

## 📁 Struktur Rekomendasi Penamaan File Video:

1. **`hero-smart-city.mp4` / `hero-smart-city.webm`**
   - **Tujuan**: Video background sinematik di bagian paling atas (Hero Section) landing page.
   - **Rekomendasi Format**: MP4 (H.264) atau WebM (VP9), resolusi 1080p atau 720p, durasi 5–15 detik (seamless loop), ukuran < 3 MB.

2. **`officer-field-action.mp4`**
   - **Tujuan**: Video demonstrasi petugas lapangan menyelesaikan tugas dengan foto GPS.
   - **Rekomendasi Format**: MP4 1080p, durasi 10–20 detik.

3. **`city-data-network.mp4`**
   - **Tujuan**: Video B-Roll analitik peta panas (heatmap) dan transparansi data kota.

---

## 🚀 Cara Memanggil Video di Komponen React:

```tsx
<video
  autoPlay
  loop
  muted
  playsInline
  className="w-full h-full object-cover"
  src="/videos/hero-smart-city.mp4"
/>
```
Atau gunakan komponen siap pakai: `<VideoBackground src="/videos/hero-smart-city.mp4" />`.
