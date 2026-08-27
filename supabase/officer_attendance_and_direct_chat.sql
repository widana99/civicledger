-- ==============================================================================
-- CivicLedger: Officer Direct Chat & Realtime GPS Attendance System (V2)
-- Includes: Realtime Publication, Replica Identity, is_read, and Auto-Notification Triggers
-- ==============================================================================

-- 1. Table: officer_attendance
CREATE TABLE IF NOT EXISTS public.officer_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('check_in', 'break_start', 'break_end', 'check_out')),
  status TEXT NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time', 'late', 'normal')),
  auth_method TEXT NOT NULL DEFAULT 'biometric' CHECK (auth_method IN ('biometric', 'password_fallback', 'manual')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.officer_attendance 
  ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'biometric';

-- Set Replica Identity for reliable Realtime events
ALTER TABLE public.officer_attendance REPLICA IDENTITY FULL;

-- Index for fast attendance queries
CREATE INDEX IF NOT EXISTS idx_officer_attendance_officer_date 
  ON public.officer_attendance(officer_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.officer_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for officer_attendance
DROP POLICY IF EXISTS "Officers can insert their own attendance" ON public.officer_attendance;
CREATE POLICY "Officers can insert their own attendance"
  ON public.officer_attendance FOR INSERT
  WITH CHECK (auth.uid() = officer_id);

DROP POLICY IF EXISTS "Officers and Admins can view attendance" ON public.officer_attendance;
CREATE POLICY "Officers and Admins can view attendance"
  ON public.officer_attendance FOR SELECT
  USING (
    auth.uid() = officer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can manage all attendance" ON public.officer_attendance;
CREATE POLICY "Admins can manage all attendance"
  ON public.officer_attendance FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- 2. Table: officer_direct_chats (Direct Posko Command Channel)
CREATE TABLE IF NOT EXISTS public.officer_direct_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'umum' CHECK (category IN ('kendala', 'alat', 'laporan', 'darurat', 'umum')),
  is_flagged BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure is_read column exists
ALTER TABLE public.officer_direct_chats 
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

-- Set Replica Identity for reliable Realtime events
ALTER TABLE public.officer_direct_chats REPLICA IDENTITY FULL;

-- Index for direct chat queries
CREATE INDEX IF NOT EXISTS idx_officer_direct_chats_officer 
  ON public.officer_direct_chats(officer_id, created_at ASC);

-- Enable RLS
ALTER TABLE public.officer_direct_chats ENABLE ROW LEVEL SECURITY;

-- Policies for officer_direct_chats
DROP POLICY IF EXISTS "Officers and Admins can access direct chats" ON public.officer_direct_chats;
CREATE POLICY "Officers and Admins can access direct chats"
  ON public.officer_direct_chats FOR ALL
  USING (
    auth.uid() = officer_id OR 
    auth.uid() = sender_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.uid() = sender_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Automatic Notifications via Trigger for Attendance & Chats
CREATE OR REPLACE FUNCTION public.fn_notify_officer_events()
RETURNS TRIGGER AS $$
DECLARE
  v_officer_name TEXT;
  v_action_label TEXT;
  v_admin RECORD;
BEGIN
  -- Event A: New Attendance logged
  IF TG_TABLE_NAME = 'officer_attendance' THEN
    SELECT full_name INTO v_officer_name FROM public.profiles WHERE id = NEW.officer_id;
    
    IF NEW.type = 'check_in' THEN
      v_action_label := CASE WHEN NEW.status = 'late' THEN '🚨 Terlambat Masuk' ELSE '✅ Absen Masuk' END;
    ELSIF NEW.type = 'break_start' THEN
      v_action_label := '☕ Mulai Istirahat';
    ELSIF NEW.type = 'break_end' THEN
      v_action_label := '⏳ Selesai Istirahat';
    ELSIF NEW.type = 'check_out' THEN
      v_action_label := '🏁 Absen Pulang';
    END IF;

    -- Insert notification for all Admins
    FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at)
      VALUES (
        v_admin.id,
        'Presensi: ' || COALESCE(v_officer_name, 'Petugas Lapangan'),
        v_action_label || ' — ' || COALESCE(NEW.address, 'Koordinat GPS Tercatat'),
        'system',
        FALSE,
        NOW()
      );
    END LOOP;

  -- Event B: New Direct Chat logged
  ELSIF TG_TABLE_NAME = 'officer_direct_chats' THEN
    SELECT full_name INTO v_officer_name FROM public.profiles WHERE id = NEW.sender_id;
    
    -- If sender is officer -> Notify all Admins
    IF NEW.sender_id = NEW.officer_id THEN
      FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
        INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at)
        VALUES (
          v_admin.id,
          '💬 Chat Posko: ' || COALESCE(v_officer_name, 'Petugas'),
          '[' || UPPER(NEW.category) || '] ' || LEFT(NEW.message, 60),
          'comment',
          FALSE,
          NOW()
        );
      END LOOP;
    ELSE
      -- If sender is Admin -> Notify target officer
      INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at)
      VALUES (
        NEW.officer_id,
        '💬 Pesan dari Admin Posko',
        LEFT(NEW.message, 60),
        'comment',
        FALSE,
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_notify_attendance ON public.officer_attendance;
CREATE TRIGGER trg_notify_attendance
  AFTER INSERT ON public.officer_attendance
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_officer_events();

DROP TRIGGER IF EXISTS trg_notify_direct_chat ON public.officer_direct_chats;
CREATE TRIGGER trg_notify_direct_chat
  AFTER INSERT ON public.officer_direct_chats
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_officer_events();

-- 4. Enable Realtime publication for both tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.officer_attendance;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.officer_direct_chats;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
