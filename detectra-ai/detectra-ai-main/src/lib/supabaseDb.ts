import { supabase } from './supabase';
import type { AnalysisResult } from './detectraApi';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VideoUpload {
  id: string;
  user_id: string;
  video_url: string;           // stores "detectra-job://{jobId}"
  title: string;
  description: string | null;
  status: 'processing' | 'completed' | 'failed';
  analysis_results: AnalysisResult | null;
  created_at: string;
  updated_at: string;
}

export interface ContactSubmission {
  id?: string;
  name: string;
  email: string;
  message: string;
  created_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function jobIdToVideoUrl(jobId: string): string {
  return `detectra-job://${jobId}`;
}

export function videoUrlToJobId(videoUrl: string): string | null {
  if (!videoUrl?.startsWith('detectra-job://')) return null;
  return videoUrl.slice('detectra-job://'.length) || null;
}

function logSupabaseError(fn: string, error: { message: string; code?: string; hint?: string; details?: string }) {
  console.error(`[supabaseDb] ${fn} error:`, {
    message: error.message,
    code: error.code ?? 'n/a',
    hint: error.hint ?? 'n/a',
    details: error.details ?? 'n/a',
  });
}

async function requireSession(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Auth error: ${error.message}`);
  if (!session?.access_token) throw new Error('Not authenticated — please sign in again');
  return session.access_token;
}

// ─── video_uploads ────────────────────────────────────────────────────────────

export async function createVideoUpload(
  userId: string,
  jobId: string,
  title: string,
): Promise<VideoUpload> {
  // Verify active session before attempting insert (avoids silent RLS failures)
  await requireSession();

  const { data, error } = await supabase
    .from('video_uploads')
    .insert({
      user_id: userId,
      video_url: jobIdToVideoUrl(jobId),
      title: title || 'Untitled Analysis',
      description: null,
      status: 'processing',
      analysis_results: null,
    })
    .select()
    .single();

  if (error) {
    logSupabaseError('createVideoUpload', error);
    const hint = error.code === '42501'
      ? ' (RLS policy violation — run the migration SQL in Supabase Dashboard)'
      : error.code === '23503'
        ? ' (foreign key violation — user may not be fully confirmed)'
        : error.code === '42P01'
          ? ' (table missing — run migration SQL in Supabase Dashboard)'
          : '';
    throw new Error(`Failed to save job to database: ${error.message}${hint} [${error.code ?? 'unknown'}]`);
  }
  return data as VideoUpload;
}

export async function updateVideoUpload(
  userId: string,
  jobId: string,
  update: Partial<Pick<VideoUpload, 'status' | 'analysis_results' | 'title' | 'description'>>,
): Promise<void> {
  const { error } = await supabase
    .from('video_uploads')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('video_url', jobIdToVideoUrl(jobId));

  if (error) {
    logSupabaseError('updateVideoUpload', error);
  }
}

export async function getUserVideoUploads(userId: string): Promise<VideoUpload[]> {
  const { data, error } = await supabase
    .from('video_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('getUserVideoUploads', error);
    return [];
  }
  return (data ?? []) as VideoUpload[];
}

export async function getVideoUploadByJobId(
  userId: string,
  jobId: string,
): Promise<VideoUpload | null> {
  const { data, error } = await supabase
    .from('video_uploads')
    .select('*')
    .eq('user_id', userId)
    .eq('video_url', jobIdToVideoUrl(jobId))
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logSupabaseError('getVideoUploadByJobId', error);
    }
    return null;
  }
  return data as VideoUpload;
}

export async function deleteVideoUpload(userId: string, jobId: string): Promise<void> {
  const { error } = await supabase
    .from('video_uploads')
    .delete()
    .eq('user_id', userId)
    .eq('video_url', jobIdToVideoUrl(jobId));

  if (error) {
    logSupabaseError('deleteVideoUpload', error);
  }
}

// ─── contact_submissions ──────────────────────────────────────────────────────

export async function submitContactForm(
  submission: Omit<ContactSubmission, 'id' | 'created_at'>,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('contact_submissions')
    .insert({
      name: submission.name,
      email: submission.email,
      message: submission.message,
    });

  if (error) {
    logSupabaseError('submitContactForm', error);
    return { error: error.message };
  }
  return { error: null };
}

// ─── demo_analytics ───────────────────────────────────────────────────────────
// DB schema: { event text, properties jsonb, user_id uuid }

export async function trackDemoAnalytic(
  userId: string | null,
  _sessionId: string,
  demoType: string,
  actionType: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from('demo_analytics')
    .insert({
      event: `${demoType}.${actionType}`,
      properties: { session_id: _sessionId, demo_type: demoType, action_type: actionType, ...metadata },
      user_id: userId,
    });

  if (error) {
    // Non-fatal analytics failure — log but don't throw
    logSupabaseError('trackDemoAnalytic', error);
  }
}
