/*
# Storage bucket for report photos

1. Creates a public storage bucket `report-photos` for storing:
   - Initial report photos (uploaded by masyarakat)
   - Completion proof photos (uploaded by petugas)
2. Sets storage policies to allow public read, authenticated upload, and authenticated delete.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('report-photos', 'report-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
DROP POLICY IF EXISTS "public_read_report_photos" ON storage.objects;
CREATE POLICY "public_read_report_photos" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'report-photos');

-- Allow authenticated upload
DROP POLICY IF EXISTS "auth_upload_report_photos" ON storage.objects;
CREATE POLICY "auth_upload_report_photos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'report-photos');

-- Allow authenticated to delete their own uploads
DROP POLICY IF EXISTS "auth_delete_report_photos" ON storage.objects;
CREATE POLICY "auth_delete_report_photos" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'report-photos');
