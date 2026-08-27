-- Migration: Add is_anonymous and SLA estimation fields to reports table
-- Description: Adds is_anonymous flag for citizen privacy and estimated_completion_at for SLA tracking.

DO $$
BEGIN
    -- Add is_anonymous column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'is_anonymous'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
    END IF;

    -- Add estimated_completion_at column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'estimated_completion_at'
    ) THEN
        ALTER TABLE public.reports ADD COLUMN estimated_completion_at TIMESTAMPTZ;
    END IF;

    -- Add fcm_token column to profiles table for mobile push notifications
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'fcm_token'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN fcm_token TEXT;
    END IF;
END $$;

-- Update RLS or add helpful comments
COMMENT ON COLUMN public.reports.is_anonymous IS 'Whether the reporter identity should be masked in public feeds and maps';
COMMENT ON COLUMN public.reports.estimated_completion_at IS 'Target SLA completion timestamp calculated upon report creation';
COMMENT ON COLUMN public.profiles.fcm_token IS 'Firebase Cloud Messaging device token for push notifications';
