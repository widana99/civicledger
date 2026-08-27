-- ═══════════════════════════════════════════════════════════════
-- CIVICLEDGER ENTERPRISE SECURITY HARDENING MIGRATION
-- Standard: OWASP Top 10 + CIS PostgreSQL Benchmark
-- Database Tables: reports, status_logs, completion_proofs, upvotes, comments, ratings, profiles, wilayah
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable Row Level Security on ALL public tables
ALTER TABLE IF EXISTS public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.completion_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wilayah ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.petugas_spesialisasi ENABLE ROW LEVEL SECURITY;

-- 2. Secure Function: Check if caller is verified admin (Prevents search_path hijacking)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. Secure Function: Check if caller is assigned field officer
CREATE OR REPLACE FUNCTION public.is_petugas()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'petugas'
  );
$$;

-- 4. Audit Log Table & Security Policies
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Anti-Flooding Database Trigger: Max 5 reports per user per 10 minutes
CREATE OR REPLACE FUNCTION public.check_report_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM public.reports
  WHERE reporter_id = auth.uid()
    AND created_at > (now() - INTERVAL '10 minutes');

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Batas pengiriman tercapai. Anda hanya dapat membuat maksimal 5 laporan per 10 menit demi keamanan sistem.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_report_rate_limit ON public.reports;
CREATE TRIGGER trigger_report_rate_limit
  BEFORE INSERT ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.check_report_rate_limit();

-- 6. Tighten Anonymous and Public RLS Policies on Reports
DROP POLICY IF EXISTS "Public can view non-rejected reports" ON public.reports;
CREATE POLICY "Public can view non-rejected reports"
  ON public.reports
  FOR SELECT
  TO public
  USING (status != 'rejected' OR auth.uid() = reporter_id OR public.is_admin() OR public.is_petugas());

DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
CREATE POLICY "Authenticated users can create reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can update own unverified reports" ON public.reports;
CREATE POLICY "Users can update own unverified reports"
  ON public.reports
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = reporter_id AND status = 'pending')
    OR public.is_admin()
    OR public.is_petugas()
  );

-- 7. Secure Permissions for Anon & Authenticated roles (Matching exact table names)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.reports TO anon;
GRANT SELECT ON public.wilayah TO anon;
GRANT SELECT ON public.status_logs TO anon;
GRANT SELECT ON public.comments TO anon;
GRANT SELECT ON public.upvotes TO anon;
GRANT SELECT ON public.ratings TO anon;
GRANT SELECT ON public.completion_proofs TO anon;

GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.upvotes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.status_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.completion_proofs TO authenticated;
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
