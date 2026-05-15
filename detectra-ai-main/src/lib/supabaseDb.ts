import { supabase, isSupabaseConfigured } from './supabase';
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

interface SupabaseLikeError {
  message: string;
  code?: string;
  hint?: string;
  details?: string;
}

function logSupabaseError(fn: string, error: SupabaseLikeError): void {
  console.error(`[supabaseDb] ${fn} error:`, {
    message: error.message,
    code: error.code ?? 'n/a',
    hint: error.hint ?? 'n/a',
    details: error.details ?? 'n/a',
  });
}

/** Resolve to current access token, or null if no session / Supabase disabled. */
async function maybeSession(): Promise<{ token: string | null; userId: string | null }> {
  if (!isSupabaseConfigured) return { token: null, userId: null };
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.access_token) return { token: null, userId: null };
    return {
      token: data.session.access_token,
      userId: data.session.user?.id ?? null,
    };
  } catch {
    return { token: null, userId: null };
  }
}

// ─── video_uploads ────────────────────────────────────────────────────────────

export async function createVideoUpload(
  userId: string,
  jobId: string,
  title: string,
): Promise<VideoUpload | null> {
  if (!isSupabaseConfigured) return null;

  const { token } = await maybeSession();
  if (!token) {
    console.warn('[supabaseDb] createVideoUpload skipped — no session');
    return null;
  }

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
    return null;
  }
  return data as VideoUpload;
}

export async function updateVideoUpload(
  userId: string,
  jobId: string,
  update: Partial<Pick<VideoUpload, 'status' | 'analysis_results' | 'title' | 'description'>>,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('video_uploads')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('video_url', jobIdToVideoUrl(jobId));

  if (error) logSupabaseError('updateVideoUpload', error);
}

export async function getUserVideoUploads(userId: string): Promise<VideoUpload[]> {
  if (!isSupabaseConfigured) return [];

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
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('video_uploads')
    .select('*')
    .eq('user_id', userId)
    .eq('video_url', jobIdToVideoUrl(jobId))
    .single();

  if (error) {
    if (error.code !== 'PGRST116') logSupabaseError('getVideoUploadByJobId', error);
    return null;
  }
  return data as VideoUpload;
}

const STORAGE_BUCKET = (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined) || 'videos';

export async function uploadVideoFileToBucket(
  file: File,
  bucketName: string = STORAGE_BUCKET,
): Promise<{ storagePath: string; publicUrl: string | null; error: string | null }> {
  if (!isSupabaseConfigured) {
    return { storagePath: '', publicUrl: null, error: 'guest_mode' };
  }

  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `uploads/${uuid}-${sanitizedFileName}`;

  const { error } = await supabase.storage.from(bucketName).upload(storagePath, file, {
    upsert: false,
    cacheControl: '3600',
  });

  if (error) {
    logSupabaseError('uploadVideoFileToBucket', error);
    return { storagePath, publicUrl: null, error: error.message };
  }

  const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: publicUrlData?.publicUrl ?? null,
    error: null,
  };
}

export async function deleteVideoUpload(userId: string, jobId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('video_uploads')
    .delete()
    .eq('user_id', userId)
    .eq('video_url', jobIdToVideoUrl(jobId));

  if (error) logSupabaseError('deleteVideoUpload', error);
}

// ─── contact_submissions ──────────────────────────────────────────────────────

export async function submitContactForm(
  submission: Omit<ContactSubmission, 'id' | 'created_at'>,
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured) {
    console.warn('[supabaseDb] submitContactForm — Supabase disabled, submission discarded');
    return { error: 'guest_mode' };
  }

  const { error } = await supabase.from('contact_submissions').insert({
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

export async function trackDemoAnalytic(
  userId: string | null,
  sessionId: string,
  demoType: string,
  actionType: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase.from('demo_analytics').insert({
    event: `${demoType}.${actionType}`,
    properties: {
      session_id: sessionId,
      demo_type: demoType,
      action_type: actionType,
      ...metadata,
    },
    user_id: userId,
  });

  if (error) {
    logSupabaseError('trackDemoAnalytic', error);
  }
}
