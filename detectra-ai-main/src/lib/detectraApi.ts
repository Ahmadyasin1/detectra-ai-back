const API_URL = ''; // Proxied via Vite dev server

import { supabase } from './supabase';

// ─── Enums / Literals ─────────────────────────────────────────────────────────

export type JobStatusValue =
  | 'pending'    // just submitted, waiting for worker
  | 'running'    // actively being processed
  | 'completed'  // finished successfully
  | 'failed'     // error occurred
  | 'cancelled'; // user cancelled

export type Severity   = 'low' | 'medium' | 'high' | 'critical';
export type RiskLevel  = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// ─── Backend data shapes (match analyze_videos.py dataclasses) ────────────────

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
}

// ─── Job status ───────────────────────────────────────────────────────────────

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
  status:      string;
  version:     string;
  timestamp:   string;
  jobs:        number;
  active_jobs: number;
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch<T>(path: string, init: RequestInit = {}, _retry = true): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const headers = await authHeader();
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...headers, ...(init.headers as Record<string, string> | undefined) },
    });

    if (res.status === 401 && _retry) {
      await supabase.auth.refreshSession();
      return apiFetch<T>(path, init, false);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(body.detail || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out — check your connection');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<ApiHealth> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error('API offline');
  return res.json();
}

export async function submitVideo(file: File): Promise<SubmitResponse> {
  const headers = await authHeader();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_URL}/api/analyze`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export function getJobStatus(jobId: string): Promise<JobStatus> {
  return apiFetch<JobStatus>(`/api/jobs/${jobId}`);
}

export function getJobResult(jobId: string): Promise<AnalysisResult> {
  return apiFetch<AnalysisResult>(`/api/jobs/${jobId}/result`);
}

export function listMyJobs(): Promise<JobStatus[]> {
  return apiFetch<JobStatus[]>('/api/my-jobs');
}

export function deleteJob(jobId: string): Promise<void> {
  return apiFetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
}

export function getWsUrl(jobId: string): string {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws/${jobId}`;
}

export function getRagJsonUrl(jobId: string): string {
  return `/api/jobs/${jobId}/rag`;
}

export function getReportUrl(jobId: string): string {
  return `/api/jobs/${jobId}/report`;
}

export function getVideoUrl(jobId: string): string {
  return `/api/jobs/${jobId}/video`;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export function riskColor(level: RiskLevel | string): string {
  switch ((level || '').toUpperCase()) {
    case 'CRITICAL': return '#ef4444'; // red-500
    case 'HIGH':     return '#f97316'; // orange-500
    case 'MEDIUM':   return '#eab308'; // yellow-500
    default:         return '#22c55e'; // green-500
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

export function anomalyColor(score: number): string {
  if (score > 0.75) return '#ef4444';
  if (score > 0.50) return '#f97316';
  if (score > 0.25) return '#eab308';
  return '#22d3ee';
}
