-- ============================================================================
-- CivicLedger — Tabel Notifications + Auto-trigger
-- ============================================================================
-- Jalankan SQL ini SETELAH rls_policies.sql
-- ============================================================================

-- ============================================================================
-- 1. Buat tabel notifications (jika belum ada)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'system'
    CHECK (type IN ('status_change', 'comment', 'assignment', 'escalation', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index untuk query cepat per user
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_system" ON notifications;

-- User hanya bisa baca notifikasi miliknya
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- User bisa mark-as-read notifikasi miliknya
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert bisa dilakukan oleh siapa saja yang authenticated (trigger/function)
CREATE POLICY "notifications_insert_system"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- ============================================================================
-- 2. Trigger: Auto-notifikasi saat status_logs INSERT
-- ============================================================================
-- Setiap kali status laporan berubah, kirim notifikasi ke reporter

CREATE OR REPLACE FUNCTION notify_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_reporter_id UUID;
  v_ticket_id TEXT;
  v_title TEXT;
  v_status_label TEXT;
  v_petugas_id UUID;
BEGIN
  -- Ambil data laporan
  SELECT reporter_id, ticket_id, title, assigned_petugas_id
  INTO v_reporter_id, v_ticket_id, v_title, v_petugas_id
  FROM reports
  WHERE id = NEW.report_id;

  -- Label status yang mudah dibaca
  v_status_label := CASE NEW.to_status
    WHEN 'pending' THEN 'Menunggu Verifikasi'
    WHEN 'verified' THEN 'Terverifikasi'
    WHEN 'assigned' THEN 'Petugas Ditugaskan'
    WHEN 'in_progress' THEN 'Sedang Dikerjakan'
    WHEN 'completed' THEN 'Selesai'
    WHEN 'rejected' THEN 'Ditolak'
    ELSE NEW.to_status
  END;

  -- Notifikasi ke reporter (warga)
  IF v_reporter_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, report_id)
    VALUES (
      v_reporter_id,
      'Status Diperbarui → ' || v_status_label,
      v_ticket_id || ' — ' || v_title,
      'status_change',
      NEW.report_id
    );
  END IF;

  -- Jika ada petugas yang ditugaskan, notifikasi juga petugas
  IF v_petugas_id IS NOT NULL AND v_petugas_id != v_reporter_id THEN
    INSERT INTO notifications (user_id, title, message, type, report_id)
    VALUES (
      v_petugas_id,
      'Update Tugas → ' || v_status_label,
      v_ticket_id || ' — ' || v_title,
      'assignment',
      NEW.report_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger lama jika ada
DROP TRIGGER IF EXISTS trg_notify_status_change ON status_logs;

-- Buat trigger
CREATE TRIGGER trg_notify_status_change
  AFTER INSERT ON status_logs
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_status_change();


-- ============================================================================
-- 3. Trigger: Auto-notifikasi saat laporan baru masuk (untuk admin)
-- ============================================================================
-- Kirim notifikasi ke semua admin saat ada laporan baru

CREATE OR REPLACE FUNCTION notify_admin_new_report()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
BEGIN
  FOR v_admin IN
    SELECT id FROM profiles WHERE role = 'admin' AND is_active = true
  LOOP
    INSERT INTO notifications (user_id, title, message, type, report_id)
    VALUES (
      v_admin.id,
      'Laporan Baru Masuk',
      NEW.ticket_id || ' — ' || NEW.title,
      'system',
      NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_admin_new_report ON reports;

CREATE TRIGGER trg_notify_admin_new_report
  AFTER INSERT ON reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_report();


-- ============================================================================
-- 4. Supabase Realtime: Enable untuk notifications
-- ============================================================================
-- Agar Supabase Realtime subscription bisa mendeteksi insert/update

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE status_logs;
