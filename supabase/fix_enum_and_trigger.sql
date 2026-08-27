-- ============================================================================
-- CivicLedger — Solusi Definitif Enum Report Status, Triggers & RPC
-- ============================================================================
-- Salin seluruh isi file ini dan jalankan di Supabase Dashboard → SQL Editor → Run.
-- ============================================================================

-- 1. DROP SEMUA TRIGGER TERKAIT STATUS TERLEBIH DAHULU
-- (PENTING: Harus di-drop dulu agar saat data lama dibersihkan, trigger lama tidak crash)
DROP TRIGGER IF EXISTS trg_log_status_change ON reports;
DROP TRIGGER IF EXISTS trg_notify_status_change ON status_logs;

-- 2. PASTIKAN TIPE ENUM report_status LENGKAP
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('pending', 'verified', 'assigned', 'in_progress', 'completed', 'rejected');
  END IF;
END $$;

-- 3. BERSIHKAN DATA STATUS LAMA DI TABEL reports
UPDATE reports
SET status = 'pending'
WHERE status::text = 'Menunggu Verifikasi' 
   OR status::text = 'Diterima' 
   OR status::text NOT IN ('pending', 'verified', 'assigned', 'in_progress', 'completed', 'rejected');

UPDATE reports SET status = 'verified' WHERE status::text = 'Terverifikasi';
UPDATE reports SET status = 'assigned' WHERE status::text = 'Ditugaskan';
UPDATE reports SET status = 'in_progress' WHERE status::text = 'Sedang Dikerjakan' OR status::text = 'Diproses';
UPDATE reports SET status = 'completed' WHERE status::text = 'Selesai';
UPDATE reports SET status = 'rejected' WHERE status::text = 'Ditolak';

-- 4. BERSIHKAN DATA DI TABEL status_logs
UPDATE status_logs
SET from_status = 'pending'
WHERE from_status::text = 'Menunggu Verifikasi' 
   OR from_status::text = 'Diterima' 
   OR from_status::text NOT IN ('pending', 'verified', 'assigned', 'in_progress', 'completed', 'rejected');

UPDATE status_logs SET from_status = 'verified' WHERE from_status::text = 'Terverifikasi';
UPDATE status_logs SET from_status = 'assigned' WHERE from_status::text = 'Ditugaskan';
UPDATE status_logs SET from_status = 'in_progress' WHERE from_status::text = 'Sedang Dikerjakan' OR from_status::text = 'Diproses';
UPDATE status_logs SET from_status = 'completed' WHERE from_status::text = 'Selesai';
UPDATE status_logs SET from_status = 'rejected' WHERE from_status::text = 'Ditolak';

UPDATE status_logs
SET to_status = 'pending'
WHERE to_status::text = 'Menunggu Verifikasi' 
   OR to_status::text = 'Diterima' 
   OR to_status::text NOT IN ('pending', 'verified', 'assigned', 'in_progress', 'completed', 'rejected');

UPDATE status_logs SET to_status = 'verified' WHERE to_status::text = 'Terverifikasi';
UPDATE status_logs SET to_status = 'assigned' WHERE to_status::text = 'Ditugaskan';
UPDATE status_logs SET to_status = 'in_progress' WHERE to_status::text = 'Sedang Dikerjakan' OR to_status::text = 'Diproses';
UPDATE status_logs SET to_status = 'completed' WHERE to_status::text = 'Selesai';
UPDATE status_logs SET to_status = 'rejected' WHERE to_status::text = 'Ditolak';

-- 5. PASANG FUNGSI TRIGGER log_status_change YANG KEBAL ERROR (BULLETPROOF)
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS trigger AS $$
DECLARE
  v_from report_status;
  v_to report_status;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    BEGIN
      v_from := OLD.status::text::report_status;
    EXCEPTION WHEN OTHERS THEN
      v_from := 'pending'::report_status;
    END;

    BEGIN
      v_to := NEW.status::text::report_status;
    EXCEPTION WHEN OTHERS THEN
      v_to := 'verified'::report_status;
    END;

    INSERT INTO status_logs (report_id, from_status, to_status, changed_by, note)
    VALUES (
      NEW.id,
      v_from,
      v_to,
      COALESCE(auth.uid(), NEW.assigned_petugas_id),
      NEW.rejected_reason
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. PASANG KEMBALI TRIGGER PADA TABEL reports
CREATE TRIGGER trg_log_status_change
  AFTER UPDATE OF status ON reports
  FOR EACH ROW EXECUTE FUNCTION log_status_change();

-- 7. PASANG FUNGSI RPC ADMIN UNTUK VERIFIKASI & PENUGASAN LANGSUNG (ANTI-GAGAL)
CREATE OR REPLACE FUNCTION admin_verify_report(p_report_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_report reports%ROWTYPE;
BEGIN
  UPDATE reports
  SET status = 'verified'::report_status, updated_at = NOW()
  WHERE id = p_report_id
  RETURNING * INTO v_report;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Laporan tidak ditemukan');
  END IF;

  RETURN jsonb_build_object('success', true, 'report', row_to_json(v_report));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_assign_report(p_report_id UUID, p_petugas_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_report reports%ROWTYPE;
BEGIN
  UPDATE reports
  SET status = 'assigned'::report_status, assigned_petugas_id = p_petugas_id, assigned_at = NOW(), updated_at = NOW()
  WHERE id = p_report_id
  RETURNING * INTO v_report;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Laporan tidak ditemukan');
  END IF;

  RETURN jsonb_build_object('success', true, 'report', row_to_json(v_report));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_reject_report(p_report_id UUID, p_reason TEXT)
RETURNS jsonb AS $$
DECLARE
  v_report reports%ROWTYPE;
BEGIN
  UPDATE reports
  SET status = 'rejected'::report_status, rejected_reason = p_reason, updated_at = NOW()
  WHERE id = p_report_id
  RETURNING * INTO v_report;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Laporan tidak ditemukan');
  END IF;

  RETURN jsonb_build_object('success', true, 'report', row_to_json(v_report));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
