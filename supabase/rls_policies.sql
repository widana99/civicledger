-- ============================================================================
-- CivicLedger — Row Level Security (RLS) Policies
-- ============================================================================
-- Jalankan SQL ini di Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Pastikan semua tabel sudah ada sebelum menjalankan.
-- ============================================================================

-- ============================================================================
-- 1. PROFILES
-- ============================================================================
-- Setiap user bisa membaca profil siapapun (untuk menampilkan nama reporter, petugas)
-- Setiap user hanya bisa mengupdate profilnya sendiri
-- Admin bisa mengupdate profil siapapun (mengubah role, is_active)

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

CREATE POLICY "profiles_select_all"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 2. REPORTS
-- ============================================================================
-- Siapapun yang terautentikasi bisa membaca semua laporan (publik)
-- Masyarakat hanya bisa INSERT laporan baru (reporter_id = auth.uid())
-- Admin bisa UPDATE semua laporan (verifikasi, assign, reject)
-- Petugas hanya bisa UPDATE laporan yang ditugaskan kepadanya
-- Tidak ada yang bisa DELETE laporan (data historis penting)

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_select_all" ON reports;
DROP POLICY IF EXISTS "reports_insert_masyarakat" ON reports;
DROP POLICY IF EXISTS "reports_update_admin" ON reports;
DROP POLICY IF EXISTS "reports_update_petugas" ON reports;
DROP POLICY IF EXISTS "reports_select_anon" ON reports;

-- Authenticated users: read all
CREATE POLICY "reports_select_all"
  ON reports FOR SELECT
  USING (auth.role() = 'authenticated');

-- Anonymous users: read all (untuk peta publik & statistik)
CREATE POLICY "reports_select_anon"
  ON reports FOR SELECT
  USING (auth.role() = 'anon');

-- Masyarakat: insert own reports only
CREATE POLICY "reports_insert_masyarakat"
  ON reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'masyarakat'
    )
  );

-- Admin: update any report
CREATE POLICY "reports_update_admin"
  ON reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Petugas: update only assigned reports
CREATE POLICY "reports_update_petugas"
  ON reports FOR UPDATE
  USING (
    assigned_petugas_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'petugas'
    )
  );

-- ============================================================================
-- 3. STATUS_LOGS
-- ============================================================================
-- Semua authenticated bisa membaca (untuk stepper progress)
-- Hanya admin dan petugas yang bisa insert (saat mengubah status)

ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "status_logs_select_all" ON status_logs;
DROP POLICY IF EXISTS "status_logs_insert_staff" ON status_logs;

CREATE POLICY "status_logs_select_all"
  ON status_logs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "status_logs_insert_staff"
  ON status_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'petugas')
    )
  );

-- ============================================================================
-- 4. COMMENTS
-- ============================================================================
-- Semua authenticated bisa membaca komentar
-- Semua authenticated bisa menambah komentar (user_id = auth.uid())
-- Tidak bisa menghapus komentar orang lain

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_all" ON comments;
DROP POLICY IF EXISTS "comments_insert_own" ON comments;
DROP POLICY IF EXISTS "comments_delete_own" ON comments;

CREATE POLICY "comments_select_all"
  ON comments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "comments_insert_own"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. UPVOTES
-- ============================================================================
-- Semua authenticated bisa membaca (untuk hitung jumlah dukungan)
-- User hanya bisa insert/delete upvote miliknya sendiri

ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "upvotes_select_all" ON upvotes;
DROP POLICY IF EXISTS "upvotes_insert_own" ON upvotes;
DROP POLICY IF EXISTS "upvotes_delete_own" ON upvotes;

CREATE POLICY "upvotes_select_all"
  ON upvotes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "upvotes_insert_own"
  ON upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "upvotes_delete_own"
  ON upvotes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 6. RATINGS
-- ============================================================================
-- Semua authenticated bisa membaca
-- User hanya bisa insert/upsert rating miliknya sendiri

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_all" ON ratings;
DROP POLICY IF EXISTS "ratings_insert_own" ON ratings;
DROP POLICY IF EXISTS "ratings_update_own" ON ratings;

CREATE POLICY "ratings_select_all"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "ratings_insert_own"
  ON ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ratings_update_own"
  ON ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7. COMPLETION_PROOFS
-- ============================================================================
-- Semua authenticated bisa membaca (untuk melihat bukti penyelesaian)
-- Hanya petugas yang ditugaskan yang bisa insert

ALTER TABLE completion_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "completion_proofs_select_all" ON completion_proofs;
DROP POLICY IF EXISTS "completion_proofs_insert_petugas" ON completion_proofs;

CREATE POLICY "completion_proofs_select_all"
  ON completion_proofs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "completion_proofs_insert_petugas"
  ON completion_proofs FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'petugas'
    )
  );

-- ============================================================================
-- 8. WILAYAH
-- ============================================================================
-- Semua bisa membaca (dropdown wilayah di form)
-- Hanya admin yang bisa CRUD

ALTER TABLE wilayah ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wilayah_select_all" ON wilayah;
DROP POLICY IF EXISTS "wilayah_manage_admin" ON wilayah;
DROP POLICY IF EXISTS "wilayah_insert_admin" ON wilayah;
DROP POLICY IF EXISTS "wilayah_delete_admin" ON wilayah;

CREATE POLICY "wilayah_select_all"
  ON wilayah FOR SELECT
  USING (true);

CREATE POLICY "wilayah_manage_admin"
  ON wilayah FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "wilayah_insert_admin"
  ON wilayah FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "wilayah_delete_admin"
  ON wilayah FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 9. PETUGAS_SPESIALISASI
-- ============================================================================
-- Semua authenticated bisa membaca (admin lihat saat assign petugas)
-- Hanya admin yang bisa manage

ALTER TABLE petugas_spesialisasi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "petugas_spesialisasi_select_all" ON petugas_spesialisasi;
DROP POLICY IF EXISTS "petugas_spesialisasi_manage_admin" ON petugas_spesialisasi;
DROP POLICY IF EXISTS "petugas_spesialisasi_insert_admin" ON petugas_spesialisasi;
DROP POLICY IF EXISTS "petugas_spesialisasi_delete_admin" ON petugas_spesialisasi;

CREATE POLICY "petugas_spesialisasi_select_all"
  ON petugas_spesialisasi FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "petugas_spesialisasi_manage_admin"
  ON petugas_spesialisasi FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "petugas_spesialisasi_insert_admin"
  ON petugas_spesialisasi FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "petugas_spesialisasi_delete_admin"
  ON petugas_spesialisasi FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 10. NOTIFICATIONS (jika tabel sudah dibuat)
-- ============================================================================
-- User hanya bisa membaca notifikasi miliknya sendiri
-- System/trigger yang insert (bisa juga admin)

-- Uncomment jika tabel notifications sudah ada:
/*
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;

CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
*/

-- ============================================================================
-- 11. STORAGE — report-photos bucket
-- ============================================================================
-- Siapapun bisa membaca foto (publik)
-- Hanya authenticated user yang bisa upload

-- Jalankan ini jika belum ada policy di storage:
/*
INSERT INTO storage.policies (name, bucket_id, definition, check_expression, operation)
VALUES
  ('Public read report photos', 'report-photos',
   'true', null, 'SELECT'),
  ('Authenticated upload report photos', 'report-photos',
   '(auth.role() = ''authenticated'')', '(auth.role() = ''authenticated'')', 'INSERT');
*/

-- Atau lebih mudah: set bucket "report-photos" ke PUBLIC di Supabase Dashboard
-- Dashboard → Storage → report-photos → Settings → Make Public
