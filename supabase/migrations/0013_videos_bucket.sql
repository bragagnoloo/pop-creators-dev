-- =============================================================================
-- Storage: bucket videos (público, sem limite fixo — usa limite do plano Pro)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
  VALUES (
    'videos',
    'videos',
    true,
    ARRAY['video/mp4','video/webm','video/quicktime']
  )
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "videos: read authenticated"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'videos');

CREATE POLICY "videos: admin insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'videos' AND is_admin());

CREATE POLICY "videos: admin update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'videos' AND is_admin())
  WITH CHECK (bucket_id = 'videos' AND is_admin());

CREATE POLICY "videos: admin delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'videos' AND is_admin());
