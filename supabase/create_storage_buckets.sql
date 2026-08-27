-- ============================================================================
-- CivicLedger — Create Storage Buckets & Policies for Photos & Proofs
-- ============================================================================
-- Jalankan skrip ini di Supabase Dashboard → SQL Editor → Run
-- ============================================================================

-- 1. Buat Bucket 'report-photos' dan 'completion-photos' jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('report-photos', 'report-photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/*']),
  ('completion-photos', 'completion-photos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/*'])
ON CONFLICT (id) DO UPDATE 
SET public = true, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/*'];

-- 2. Kebijakan RLS agar siapapun (publik & petugas) bisa melihat foto
DROP POLICY IF EXISTS "Public & Auth Read Access" ON storage.objects;
CREATE POLICY "Public & Read Access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('report-photos', 'completion-photos'));

-- 3. Kebijakan RLS agar user yang login (warga & petugas) bisa upload foto
DROP POLICY IF EXISTS "Allow Upload Access" ON storage.objects;
CREATE POLICY "Allow Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id IN ('report-photos', 'completion-photos'));

-- 4. Kebijakan RLS agar user bisa update/replace foto jika diperlukan
DROP POLICY IF EXISTS "Allow Update Access" ON storage.objects;
CREATE POLICY "Allow Update Access"
ON storage.objects FOR UPDATE
USING (bucket_id IN ('report-photos', 'completion-photos'));
