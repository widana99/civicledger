-- ═══════════════════════════════════════════════════════════════
-- CIVICLEDGER HIGH-CONCURRENCY & SCALABILITY INDEXES
-- Optimasi Skalabilitas Database untuk Ribuan/Jutaan Pengguna Simultan
-- ═══════════════════════════════════════════════════════════════

-- 1. Composite Index untuk Query Beranda & Peta (Filter Status & Urutan Waktu)
-- Mempercepat query 'SELECT * FROM reports WHERE status != rejected ORDER BY created_at DESC' dari O(N) ke O(log N)
CREATE INDEX IF NOT EXISTS idx_reports_status_created 
  ON public.reports (status, created_at DESC);

-- 2. Index Geospasial / Koordinat untuk Peta Radar Live
CREATE INDEX IF NOT EXISTS idx_reports_geo_coords 
  ON public.reports (latitude, longitude) 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 3. Composite Index untuk Filter Wilayah & Kategori
CREATE INDEX IF NOT EXISTS idx_reports_wilayah_category 
  ON public.reports (wilayah_id, category);

-- 4. Index Foreign Key untuk Mempercepat Relasi & Join Petugas
CREATE INDEX IF NOT EXISTS idx_reports_assigned_petugas 
  ON public.reports (assigned_petugas_id) 
  WHERE assigned_petugas_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_reporter 
  ON public.reports (reporter_id);

-- 5. Index Komentar & Upvotes agar Halaman Detail Laporan Instan
CREATE INDEX IF NOT EXISTS idx_comments_report_created 
  ON public.comments (report_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_upvotes_report_user 
  ON public.upvotes (report_id, user_id);

CREATE INDEX IF NOT EXISTS idx_status_logs_report 
  ON public.status_logs (report_id, created_at ASC);

-- 6. Materialized View untuk Statistik Agregasi Kota (Cache Otomatis Tanpa Beban CPU)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_city_stats AS
SELECT
  COUNT(*) AS total_reports,
  COUNT(*) FILTER (WHERE status = 'completed') AS total_resolved,
  COUNT(*) FILTER (WHERE status = 'in_progress' OR status = 'assigned') AS total_in_progress,
  COUNT(*) FILTER (WHERE status = 'pending') AS total_pending,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::numeric(10,2) AS avg_resolution_hours,
  NOW() AS last_refreshed_at
FROM public.reports
WHERE status != 'rejected';

-- Fungsi Refresh View Statistik (Dijalankan di background setiap 5 menit)
CREATE OR REPLACE FUNCTION public.refresh_city_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_city_stats;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_city_stats;
END;
$$;
