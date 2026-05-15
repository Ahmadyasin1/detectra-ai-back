import { supabase, isSupabaseConfigured } from './supabase';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-empty */

// --- Enums / Literals ---------------------------------------------------------

export type JobStatusValue =
  | 'pending'    // just submitted, waiting for worker
  | 'running'    // actively being processed
  | 'completed'  // finished successfully
  | 'failed'     // error occurred
  | 'cancelled'; // user cancelled

export type Severity   = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel  = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// --- Backend data shapes (match analyze_videos.py dataclasses) ----------------

export interface SurveillanceEvent {
  timestamp_s:  number;
  event_type:   string;   // fall | fight | loitering | crowd_surge | intrusion | ...
  severity:     Severity;
  description:  string;
  confidence:   number;   // 0-1
  track_ids:    number[];
}

export interface FusionInsight {
  window_start_s:         number;
  window_end_s:           number;
  scene_label:            string;
  anomaly_score:          number;   // 0-1
  visual_audio_alignment: number;   // 0-1
  confidence:             number;
  alert:                  boolean;
  severity:               Severity;
  contributing_factors:   string[];
  description:            string;
}

export interface SpeechSegment {
  start_s:       number;
  end_s:         number;
  text:          string;
  language:      string;   // ISO code e.g. "en"
  language_name: string;
  confidence:    number;
  is_noise:      boolean;
}

export interface AudioEvent {
  timestamp_s: number;
  event_type:  string;   // speech | scream | gunshot | siren | music | ...
  details:     string;
  confidence:  number;
}

export interface DetectedLanguage {
  code:          string;
  name:          string;
  confidence:    number;
  segment_count: number;
}

export interface TopObject {
  label: string;
  count: number;
}

/** Downsampled per-frame stats (from full `frame_results` on the server). */
export interface FrameAnalyticsPoint {
  t: number;
  person_count: number;
  action: string;
  motion: number;
}

export interface SeverityCounts {
  critical: number;
  high:     number;
  medium:   number;
  low:      number;
}

export interface AnalysisResult {
  // Video metadata
  video_path:             string;
  video_name:             string;   // computed by backend: video_path stem
  duration_s:             number;
  width:                  number;
  height:                 number;
  fps:                    number;
  total_frames:           number;

  // Detection results
  surveillance_events:    SurveillanceEvent[];
  fusion_insights:        FusionInsight[];
  speech_segments:        SpeechSegment[];
  audio_events:           AudioEvent[];
  unique_track_ids:       number[];
  /** Co-occurrence estimate — collapses ByteTrack ID-switch fragments (see backend). */
  distinct_individuals?:   number;
  total_object_count:     number;
  class_frequencies:      Record<string, number>;
  action_frequencies:     Record<string, number>;
  max_persons_in_frame:   number;
  max_concurrent_persons: number;
  peak_activity_ts:       number;
  full_transcript:        string;
  detected_languages:     DetectedLanguage[];
  summary:                string;
  processing_time_s:      number;

  // Computed by _serialize_analysis
  risk_level:         RiskLevel;
  risk_score:         number;         // 0-1 weighted severity score
  anomaly_timeline:   number[];       // per-second anomaly scores (index = second)
  severity_counts:    SeverityCounts;
  top_objects:        TopObject[];
  /** Present when the API serializes analysis with per-frame telemetry. */
  frame_analytics?:   FrameAnalyticsPoint[];
}

// --- Job status ---------------------------------------------------------------

export interface JobStatus {
  job_id:       string;
  video_name:   string;
  user_id:      string;
  status:       JobStatusValue;
  progress:     number;           // 0-100
  stage:        string;
  created_at:   string;
  started_at:   string | null;
  completed_at: string | null;
  error:        string | null;
  processing_s: number;
  has_result:   boolean;
  has_report:   boolean;
  has_video:    boolean;
}

export interface SubmitResponse {
  job_id:     string;
  status:     string;
  video_name: string;
  size_mb:    number;
  ws_url:     string;
}

export interface ApiHealth {
  status: string;
  version: string;
  timestamp: string;
  models_loaded: boolean;
  active_jobs: number;
  total_jobs: number;
}

export interface TranscriptTranslationResponse {
  job_id: string;
  target_lang: string;
  translated_text: string;
  message?: string;
}

export interface JobAskResponse {
  answer: string;
}

// --- HTTP client --------------------------------------------------------------

// Empty string = same-origin (Vite dev proxy / nginx). Set VITE_API_URL for split deployments.
export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

