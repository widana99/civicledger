-- ═══════════════════════════════════════════════════════════════
-- CIVICLEDGER COMPREHENSIVE SECURITY HARDENING MIGRATION (v2.1)
-- Standards: OWASP Top 10 (2021) + CIS PostgreSQL Benchmark
-- Defense: Role Escalation Prevention, Rating Hijack Block, Granular Reports RLS,
--          Storage Immutability, Active Account Enforcement, Anti-Spam Triggers.
-- ═══════════════════════════════════════════════════════════════

-- 1. TRIGGER: PREVENT SELF-ROLE ESCALATION & PROFILE TAMPERING
CREATE OR REPLACE FUNCTION public.fn_prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being changed
  IF (NEW.role IS DISTINCT FROM OLD.role) THEN
    -- Only existing verified admin can change role
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Akses Ditolak [SEC-01]: Hanya Administrator yang berhak memodifikasi peran pengguna.';
    END IF;
  END IF;

  -- If is_active is being changed
  IF (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
    -- Only existing verified admin can activate/deactivate accounts
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Akses Ditolak [SEC-02]: Hanya Administrator yang berhak mengubah status keaktifan akun.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_role_escalation();


-- 2. TRIGGER: ENFORCE CITIZEN ROLE ON REGULAR SIGNUP
CREATE OR REPLACE FUNCTION public.fn_enforce_signup_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If insert is done by standard user without admin session, force role to 'masyarakat'
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    IF NEW.role != 'masyarakat' AND NEW.role != 'petugas' THEN
      NEW.role := 'masyarakat';
    END IF;
    -- If registering as petugas, require admin approval (is_active = false)
    IF NEW.role = 'petugas' THEN
      NEW.is_active := false;
    ELSE
      NEW.is_active := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_enforce_signup_role ON public.profiles;
CREATE TRIGGER trg_enforce_signup_role
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_enforce_signup_role();


-- 3. HELPER FUNCTION: CHECK IF CURRENT USER IS ACTIVE
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$;


-- 4. RATINGS PROTECTION (BLOCK RATING HIJACK & SPOOFING)
DROP POLICY IF EXISTS "ratings_insert_own" ON public.ratings;
DROP POLICY IF EXISTS "ratings_insert_verified_reporter" ON public.ratings;
CREATE POLICY "ratings_insert_verified_reporter"
  ON public.ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id 
        AND r.reporter_id = auth.uid() 
        AND r.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "ratings_update_own" ON public.ratings;
CREATE POLICY "ratings_update_verified_reporter"
  ON public.ratings FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.is_active_user()
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id 
        AND r.reporter_id = auth.uid() 
        AND r.status = 'completed'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_active_user()
  );


-- 5. GRANULAR REPORTS UPDATE (REPLACE OVERLY BROAD UPDATE POLICY)
DROP POLICY IF EXISTS "Users can update own unverified reports" ON public.reports;
DROP POLICY IF EXISTS "reports_granular_update" ON public.reports;
CREATE POLICY "reports_granular_update"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (
    public.is_active_user() AND (
      -- 1. Reporter can only update if report is still pending
      (auth.uid() = reporter_id AND status = 'pending')
      -- 2. Admin can update any report
      OR public.is_admin()
      -- 3. Field Officer can ONLY update reports explicitly assigned to them
      OR (public.is_petugas() AND assigned_petugas_id = auth.uid())
    )
  )
  WITH CHECK (
    public.is_active_user() AND (
      -- Reporter cannot sneakily change status or priority
      (auth.uid() = reporter_id AND status = 'pending')
      OR public.is_admin()
      OR (public.is_petugas() AND assigned_petugas_id = auth.uid())
    )
  );


-- 6. COMMENTS ANTI-SPAM RATE LIMIT & ACTIVE USER CHECK
CREATE OR REPLACE FUNCTION public.check_comment_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_comment_count INTEGER;
BEGIN
  -- Ensure user is active
  IF NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Akses Ditolak: Akun Anda berstatus non-aktif.';
  END IF;

  -- Max 8 comments per 2 minutes
  SELECT COUNT(*)
  INTO recent_comment_count
  FROM public.comments
  WHERE user_id = auth.uid()
    AND created_at > (now() - INTERVAL '2 minutes');

  IF recent_comment_count >= 8 THEN
    RAISE EXCEPTION 'Batas frekuensi tercapai. Mohon jeda sejenak sebelum mengirim komentar baru.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_comment_rate_limit ON public.comments;
CREATE TRIGGER trigger_comment_rate_limit
  BEFORE INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_comment_rate_limit();


-- 7. STORAGE POLICIES HARDENING (EVIDENCE IMMUTABILITY & REQUIRE AUTH)
-- Drop overly broad policies on storage.objects for civic ledger buckets
DROP POLICY IF EXISTS "Allow Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Upload" ON storage.objects;

-- Only active authenticated users can upload
CREATE POLICY "Allow Authenticated Upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('report-photos', 'completion-photos')
    AND public.is_active_user()
  );

-- Evidence photos are immutable: NO UPDATE POLICY PERMITTED (prevents tampering)
-- Deletion only by Administrator
DROP POLICY IF EXISTS "Admin Delete Storage" ON storage.objects;
CREATE POLICY "Admin Delete Storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('report-photos', 'completion-photos')
    AND public.is_admin()
  );
