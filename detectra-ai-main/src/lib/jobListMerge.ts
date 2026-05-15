import type { JobStatus } from './detectraApi';
import type { VideoUpload } from './supabaseDb';
import { videoUrlToJobId } from './supabaseDb';

function uploadToSyntheticJob(u: VideoUpload, userId: string): JobStatus | null {
  const jobId = videoUrlToJobId(u.video_url);
  if (!jobId) return null;
  const completed = u.status === 'completed';
  const failed = u.status === 'failed';
  return {
    job_id: jobId,
    video_name: u.title || 'Untitled',
    user_id: userId,
    status: failed ? 'failed' : completed ? 'completed' : 'pending',
    progress: completed ? 100 : failed ? 0 : 0,
    stage: failed ? 'failed' : completed ? 'completed' : 'processing',
    created_at: u.created_at,
    started_at: u.created_at,
    completed_at: completed || failed ? u.updated_at : null,
    error: failed ? 'Stored as failed in your account' : null,
    processing_s: 0,
    has_result: Boolean(u.analysis_results),
    has_report: false,
    has_video: false,
  };
}

/** Merge in-memory API jobs with Supabase `video_uploads` so history survives API restarts. */
export function mergeJobsFromApiAndDatabase(
  apiJobs: JobStatus[],
  uploads: VideoUpload[],
  userId: string,
): JobStatus[] {
  const byId = new Map<string, JobStatus>();
  for (const j of apiJobs) {
    byId.set(j.job_id, j);
  }
  for (const u of uploads) {
    const syn = uploadToSyntheticJob(u, userId);
    if (syn && !byId.has(syn.job_id)) {
      byId.set(syn.job_id, syn);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function jobsFromUploadsOnly(uploads: VideoUpload[], userId: string): JobStatus[] {
  const list: JobStatus[] = [];
  for (const u of uploads) {
    const syn = uploadToSyntheticJob(u, userId);
    if (syn) list.push(syn);
  }
  return list.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
