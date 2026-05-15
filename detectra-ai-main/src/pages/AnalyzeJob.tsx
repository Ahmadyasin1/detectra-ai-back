import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle, AlertTriangle, ArrowLeft,
  Video, Cpu, PersonStanding, Mic, Volume2, Brain, Sparkles, ShieldAlert,
  Clock, Zap, Eye, TrendingUp,
} from 'lucide-react';
import { getJobStatus, getJobResult, getWsUrl, JobStatus } from '../lib/detectraApi';
import { useAuth } from '../contexts/AuthContext';
import { updateVideoUpload } from '../lib/supabaseDb';
import { isSupabaseConfigured } from '../lib/supabase';

// ── Pipeline stages ──────────────────────────────────────────────────────────

interface Stage {
  key:   string;
  label: string;
  sub:   string;
  Icon:  React.FC<{ className?: string }>;
  grad:  string;
  glow:  string;
}

const STAGES: Stage[] = [
  { key: 'loading_models',  label: 'Loading AI Models',     sub: 'YOLOv8 · Whisper · Fusion',       Icon: Cpu,           grad: 'from-purple-500 to-indigo-500',  glow: 'rgba(139,92,246,0.4)'  },
  { key: 'reading_video',   label: 'Reading Video',         sub: 'Metadata · Frame extraction',     Icon: Video,         grad: 'from-blue-500 to-cyan-500',      glow: 'rgba(59,130,246,0.4)'  },
  { key: 'perception',      label: 'Visual Perception',     sub: 'YOLOv8s-seg · ByteTrack · Pose',  Icon: PersonStanding,grad: 'from-cyan-500 to-blue-600',      glow: 'rgba(34,211,238,0.4)'  },
  { key: 'speech',          label: 'Speech Recognition',    sub: 'Whisper-small · Language detect', Icon: Mic,           grad: 'from-green-500 to-emerald-600',  glow: 'rgba(34,197,94,0.4)'   },
  { key: 'audio',           label: 'Audio Classification',  sub: 'YAMNet · MFCC · 521 categories', Icon: Volume2,       grad: 'from-yellow-500 to-amber-500',   glow: 'rgba(234,179,8,0.4)'   },
  { key: 'fusion',          label: 'Multimodal Fusion',     sub: 'Cross-attention transformer',     Icon: Brain,         grad: 'from-pink-500 to-rose-600',      glow: 'rgba(236,72,153,0.4)'  },
  { key: 'surveillance',    label: 'Surveillance Analysis', sub: 'Event detection · Threat scoring',Icon: ShieldAlert,   grad: 'from-orange-500 to-red-500',     glow: 'rgba(249,115,22,0.4)'  },
  { key: 'postprocessing',  label: 'Post-Processing',       sub: 'Validation · RAG JSON · Report',  Icon: Sparkles,      grad: 'from-teal-500 to-cyan-600',      glow: 'rgba(20,184,166,0.4)'  },
];

const STAGE_MAP: Record<string, number> = {
  loadingmodels:    0,
  readingvideo:     1,
  startinganalysis: 1,
  perception:       2,
  speech:           3,
  speechaudio:      3,
  audio:            4,
  fusion:           5,
  surveillance:     6,
  postprocessing:   7,
  validation:       7,
  writingoutput:    7,
};

function stageIndex(stage: string): number {
  if (!stage) return -1;
  const key = stage.toLowerCase().replace(/[_\s]/g, '');
  return STAGE_MAP[key] ?? 0;
}

// ── Circular progress ring ───────────────────────────────────────────────────

