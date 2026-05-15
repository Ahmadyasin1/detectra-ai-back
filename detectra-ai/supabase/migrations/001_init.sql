-- ============================================================
-- Detectra AI — Full Schema v2 (idempotent — safe to re-run)
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── user_profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text,
  email           text,
  avatar_url      text,
  github_username text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users can view own profile') THEN
    CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ── video_uploads ──────────────────────────────────────────────────────────────
-- video_url stores the detectra job reference: detectra-job://{jobId}
-- status: 'processing' = in progress, 'completed' = done, 'failed' = errored
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
CREATE INDEX IF NOT EXISTS video_uploads_created_idx ON public.video_uploads(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS video_uploads_video_url_key ON public.video_uploads(video_url);

ALTER TABLE public.video_uploads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_uploads' AND policyname='Users can view own uploads') THEN
    CREATE POLICY "Users can view own uploads"
      ON public.video_uploads FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_uploads' AND policyname='Users can insert own uploads') THEN
    CREATE POLICY "Users can insert own uploads"
      ON public.video_uploads FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_uploads' AND policyname='Users can update own uploads') THEN
    CREATE POLICY "Users can update own uploads"
      ON public.video_uploads FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='video_uploads' AND policyname='Users can delete own uploads') THEN
    CREATE POLICY "Users can delete own uploads"
      ON public.video_uploads FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── contact_submissions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text NOT NULL,
  subject    text,
  message    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='contact_submissions' AND policyname='Anyone can submit contact form') THEN
    CREATE POLICY "Anyone can submit contact form"
      ON public.contact_submissions FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ── demo_analytics ────────────────────────────────────────────────────────────
-- Schema: event='{demoType}.{actionType}', properties=jsonb metadata blob
CREATE TABLE IF NOT EXISTS public.demo_analytics (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event      text NOT NULL,
  properties jsonb,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='demo_analytics' AND policyname='Anyone can insert demo analytics') THEN
    CREATE POLICY "Anyone can insert demo analytics"
      ON public.demo_analytics FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS video_uploads_updated_at ON public.video_uploads;
CREATE TRIGGER video_uploads_updated_at
  BEFORE UPDATE ON public.video_uploads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
