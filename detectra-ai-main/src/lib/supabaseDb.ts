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

// ─── video_uploads ────────────────────────────────────────────────────────────

export async function createVideoUpload(
  userId: string,
  jobId: string,
  title: string,
): Promise<VideoUpload | null> {
  const { data, error } = await supabase
    .from('video_uploads')
    .insert({
      user_id: userId,
      video_url: jobIdToVideoUrl(jobId),
      title,
      description: null,
      status: 'processing',
      analysis_results: null,
    })
    .select()
    .single();

  if (error) {
    console.error('[supabaseDb] createVideoUpload error:', error.message);
    return null;
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
    console.error('[supabaseDb] updateVideoUpload error:', error.message);
  }
}

export async function getUserVideoUploads(userId: string): Promise<VideoUpload[]> {
  const { data, error } = await supabase
    .from('video_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabaseDb] getUserVideoUploads error:', error.message);
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
      console.error('[supabaseDb] getVideoUploadByJobId error:', error.message);
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
    console.error('[supabaseDb] deleteVideoUpload error:', error.message);
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
    console.error('[supabaseDb] submitContactForm error:', error.message);
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
  const { error } = await supabase
    .from('demo_analytics')
    .insert({
      user_id: userId,
      session_id: sessionId,
      demo_type: demoType,
      action_type: actionType,
      metadata: metadata ?? {},
    });

  if (error) {
    console.error('[supabaseDb] trackDemoAnalytic error:', error.message);
  }
}
