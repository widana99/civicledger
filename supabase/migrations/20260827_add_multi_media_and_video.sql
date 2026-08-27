-- ═══════════════════════════════════════════════════════════════
-- CIVICLEDGER MULTI-MEDIA & VIDEO PROOF SUPPORT
-- Menambahkan dukungan multi-foto dan video untuk laporan warga & bukti kerja petugas
-- ═══════════════════════════════════════════════════════════════

-- 1. Tambah kolom multi-foto dan video ke tabel reports
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completion_photo_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS completion_video_url TEXT DEFAULT NULL;

-- 2. Tambah kolom multi-foto dan video ke tabel completion_proofs
ALTER TABLE public.completion_proofs 
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- 3. Sinkronisasi data lama: jika photo_url ada tapi photo_urls kosong, isi photo_urls dengan array [photo_url]
UPDATE public.reports
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR cardinality(photo_urls) = 0);

UPDATE public.completion_proofs
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND (photo_urls IS NULL OR cardinality(photo_urls) = 0);
