-- ============================================================
-- Detectra AI — Storage Bucket "videos" (idempotent — safe to re-run)
-- Run this in Supabase Dashboard → SQL Editor after 001_init.sql
-- ============================================================
--
-- Creates the `videos` bucket used by the frontend uploader and grants the
-- authenticated user the ability to upload / read / delete files under their
-- own personal sub-folder. The backend uses the service-role key, which
-- bypasses RLS, so server-side downloads keep working regardless.
--
-- Path convention used by detectra-ai-main/src/lib/supabaseDb.ts:
--   uploads/<uuid>-<filename>
-- ============================================================

-- ── Bucket ────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,                        -- public so the backend can download via signed URL flow
  524288000,                   -- 500 MB
  ARRAY[
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'video/webm', 'video/x-flv', 'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Policies ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  -- Anyone (anon + authenticated) can read since bucket is public,
  -- but we still add an explicit SELECT policy for clarity.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Detectra: public read videos'
  ) THEN
    CREATE POLICY "Detectra: public read videos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'videos');
  END IF;

  -- Authenticated users can upload to the bucket.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Detectra: authenticated upload videos'
  ) THEN
    CREATE POLICY "Detectra: authenticated upload videos"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'videos');
  END IF;

  -- Authenticated users can update their own objects.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Detectra: authenticated update own videos'
  ) THEN
    CREATE POLICY "Detectra: authenticated update own videos"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'videos' AND owner = auth.uid())
      WITH CHECK (bucket_id = 'videos' AND owner = auth.uid());
  END IF;

  -- Authenticated users can delete their own objects.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Detectra: authenticated delete own videos'
  ) THEN
    CREATE POLICY "Detectra: authenticated delete own videos"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'videos' AND owner = auth.uid());
  END IF;
END $$;