/** Build an absolute API URL, useful for non-JSON requests (downloads, live stream, etc.). */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${p}`;
}

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  timeoutMs?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  timeoutMs: 30_000,
};

// Exponential backoff with jitter
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(
  attempt: number,
  options: RetryOptions,
  lastResponseStatus?: number
): number {
  const baseDelayMs     = options.baseDelayMs ?? DEFAULT_RETRY_OPTIONS.baseDelayMs;
  const backoffMultiplier = options.backoffMultiplier ?? DEFAULT_RETRY_OPTIONS.backoffMultiplier;
  const maxDelayMs      = options.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs;
  const retryableStatuses = options.retryableStatuses ?? DEFAULT_RETRY_OPTIONS.retryableStatuses;

  if (lastResponseStatus === 401 || 
      (lastResponseStatus && lastResponseStatus >= 400 && lastResponseStatus < 500 && 
       !retryableStatuses.includes(lastResponseStatus))) {
    return -1;
  }

  const exponentialDelay = baseDelayMs * Math.pow(backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
  return Math.max(delay, baseDelayMs);
}

async function authHeader(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured) return {};
  try {
    const { data: sessionData } = (await supabase.auth.getSession()) as any;
    let token: string | undefined = sessionData?.session?.access_token;

    if (!token) {
      const { data: refreshData } = (await supabase.auth.refreshSession()) as any;
      token = refreshData?.session?.access_token || token;
    }

    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (err) {
    console.warn('[detectraApi] Auth header error (falling back to anonymous):', err);
    return {};
  }
}

// Enhanced fetch with retry logic
async function apiFetchWithRetry<T>(
  path: string,
  init: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {}
): Promise<T> {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  let lastError: Error | null = null;
  let lastStatus: number | undefined;

  for (let attempt = 0; attempt <= options.maxRetries!; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs!);

    try {
      const headers = await authHeader();
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...headers, ...(init.headers as Record<string, string> | undefined) },
      });

      lastStatus = res.status;

      if (res.status === 401) {
        if (attempt === 0) {
          await supabase.auth.refreshSession();
          const freshHeaders = await authHeader();
          const retryRes = await fetch(`${API_URL}${path}`, {
            ...init,
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json', ...freshHeaders, ...(init.headers as Record<string, string> | undefined) },
          });
          if (retryRes.ok) {
            return retryRes.json() as Promise<T>;
          }
        }
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(body.detail || `HTTP ${res.status}: ${res.statusText}`);
      }

      if (res.ok) {
        return res.json() as Promise<T>;
      }

      const delay = calculateDelay(attempt, options, res.status);
      if (delay > 0 && attempt < options.maxRetries!) {
        await sleep(delay);
        continue;
      }

      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `HTTP ${res.status}: ${res.statusText}`);
    } catch (err: unknown) {
      const delay = calculateDelay(attempt, options, lastStatus);
      
      if (err instanceof Error && err.name === 'AbortError') {
        if (attempt < options.maxRetries! && delay > 0) {
          await sleep(delay);
          continue;
        }
        throw new Error('Request timed out - check your connection');
      }
      
      if (attempt < options.maxRetries! && delay > 0) {
        await sleep(delay);
        continue;
      }

      lastError = err instanceof Error ? err : new Error('Unknown error');
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error('Request failed');
}

// Use enhanced retry by default for reliability
function fetchWithRetry<T>(path: string, init: RequestInit = {}): Promise<T> {
  return apiFetchWithRetry<T>(path, init);
}

// --- API calls ---------------------------------------------------------------

export async function checkHealth(): Promise<ApiHealth> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error('API offline');
  return res.json();
}

export async function submitVideo(
  file: File,
  _onProgress?: (pct: number) => void,
): Promise<SubmitResponse> {
  const headers = await authHeader();
  const form = new FormData();
  form.append('file', file);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);
  
  try {
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: 'POST',
      body: form,
      headers: headers as any,
      signal: controller.signal,
    });
    
    if (!res.ok) {
      let detail = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const body = await res.json();
        if (body.detail) detail = body.detail;
      } catch {}
      throw new Error(detail);
    }
    
    return await res.json() as SubmitResponse;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Upload timed out - file may be too large');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function submitVideoFromUrl(
  publicUrl: string | null,
  storagePath: string | null,
  bucket: string | null,
  videoName: string,
): Promise<SubmitResponse> {
  const headers = await authHeader();
  const body = JSON.stringify({
    public_url: publicUrl,
    storage_path: storagePath,
    bucket: bucket || null,
    video_name: videoName,
  });

  return await apiFetchWithRetry<SubmitResponse>(
    `/api/analyze/url`,
    {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    },
  );
}

export function getJobStatus(jobId: string): Promise<JobStatus> {
  return fetchWithRetry<JobStatus>(`/api/jobs/${jobId}`);
}

export function getJobResult(jobId: string): Promise<AnalysisResult> {
  return fetchWithRetry<AnalysisResult>(`/api/jobs/${jobId}/result`);
}

export async function listMyJobs(): Promise<JobStatus[]> {
  try {
    return await fetchWithRetry<JobStatus[]>('/api/my-jobs');
  } catch (err) {
    console.warn('[detectraApi] /api/my-jobs failed, falling back to /api/jobs:', err);
    return await fetchWithRetry<JobStatus[]>('/api/jobs');
  }
}

export function deleteJob(jobId: string): Promise<void> {
  return fetchWithRetry(`/api/jobs/${jobId}`, { method: 'DELETE' });
}

export function getWsUrl(jobId: string): string {
  // If a custom API host is configured (e.g. split frontend/backend deployment),
  // build the ws:// URL from it. Otherwise default to same-origin (works with
  // both Vite dev proxy and nginx reverse proxy).
  if (API_URL && /^https?:\/\//i.test(API_URL)) {
    const wsBase = API_URL.replace(/^http/i, 'ws');
    return `${wsBase}/ws/${jobId}`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws/${jobId}`;
}

