import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload, Film, CheckCircle, AlertTriangle, Activity, Trash2,
  RefreshCw, Eye, Zap, Clock, ChevronRight, X, BarChart3,
  Shield, TrendingUp, Cpu, Wifi, WifiOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  submitVideo, getJobStatus, deleteJob, checkHealth,
  statusLabel, statusBadgeClass, fmtDate, fmtDuration, riskTextClass,
  type JobStatusValue,
} from '../lib/detectraApi';
import {
  getUserVideoUploads, createVideoUpload, deleteVideoUpload, videoUrlToJobId,
  type VideoUpload,
} from '../lib/supabaseDb';

const ACCEPTED_TYPES = new Set([
  'video/mp4', 'video/avi', 'video/quicktime',
  'video/x-matroska', 'video/webm', 'video/x-msvideo',
]);
const ACCEPTED_EXT = ['.mp4', '.avi', '.mov', '.mkv', '.webm'];
const MAX_MB = 500;

const CAPABILITIES = [
  { label: 'YOLOv8 Detection',   color: 'text-cyan-400',   bg: 'bg-cyan-500/10'   },
  { label: 'ByteTrack Persons',  color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { label: 'Whisper Speech',     color: 'text-green-400',  bg: 'bg-green-500/10'  },
  { label: 'YAMNet Audio',       color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { label: 'VideoMAE Actions',   color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { label: 'Fusion Transformer', color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
];

// ─── Merged display job ───────────────────────────────────────────────────────

interface DisplayJob {
  dbId: string;
  jobId: string;
  title: string;
  status: JobStatusValue;
  progress: number;
  stage: string;
  createdAt: string;
  processingTime: number;
  error: string | null;
  hasResult: boolean;
  riskLevel?: string;
}

function toDisplayJob(upload: VideoUpload, liveStatus?: Partial<DisplayJob>): DisplayJob {
  const jobId = videoUrlToJobId(upload.video_url) ?? upload.id;
  const result = upload.analysis_results;
  return {
    dbId: upload.id,
    jobId,
    title: upload.title,
    status: (liveStatus?.status ?? upload.status) as JobStatusValue,
    progress: liveStatus?.progress ?? (upload.status === 'completed' ? 100 : 0),
    stage: liveStatus?.stage ?? '',
    createdAt: upload.created_at,
    processingTime: liveStatus?.processingTime ?? (result?.processing_time_s ?? 0),
    error: liveStatus?.error ?? null,
    hasResult: !!result || liveStatus?.hasResult === true,
    riskLevel: result?.risk_level,
  };
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({
  onFile, uploading, uploadProgress, uploadError, onClearError, apiOnline,
}: {
  onFile: (f: File) => void;
  uploading: boolean;
  uploadProgress: number;
  uploadError: string;
  onClearError: () => void;
  apiOnline: boolean | null;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const disabled = uploading || apiOnline === false;

  const validate = (file: File): string | null => {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXT.includes(ext))
      return `Unsupported format. Use: ${ACCEPTED_EXT.join(', ')}`;
    if (file.size > MAX_MB * 1024 * 1024)
      return `File too large — max ${MAX_MB} MB (yours: ${(file.size / 1024 / 1024).toFixed(0)} MB)`;
    return null;
  };

  const handle = (file: File) => {
    if (disabled) return;
    const err = validate(file);
    if (err) { onClearError(); setTimeout(() => alert(err), 0); }
    else onFile(file);
  };

  return (
    <div className="space-y-3">
      {/* Offline blocker */}
      {apiOnline === false && !uploading && (
        <div className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-300 text-sm">
          <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
          Upload disabled — start the backend server first:&nbsp;
          <code className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded text-orange-300 font-mono text-xs">python api_server.py</code>
        </div>
      )}
      <div
        onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f && !disabled) handle(f); }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 select-none overflow-hidden ${
          disabled && !uploading ? 'border-gray-800 bg-gray-900/50 cursor-not-allowed opacity-60'
          : uploading    ? 'border-cyan-500/60 bg-cyan-500/5 cursor-default'
          : dragging   ? 'border-cyan-400 bg-cyan-400/8 shadow-[0_0_30px_rgba(34,211,238,0.12)] cursor-copy'
          : 'border-gray-700 bg-gray-900 hover:border-cyan-500/60 hover:bg-gray-900/80 hover:shadow-[0_0_20px_rgba(34,211,238,0.06)] cursor-pointer'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handle(f); e.target.value = ''; }}
        />

        {uploading ? (
          <div className="p-12 space-y-5 text-center">
            <div className="relative w-24 h-24 mx-auto">
              <svg viewBox="0 0 96 96" className="w-24 h-24 -rotate-90">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#1f2937" strokeWidth="7" />
                <circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke="url(#upload-grad)" strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - uploadProgress / 100)}`}
                  className="transition-all duration-500"
                />
                <defs>
                  <linearGradient id="upload-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                {uploadProgress}%
              </span>
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Uploading video…</p>
              <p className="text-gray-500 text-sm mt-1">Queuing for multimodal AI analysis</p>
            </div>
          </div>
        ) : (
          <div className="p-10">
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center mb-4 transition-transform duration-200 ${dragging ? 'scale-110' : ''}`}>
                <Upload className={`w-9 h-9 text-cyan-400 transition-transform duration-200 ${dragging ? 'scale-110' : ''}`} />
              </div>
              <p className="text-white font-bold text-xl">
                {dragging ? 'Drop to analyze' : 'Drop video to analyze'}
              </p>
              <p className="text-gray-500 text-sm mt-1.5">
                or <span className="text-cyan-400 underline underline-offset-2">browse files</span> — up to {MAX_MB} MB
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-3">
              {CAPABILITIES.map(cap => (
                <span key={cap.label} className={`px-2.5 py-1 ${cap.bg} ${cap.color} text-xs rounded-full border border-current/20 font-medium`}>
                  {cap.label}
                </span>
              ))}
            </div>
            <p className="text-center text-gray-700 text-xs">{ACCEPTED_EXT.join(' • ')}</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{uploadError}</span>
            <button onClick={onClearError}><X className="w-3.5 h-3.5 opacity-60 hover:opacity-100" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Job card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onDelete }: { job: DisplayJob; onDelete: () => void }) {
  const isActive = job.status === 'running' || job.status === 'pending';
  const isDone   = job.status === 'completed';
  const isFailed = job.status === 'failed';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className={`group relative card-dark transition-all duration-200 ${
        isActive ? 'border-cyan-500/30 glow-cyan'
        : isDone  ? 'hover:border-green-500/30'
        : isFailed ? 'border-red-500/20'
        : 'hover:border-gray-700'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3.5">

          {/* Status icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isActive ? 'bg-cyan-500/15' : isDone ? 'bg-green-500/15' : isFailed ? 'bg-red-500/15' : 'bg-gray-800'
          }`}>
            {isActive  ? <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
            : isDone   ? <CheckCircle className="w-5 h-5 text-green-400" />
            : isFailed ? <AlertTriangle className="w-5 h-5 text-red-400" />
            :             <Clock className="w-5 h-5 text-gray-500" />}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold truncate max-w-xs text-sm">{job.title}</p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(job.status)}`}>
                {statusLabel(job.status)}
              </span>
              {isDone && job.riskLevel && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 border border-gray-700 ${riskTextClass(job.riskLevel)}`}>
                  {job.riskLevel}
                </span>
              )}
              {isDone && job.hasResult && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/15 text-blue-400">Report</span>
              )}
            </div>
            <p className="text-gray-600 text-xs mt-0.5">{fmtDate(job.createdAt)}</p>

            {isActive && (
              <div className="mt-2.5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 capitalize">{(job.stage || 'initializing').replace(/_/g, ' ')}</span>
                  <span className="text-cyan-400 font-semibold tabular-nums">{job.progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                    animate={{ width: `${job.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            )}

            {isDone && job.processingTime > 0 && (
              <p className="text-gray-600 text-xs mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Processed in {fmtDuration(job.processingTime)}
              </p>
            )}

            {isFailed && job.error && (
              <p className="text-red-500/80 text-xs mt-1 truncate">{job.error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDone && (
              <Link to={`/dashboard/results/${job.jobId}`}>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 rounded-xl text-xs border border-green-500/30 transition-colors font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Results
                </motion.button>
              </Link>
            )}
            {isActive && (
              <Link to={`/dashboard/analyze/${job.jobId}`}>
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 rounded-xl text-xs border border-cyan-500/30 transition-colors font-medium"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Live Track
                </motion.button>
              </Link>
            )}
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            {isDone && (
              <ChevronRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
        </div>
      </div>

      {isActive && (
        <div className="absolute inset-0 rounded-2xl border border-cyan-500/15 animate-pulse pointer-events-none" />
      )}
    </motion.div>
  );
}

function getGreeting(name: string) {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${prefix}, ${name}`;
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs]             = useState<DisplayJob[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError]       = useState('');

  const [apiOnline, setApiOnline]                   = useState<boolean | null>(null);
  const [apiBannerDismissed, setApiBannerDismissed] = useState(false);

  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadJobsRef  = useRef<(silent?: boolean) => Promise<void>>(() => Promise.resolve());

  // Load jobs from Supabase, then enrich active ones with live API status
  const loadJobs = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const uploads = await getUserVideoUploads(user.id);
      const display: DisplayJob[] = [];

      await Promise.all(uploads.map(async upload => {
        const jobId = videoUrlToJobId(upload.video_url);
        let liveData: Partial<DisplayJob> | undefined;

        if (upload.status === 'processing' && jobId) {
          try {
            const live = await getJobStatus(jobId);
            liveData = {
              status: live.status,
              progress: live.progress,
              stage: live.stage,
              processingTime: live.processing_s,
              error: live.error,
              hasResult: live.has_result,
            };
          } catch {
            // API offline — show what we have from DB
          }
        }

        display.push(toDisplayJob(upload, liveData));
      }));

      // Sort newest first
      display.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setJobs(display);
      setFetchError('');
    } catch (e: unknown) {
      if (!silent) setFetchError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Keep ref always pointing to latest loadJobs so interval never goes stale
  useEffect(() => { loadJobsRef.current = loadJobs; }, [loadJobs]);

  // Initial load
  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Poll active jobs every 4s — uses ref so interval always calls latest loadJobs
  useEffect(() => {
    const hasActive = jobs.some(j => j.status === 'running' || j.status === 'pending');
    if (!hasActive) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (!pollRef.current) {
      pollRef.current = setInterval(() => loadJobsRef.current(true), 4000);
    }
  }, [jobs]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Check API health
  useEffect(() => {
    checkHealth()
      .then(h => setApiOnline(h.status === 'ok'))
      .catch(() => setApiOnline(false));
  }, []);

  const handleFile = async (file: File) => {
    if (!user) return;
    setUploadError('');
    setUploading(true);
    setUploadProgress(5);
    const interval = setInterval(() => setUploadProgress(p => Math.min(p + 7, 88)), 350);
    try {
      const res = await submitVideo(file);
      clearInterval(interval);
      setUploadProgress(100);
      // Persist to Supabase immediately
      await createVideoUpload(user.id, res.job_id, res.video_name);
      await loadJobs(true);
      setTimeout(() => navigate(`/dashboard/analyze/${res.job_id}`), 400);
    } catch (e: unknown) {
      clearInterval(interval);
      setUploadError(e instanceof Error ? e.message : 'Upload failed — check if the server is running');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (job: DisplayJob) => {
    if (!user || !confirm('Delete this analysis and its data?')) return;
    try {
      // Delete from API (best effort)
      if (apiOnline) await deleteJob(job.jobId).catch(() => {});
      // Delete from Supabase
      await deleteVideoUpload(user.id, job.jobId);
      setJobs(prev => prev.filter(j => j.jobId !== job.jobId));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const stats = {
    total:  jobs.length,
    done:   jobs.filter(j => j.status === 'completed').length,
    active: jobs.filter(j => j.status === 'running' || j.status === 'pending').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Analyst';

  return (
    <div className="min-h-screen bg-gray-950 pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Welcome banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 mb-8 p-6"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,_var(--tw-gradient-stops))] from-cyan-500/6 via-transparent to-transparent" />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {getGreeting(displayName)} 👋
              </h1>
              <p className="text-gray-500 mt-1 text-sm max-w-md">
                Drop a video below to trigger the full 6-model multimodal AI pipeline — detection, tracking, speech, audio, actions, and fusion.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {apiOnline !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                  apiOnline
                    ? 'bg-green-500/10 text-green-400 border-green-500/25'
                    : 'bg-red-500/10 text-red-400 border-red-500/25'
                }`}>
                  {apiOnline
                    ? <><Wifi className="w-3.5 h-3.5" /><span>API Online</span></>
                    : <><WifiOff className="w-3.5 h-3.5" /><span>API Offline</span></>}
                </div>
              )}
              <button
                onClick={() => { setRefreshing(true); loadJobs(true); }}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl border border-gray-700 text-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── API offline banner ── */}
        <AnimatePresence>
          {apiOnline === false && !apiBannerDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-start gap-3 px-4 py-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300"
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-200 mb-0.5">Backend server is offline</p>
                <p className="text-amber-400/80 text-xs leading-relaxed">
                  Start the API server to enable uploads and analysis:&nbsp;
                  <code className="px-2 py-0.5 bg-amber-500/10 rounded text-amber-300 font-mono text-xs border border-amber-500/20">
                    python api_server.py
                  </code>
                  &nbsp;— Previous results are still available below.
                </p>
              </div>
              <button onClick={() => setApiBannerDismissed(true)} className="text-amber-500 hover:text-amber-300 flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
        >
          {[
            { label: 'Total Analyses', value: stats.total,  icon: BarChart3,     color: 'text-cyan-400',  bg: 'from-cyan-500/15 to-cyan-500/5',  border: 'border-cyan-500/20'  },
            { label: 'Completed',      value: stats.done,   icon: CheckCircle,   color: 'text-green-400', bg: 'from-green-500/15 to-green-500/5', border: 'border-green-500/20' },
            { label: 'In Progress',    value: stats.active, icon: Cpu,           color: 'text-blue-400',  bg: 'from-blue-500/15 to-blue-500/5',   border: 'border-blue-500/20'  },
            { label: 'Failed',         value: stats.failed, icon: AlertTriangle, color: 'text-red-400',   bg: 'from-red-500/15 to-red-500/5',     border: 'border-red-500/20'   },
          ].map(({ label, value, icon: Icon, color, bg, border }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.04 }}
              className={`bg-gradient-to-br ${bg} rounded-2xl border ${border} p-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: 18, height: 18 }} />
                {stats.active > 0 && label === 'In Progress' && (
                  <span className="status-dot-active" />
                )}
              </div>
              <p className="text-2xl font-extrabold text-white tabular-nums">{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Upload zone ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest">New Analysis</h2>
          </div>
          <UploadZone
            onFile={handleFile}
            uploading={uploading}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
            onClearError={() => setUploadError('')}
            apiOnline={apiOnline}
          />
        </motion.div>

        {/* ── Jobs list ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Analysis History
            </h2>
            {stats.active > 0 && (
              <span className="flex items-center gap-1.5 badge-cyan text-xs">
                <span className="status-dot-active" />
                {stats.active} active
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-20 rounded-2xl border border-gray-800" />
              ))}
            </div>
          ) : fetchError ? (
            <div className="text-center py-14 card-dark">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-red-300 text-sm font-medium">{fetchError}</p>
              <button onClick={() => loadJobs()} className="mt-4 btn-dark text-sm">Retry</button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 card-dark">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center mb-5">
                <Film className="w-10 h-10 text-gray-600" />
              </div>
              <p className="text-white font-semibold text-lg">No analyses yet</p>
              <p className="text-gray-500 text-sm mt-1.5 max-w-xs mx-auto">
                Upload a surveillance video above to begin multimodal AI analysis
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {['Object Detection', 'Person Tracking', 'Speech-to-Text', 'Audio Events', 'Action Recognition', 'Cross-Modal Fusion'].map(f => (
                  <span key={f} className="px-2.5 py-1 bg-gray-800 text-gray-500 text-xs rounded-full border border-gray-700">{f}</span>
                ))}
              </div>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {jobs.map(job => (
                  <JobCard key={job.dbId} job={job} onDelete={() => handleDelete(job)} />
                ))}
              </div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  );
}
