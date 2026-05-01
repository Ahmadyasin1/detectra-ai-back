/*
  # Video Uploads Table

  Creates the video_uploads table used by Detectra AI to track analysis jobs
  and cache results from the backend API.

  video_url stores the detectra job reference: detectra-job://{jobId}
  analysis_results stores the full serialized result blob from the API.
*/

CREATE TABLE IF NOT EXISTS public.video_uploads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_url        text NOT NULL,
  title            text NOT NULL DEFAULT 'Untitled Analysis',
  description      text,
  status           text NOT NULL DEFAULT 'processing'
                     CHECK (status IN ('processing', 'completed', 'failed')),
  analysis_results jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS video_uploads_user_id_idx ON public.video_uploads(user_id);
CREATE INDEX IF NOT EXISTS video_uploads_status_idx  ON public.video_uploads(status);

ALTER TABLE public.video_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own uploads"   ON public.video_uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON public.video_uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON public.video_uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON public.video_uploads;

CREATE POLICY "Users can view own uploads"
  ON public.video_uploads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads"
  ON public.video_uploads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads"
  ON public.video_uploads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads"
  ON public.video_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_at trigger (reuse function if already created by user_profiles migration)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS video_uploads_updated_at ON public.video_uploads;

CREATE TRIGGER video_uploads_updated_at
  BEFORE UPDATE ON public.video_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