/** Live-stream WebSocket URL (same routing rules as getWsUrl). */
export function getLiveWsUrl(): string {
  if (API_URL && /^https?:\/\//i.test(API_URL)) {
    const wsBase = API_URL.replace(/^http/i, 'ws');
    return `${wsBase}/ws/live`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws/live`;
}

export function getRagJsonUrl(jobId: string): string {
  return apiUrl(`/api/jobs/${jobId}/rag`);
}

export function getReportUrl(jobId: string): string {
  return apiUrl(`/api/jobs/${jobId}/report`);
}

export function getVideoUrl(jobId: string): string {
  return apiUrl(`/api/jobs/${jobId}/video`);
}

export function getTranslatedTranscript(
  jobId: string,
  targetLang: string
): Promise<TranscriptTranslationResponse> {
  const lang = encodeURIComponent(targetLang || 'en');
  return fetchWithRetry<TranscriptTranslationResponse>(`/api/jobs/${jobId}/translate?target_lang=${lang}`);
}

/** Server-side RAG Q&A (same pipeline as legacy dashboard) — uses HF_TOKEN on the API. */
export function askJobQuestion(jobId: string, question: string): Promise<JobAskResponse> {
  return fetchWithRetry<JobAskResponse>(`/api/jobs/${jobId}/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}

// --- UI helpers ---------------------------------------------------------------

export function riskColor(level: RiskLevel | string): string {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL': return '#ef4444';
    case 'HIGH':     return '#f97316';
    case 'MEDIUM':   return '#eab308';
    default:         return '#22c55e';
  }
}

export function riskTextClass(level: RiskLevel | string): string {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL': return 'text-red-400';
    case 'HIGH':     return 'text-orange-400';
    case 'MEDIUM':   return 'text-yellow-400';
    default:         return 'text-green-400';
  }
}

export function riskBgClass(level: RiskLevel | string): string {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL': return 'bg-red-500/15 border-red-500/40';
    case 'HIGH':     return 'bg-orange-500/15 border-orange-500/40';
    case 'MEDIUM':   return 'bg-yellow-500/15 border-yellow-500/40';
    default:         return 'bg-green-500/15 border-green-500/40';
  }
}

export function severityBadgeClass(sev: Severity | string): string {
  switch ((sev || '').toLowerCase()) {
    case 'critical': return 'bg-red-500/25 text-red-300 border-red-500/50';
    case 'high':     return 'bg-orange-500/25 text-orange-300 border-orange-500/50';
    case 'medium':   return 'bg-yellow-500/25 text-yellow-300 border-yellow-500/50';
    default:         return 'bg-blue-500/25 text-blue-300 border-blue-500/50';
  }
}

export function severityHex(sev: Severity | string): string {
  switch ((sev || '').toLowerCase()) {
    case 'critical': return '#ef4444';
    case 'high':     return '#f97316';
    case 'medium':   return '#eab308';
    default:         return '#3b82f6';
  }
}

export function statusLabel(status: JobStatusValue | string): string {
  switch (status) {
    case 'pending':   return 'Queued';
    case 'running':   return 'Analyzing';
    case 'completed': return 'Done';
    case 'failed':    return 'Failed';
    case 'cancelled': return 'Cancelled';
    default:          return status;
  }
}

export function statusBadgeClass(status: JobStatusValue | string): string {
  switch (status) {
    case 'completed': return 'text-green-400 bg-green-500/20';
    case 'running':   return 'text-cyan-400 bg-cyan-500/20';
    case 'pending':   return 'text-yellow-400 bg-yellow-500/20';
    case 'failed':    return 'text-red-400 bg-red-500/20';
    default:          return 'text-gray-400 bg-gray-500/20';
  }
}

export function fmtSeconds(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Distinct people estimated from tracker co-occurrence (not raw ID fragment count). */
export function distinctPersonCount(result: Pick<AnalysisResult, 'distinct_individuals' | 'unique_track_ids'>): number {
  const d = result.distinct_individuals;
  if (typeof d === 'number' && Number.isFinite(d) && d >= 0) return d;
  return (result.unique_track_ids ?? []).length;
}

/** Raw ByteTrack IDs accumulated over the video (often >> distinct people). */
export function trackFragmentCount(result: Pick<AnalysisResult, 'unique_track_ids'>): number {
  return (result.unique_track_ids ?? []).length;
}

export function anomalyColor(score: number): string {
  if (score > 0.75) return '#ef4444';
  if (score > 0.50) return '#f97316';
  if (score > 0.25) return '#eab308';
  return '#374151';
}