function ProgressRing({ progress, status, currentStage }: { progress: number; status: string; currentStage: Stage | null }) {
  const R = 72;
  const C = 2 * Math.PI * R;
  const dash = (progress / 100) * C;

  const isError = status === 'failed';
  const isDone  = status === 'completed';
  const isRun   = status === 'running' || status === 'pending';

  return (
    <div className="relative w-40 h-40 sm:w-52 sm:h-52 mx-auto">
      {/* Outer glow ring when active */}
      {isRun && (
        <div
          className="absolute inset-0 rounded-full animate-pulse opacity-40"
          style={{ boxShadow: `0 0 40px ${currentStage?.glow ?? 'rgba(34,211,238,0.4)'}` }}
        />
      )}

      <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
        {/* Track */}
        <circle cx="80" cy="80" r={R} fill="none" stroke="#1f2937" strokeWidth="9" />
        {/* Progress arc */}
        {!isError && (
          <circle
            cx="80" cy="80" r={R}
            fill="none"
            stroke={isDone ? 'url(#done-grad)' : 'url(#prog-grad)'}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            className="transition-all duration-700"
          />
        )}
        {isError && (
          <circle cx="80" cy="80" r={R} fill="none" stroke="#ef4444" strokeWidth="9"
            strokeDasharray={`${C * 0.3} ${C * 0.7}`} />
        )}
        <defs>
          <linearGradient id="prog-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="done-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isDone ? (
          <CheckCircle className="w-12 h-12 text-green-400" />
        ) : isError ? (
          <AlertTriangle className="w-12 h-12 text-red-400" />
        ) : (
          <>
            <span className="text-4xl font-extrabold text-white tabular-nums">{Math.round(progress)}%</span>
            <span className="text-gray-500 text-xs mt-1">complete</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Live info chip ────────────────────────────────────────────────────────────

function InfoChip({ icon: Icon, label, value, color }: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-2 bg-white/10 rounded-xl border border-white/20">
      <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-gray-500 text-xs leading-none">{label}</p>
        <p className="text-white text-sm font-semibold mt-0.5 tabular-nums">{value}</p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AnalyzeJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [job, setJob]         = useState<JobStatus | null>(null);
  const [error, setError]     = useState('');
  const [log, setLog]         = useState<{ time: string; msg: string }[]>([]);
  const [elapsed, setElapsed] = useState(0);

  const wsRef         = useRef<WebSocket | null>(null);
  const wsPingRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logEndRef     = useRef<HTMLDivElement>(null);

  const appendLog = (msg: string) =>
    setLog(prev => [...prev.slice(-79), { time: new Date().toLocaleTimeString(), msg }]);

  useEffect(() => {
    if (!jobId) return;
    let redirected = false;

    const onData = (data: Partial<JobStatus> & { type?: string; error?: string | null }) => {
      setJob(prev => prev ? { ...prev, ...data } : data as JobStatus);
      if (data.stage) appendLog(`${data.stage.replace(/_/g, ' ')} — ${data.progress ?? 0}%`);
      if (data.status === 'completed' && !redirected) {
        redirected = true;
        appendLog('Analysis complete — saving results…');
        if (user && jobId && isSupabaseConfigured) {
          getJobResult(jobId)
            .then((result) =>
              updateVideoUpload(user.id, jobId, { status: 'completed', analysis_results: result }),
            )
            .catch(() =>
              updateVideoUpload(user.id, jobId, { status: 'completed' }).catch(() => {}),
            );
        }
        setTimeout(() => navigate(`/analyze/results/${jobId}`), 1800);
      }
      if (data.status === 'failed') {
        appendLog(`Error: ${data.error || 'Unknown failure'}`);
        if (user && jobId && isSupabaseConfigured) {
          updateVideoUpload(user.id, jobId, { status: 'failed' }).catch(() => {});
        }
      }
    };

    const startPolling = () => {
      if (pollRef.current) return;
      const poll = async () => {
        try {
          const d = await getJobStatus(jobId);
          onData(d);
          if (d.status === 'completed' || d.status === 'failed') {
            clearInterval(pollRef.current!); pollRef.current = null;
          }
        } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); }
      };
      poll();
      pollRef.current = setInterval(poll, 2500);
    };

    // Reset the 30s inactivity timer on each message
    const resetWsTimeout = (ws: WebSocket) => {
      if (wsTimeoutRef.current) clearTimeout(wsTimeoutRef.current);
      wsTimeoutRef.current = setTimeout(() => {
        appendLog('WebSocket inactive for 30s — switching to polling');
        ws.close();
        startPolling();
      }, 30_000);
    };

    const stopWsPing = () => {
      if (wsPingRef.current) { clearInterval(wsPingRef.current); wsPingRef.current = null; }
    };

    const tryWs = () => {
      try {
        const ws = new WebSocket(getWsUrl(jobId));
        wsRef.current = ws;
        ws.onopen    = () => {
          resetWsTimeout(ws);
          // Send a ping every 10s so the 30s inactivity timer never fires
          // during long perception stages (10%→60% with no server messages).
          wsPingRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send('ping');
          }, 10_000);
        };
        ws.onmessage = e => {
          resetWsTimeout(ws);
          try { onData(JSON.parse(e.data)); } catch { /* ignore malformed frame */ }
        };
        ws.onerror   = () => {
          if (wsTimeoutRef.current) clearTimeout(wsTimeoutRef.current);
          stopWsPing();
          ws.close(); startPolling();
        };
        ws.onclose   = () => {
          if (wsTimeoutRef.current) clearTimeout(wsTimeoutRef.current);
          stopWsPing();
          if (!pollRef.current && !redirected) startPolling();
        };
      } catch { startPolling(); }
    };

    getJobStatus(jobId).then(d => {
      setJob(d);
      if (d.status === 'completed') { navigate(`/analyze/results/${jobId}`); return; }
      if (d.status === 'failed') return;
      tryWs();
    }).catch(e => setError(e.message || 'Job not found'));

    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    return () => {
      wsRef.current?.close();
      stopWsPing();
      if (pollRef.current)    clearInterval(pollRef.current);
      if (timerRef.current)   clearInterval(timerRef.current);
      if (wsTimeoutRef.current) clearTimeout(wsTimeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, navigate]);

  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [log]);

  const currentStageIdx = job ? stageIndex(job.stage) : -1;
  const currentStage    = currentStageIdx >= 0 ? STAGES[currentStageIdx] : null;
  const etaSecs = (job && job.progress > 0 && job.status === 'running')
    ? Math.round((elapsed / job.progress) * (100 - job.progress))
    : null;
  const fmtElapsed = `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  return (
    <div className="min-h-screen bg-transparent pt-20 sm:pt-24 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        <Link to="/analyze" className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors text-sm mb-8">
          <ArrowLeft className="w-4 h-4" />
          Analyzer
        </Link>

        {error ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <p className="text-red-300 font-medium">{error}</p>
            <Link to="/analyze">
              <button className="mt-6 btn-dark text-sm">Back to Analyzer</button>
            </Link>
          </div>
        ) : !job ? (
          <div className="text-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading job…</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── Header card ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card-glass p-6 transition-all duration-500 ${
                job.status === 'running' ? 'border-cyan-500/25 glow-cyan'
                : job.status === 'completed' ? 'border-green-500/25'
                : job.status === 'failed' ? 'border-red-500/25'
                : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white truncate">{job.video_name}</h1>
                  <p className="text-gray-600 text-xs mt-0.5 font-mono">{job.job_id}</p>
                </div>
                {/* Current stage badge */}
                {currentStage && job.status === 'running' && (
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${currentStage.grad} bg-opacity-15 border border-white/10 flex-shrink-0`}>
                    <currentStage.Icon className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-xs font-medium">{currentStage.label}</span>
                  </div>
                )}
              </div>

              {/* Circular ring */}
              <ProgressRing progress={job.progress} status={job.status} currentStage={currentStage} />

              {/* Status text */}
              <div className="text-center mt-5 space-y-1">
                {job.status === 'running' || job.status === 'pending' ? (
                  <p className="text-white font-semibold capitalize">
                    {(job.stage || 'Initializing').replace(/_/g, ' ')}
                  </p>
                ) : job.status === 'completed' ? (
                  <p className="text-green-400 font-semibold text-lg">Analysis complete! Redirecting…</p>
                ) : job.status === 'failed' ? (
                  <p className="text-red-400 font-semibold">Analysis failed</p>
                ) : null}
                {currentStage && job.status === 'running' && (
                  <p className="text-gray-500 text-xs">{currentStage.sub}</p>
                )}
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <InfoChip icon={Clock}     label="Elapsed"   value={fmtElapsed}                        color="text-gray-400" />
                {etaSecs !== null && etaSecs > 0 && (
                  <InfoChip icon={TrendingUp} label="Est. remaining"
                    value={etaSecs >= 60 ? `${Math.floor(etaSecs / 60)}m ${etaSecs % 60}s` : `${etaSecs}s`}
                    color="text-cyan-400" />
                )}
                {job.status === 'running' && (
                  <InfoChip icon={Zap}       label="Stage"     value={`${currentStageIdx + 1} / ${STAGES.length}`} color="text-purple-400" />
                )}
              </div>
            </motion.div>

            {/* ── Pipeline stages ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="card-glass p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h2 className="text-gray-300 text-sm font-semibold uppercase tracking-widest">Pipeline</h2>
              </div>

              <div className="space-y-1.5">
                {STAGES.map((stage, idx) => {
                  const done   = job.status === 'completed' || idx < currentStageIdx;
                  const active = job.status !== 'completed' && idx === currentStageIdx;
                  const pend   = !done && !active;

                  return (
                    <motion.div
                      key={stage.key}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                        active ? 'bg-white/10 border border-white/20'
                        : done  ? 'bg-white/5 backdrop-blur-md'
                        : 'bg-white/5 backdrop-blur-md'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        done   ? 'bg-green-500/15'
                        : active ? `bg-gradient-to-br ${stage.grad} shadow-lg`
                        : 'bg-white/10'
                      }`}
                        style={active ? { boxShadow: `0 0 12px ${stage.glow}` } : {}}>
                        {done
                          ? <CheckCircle className="w-4 h-4 text-green-400" />
                          : <stage.Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-600'}`} />}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium ${
                            done ? 'text-green-400' : active ? 'text-white' : 'text-gray-600'
                          }`}>{stage.label}</span>
                          {done && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                          {active && (
                            <span className="flex items-center gap-1 text-xs text-cyan-400 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                              running
                            </span>
                          )}
                        </div>
                        {(active || done) && (
                          <p className={`text-xs mt-0.5 ${done ? 'text-gray-600' : 'text-gray-500'}`}>
                            {stage.sub}
                          </p>
                        )}
                      </div>

                      {/* Step number */}
                      {pend && (
                        <span className="text-gray-700 text-xs tabular-nums flex-shrink-0">{idx + 1}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* ── Error detail ── */}
            {job.status === 'failed' && job.error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5"
              >
                <p className="text-red-300 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Error Details
                </p>
                <p className="text-red-400/70 text-sm font-mono break-all bg-black/30 rounded-xl p-3">
                  {job.error}
                </p>
                <Link to="/analyze">
                  <button className="mt-4 btn-dark text-sm">Return to Analyzer</button>
                </Link>
              </motion.div>
            )}

            {/* ── Completed card ── */}
            <AnimatePresence>
              {job.status === 'completed' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-500/8 border border-green-500/30 rounded-2xl p-6 text-center glow-green"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/15 flex items-center justify-center mb-4">
                    <CheckCircle className="w-9 h-9 text-green-400" />
                  </div>
                  <p className="text-green-300 font-bold text-xl mb-1">Analysis Complete</p>
                  <p className="text-gray-400 text-sm mb-5">All 8 pipeline stages finished successfully</p>
                  <Link to={`/analyze/results/${jobId}`}>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="btn-cyan"
                    >
                      View Full Results →
                    </motion.button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Activity log ── */}
            {log.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-transparent rounded-2xl border border-white/10 p-4"
              >
                <p className="text-gray-600 text-xs font-mono uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="status-dot-active" />
                  Activity Log
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {log.map((entry, i) => (
                    <p key={i} className="text-gray-500 text-xs font-mono leading-relaxed">
                      <span className="text-gray-700">[{entry.time}]</span>{' '}
                      <span className="capitalize">{entry.msg}</span>
                    </p>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
