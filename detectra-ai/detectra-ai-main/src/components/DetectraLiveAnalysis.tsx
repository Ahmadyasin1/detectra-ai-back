/**
 * DetectraLiveAnalysis — public demo component on /demo page.
 * Uploads a video to the real api_server.py backend, tracks progress
 * via WebSocket, and shows a results summary when done.
 * No auth required (backend runs in dev-mode without SUPABASE_JWT_SECRET).
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Upload, X, AlertTriangle, CheckCircle, WifiOff,
  Shield, Eye, Mic, Volume2, Brain, Activity, ChevronRight,
  FileJson, Film, Users, BarChart3, ArrowRight,
} from 'lucide-react';
import {
  checkHealth, submitVideo, getJobStatus, getJobResult, getWsUrl,
  AnalysisResult, distinctPersonCount, severityHex,
  riskTextClass, riskBgClass, fmtSeconds, fmtDuration, anomalyColor,
} from '../lib/detectraApi';

// ── Stage config ─────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'loading_models', label: 'Loading AI Models',     Icon: Brain },
  { key: 'perception',     label: 'Visual Detection',      Icon: Eye },
  { key: 'speech',         label: 'Speech Recognition',    Icon: Mic },
  { key: 'audio',          label: 'Audio Analysis',        Icon: Volume2 },
  { key: 'fusion',         label: 'Multimodal Fusion',     Icon: Brain },
  { key: 'surveillance',   label: 'Surveillance Analysis', Icon: Shield },
  { key: 'postprocessing', label: 'Post-Processing',       Icon: Activity },
];

function matchStage(stage: string): number {
  const s = (stage || '').toLowerCase().replace(/_/g, '');
  return STAGES.findIndex(st => {
    const k = st.key.replace(/_/g, '');
    return s.includes(k) || k.includes(s);
  });
}

// ── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color = '#22d3ee' }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

// ── Result summary card ───────────────────────────────────────────────────────

function ResultSummary({ result, jobId }: { result: AnalysisResult; jobId: string }) {
  const {
    video_name, duration_s, risk_level, risk_score,
    surveillance_events, fusion_insights, speech_segments,
    summary, top_objects, anomaly_timeline,
  } = result;

  const criticalEvts = surveillance_events.filter(e => e.severity === 'critical' || e.severity === 'high');
  const cleanSpeech   = speech_segments.filter(s => !s.is_noise).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Risk header */}
      <div className={`rounded-2xl border p-5 ${riskBgClass(risk_level)}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className={`w-5 h-5 ${riskTextClass(risk_level)}`} />
              <span className={`text-xl font-bold ${riskTextClass(risk_level)}`}>{risk_level} RISK</span>
              <span className="text-gray-500 text-sm">({(risk_score * 100).toFixed(0)}/100)</span>
            </div>
            <p className="text-white font-medium truncate max-w-xs">{video_name || 'Analyzed Video'}</p>
            <p className="text-gray-500 text-sm">{fmtDuration(duration_s || 0)}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
        </div>
        {summary && (
          <p className="mt-3 text-gray-300 text-sm leading-relaxed border-t border-white/10 pt-3">
            {summary}
          </p>
        )}
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Individuals',  value: distinctPersonCount(result), color: 'text-cyan-400' },
          { label: 'Events',   value: surveillance_events.length,  color: 'text-red-400' },
          { label: 'Insights', value: fusion_insights.length,      color: 'text-pink-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Anomaly sparkline */}
      {anomaly_timeline.length > 0 && (
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" />Anomaly Timeline
          </p>
          <div className="flex items-end gap-0.5 h-12">
            {anomaly_timeline.map((score, t) => (
              <div
                key={t}
                className="flex-1 rounded-sm"
                title={`${fmtSeconds(t)}: ${(score * 100).toFixed(0)}%`}
                style={{
                  height: `${Math.max(4, score * 100)}%`,
                  backgroundColor: anomalyColor(score),
                  minWidth: 2,
                  opacity: score < 0.05 ? 0.2 : 1,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-gray-700 text-xs mt-1">
            <span>0:00</span>
            <span>{fmtDuration(duration_s || 0)}</span>
          </div>
        </div>
      )}

      {/* Top alerts */}
      {criticalEvts.length > 0 && (
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" />Top Alerts
          </p>
          <div className="space-y-2">
            {criticalEvts.slice(0, 4).map((ev, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: severityHex(ev.severity) }} />
                <span className="text-gray-500 font-mono text-xs w-12 flex-shrink-0">{fmtSeconds(ev.timestamp_s)}</span>
                <span className="text-gray-300 truncate flex-1">{ev.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top objects */}
      {(top_objects || []).length > 0 && (
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Eye className="w-3 h-3" />Detected Objects
          </p>
          <div className="flex flex-wrap gap-2">
            {(top_objects || []).slice(0, 8).map(obj => (
              <span key={obj.label}
                className="px-2.5 py-1 bg-gray-700 text-gray-300 text-xs rounded-full border border-gray-600 capitalize">
                {obj.label} <span className="text-gray-500">×{obj.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sample speech */}
      {cleanSpeech.length > 0 && (
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Mic className="w-3 h-3" />Speech Detected
          </p>
          {cleanSpeech.map((seg, i) => (
            <div key={i} className="text-sm mb-1.5 last:mb-0">
              <span className="text-cyan-400 font-mono text-xs">{fmtSeconds(seg.start_s)} </span>
              <span className="text-gray-300 italic">"{seg.text.slice(0, 80)}{seg.text.length > 80 ? '…' : ''}"</span>
            </div>
          ))}
        </div>
      )}

      {/* Downloads + full results CTA */}
      <div className="flex flex-col gap-2">
        <a
          href={`/api/jobs/${jobId}/rag`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 rounded-xl border border-cyan-500/30 text-sm transition-colors"
        >
          <FileJson className="w-4 h-4" />
          Download RAG JSON
        </a>
        <a
          href={`/api/jobs/${jobId}/video`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 rounded-xl border border-purple-500/30 text-sm transition-colors"
        >
          <Film className="w-4 h-4" />
          Download Labeled Video
        </a>
      </div>

      <div className="text-center pt-2">
        <p className="text-gray-600 text-xs mb-3">Sign in to save analyses, view full timelines, and manage your history</p>
        <Link to="/signup">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
          >
            Create Free Account
            <ArrowRight className="inline w-4 h-4 ml-1.5" />
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DetectraLiveAnalysis() {
  const [apiOnline, setApiOnline]   = useState<boolean | null>(null);
  const [file, setFile]             = useState<File | null>(null);
  const [dragging, setDragging]     = useState(false);
  const [running, setRunning]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [stage, setStage]           = useState('');
  const [jobId, setJobId]           = useState('');
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [error, setError]           = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef        = useRef<WebSocket | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => () => {
    wsRef.current?.close();
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // API health probe
  useEffect(() => {
    checkHealth()
      .then(() => setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  const reset = () => {
    wsRef.current?.close();
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setFile(null); setRunning(false); setProgress(0);
    setStage(''); setJobId(''); setResult(null); setError('');
  };

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    if (!['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
      setError('Please upload a video file: MP4, AVI, MOV, MKV, or WebM');
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      setError('File too large — max 500 MB');
      return;
    }
    setFile(f); setError('');
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const startAnalysis = async () => {
    if (!file) return;
    setRunning(true); setError(''); setProgress(2); setStage('loading_models');

    try {
      const res = await submitVideo(file);
      const jid = res.job_id;
      setJobId(jid);

      // WebSocket progress
      const ws = new WebSocket(getWsUrl(jid));
      wsRef.current = ws;

      ws.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.progress !== undefined) setProgress(msg.progress);
          if (msg.stage)    setStage(msg.stage);
          if (msg.type === 'completed' || msg.status === 'completed') {
            ws.close();
            setProgress(100);
            setStage('done');
            // Fetch full result
            try {
              const fullResult = await getJobResult(jid);
              setResult(fullResult);
            } catch (e: unknown) {
              setError(`Analysis done but could not load results: ${e instanceof Error ? e.message : String(e)}`);
            } finally {
              setRunning(false);
            }
          }
          if (msg.type === 'error' || msg.status === 'failed') {
            ws.close();
            setError(msg.error || 'Analysis failed');
            setRunning(false);
          }
        } catch { /* ignore malformed ws message */ }
      };

      ws.onerror = () => {
        // Fall back to polling — stored in ref so cleanup can cancel it
        ws.close();
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          try {
            const s = await getJobStatus(jid);
            setProgress(s.progress); setStage(s.stage);
            if (s.status === 'completed') {
              clearInterval(pollRef.current!); pollRef.current = null;
              const fullResult = await getJobResult(jid);
              setResult(fullResult); setRunning(false);
            }
            if (s.status === 'failed') {
              clearInterval(pollRef.current!); pollRef.current = null;
              setError(s.error || 'Analysis failed'); setRunning(false);
            }
          } catch { /* ignore polling error, retry on next tick */ }
        }, 2500);
      };

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setRunning(false);
    }
  };

  const currentStage = matchStage(stage);

  return (
    <section className="py-20 bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-block px-4 py-1.5 bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-sm rounded-full mb-4">
            Live API Demo
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Analyze a Video <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Right Now</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Upload any video and watch Detectra's AI pipeline process it in real time — no account required for the demo.
          </p>
        </motion.div>

        {/* API Status Banner */}
        {apiOnline === false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-3 p-4 mb-6 bg-orange-500/15 border border-orange-500/40 rounded-xl"
          >
            <WifiOff className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-orange-300 font-medium text-sm">API Server Offline</p>
              <p className="text-orange-400/70 text-xs mt-0.5">
                Start the backend: <code className="bg-black/30 px-1.5 py-0.5 rounded">python api_server.py</code>
              </p>
            </div>
          </motion.div>
        )}
        {apiOnline === true && (
          <div className="flex items-center gap-2 mb-6 text-green-400 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Detectra AI backend connected
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: upload + progress */}
          <div className="space-y-4">
            {!result ? (
              <>
                {/* Drop zone */}
                {!file ? (
                  <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      dragging
                        ? 'border-cyan-400 bg-cyan-400/10'
                        : 'border-white/20 bg-white/5 backdrop-blur-md hover:border-cyan-500/50 hover:bg-white/20'
                    }`}
                  >
                    <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                    <Upload className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                    <p className="text-white font-medium">Drop video here</p>
                    <p className="text-gray-500 text-sm mt-1">MP4, AVI, MOV, MKV — up to 500 MB</p>
                  </div>
                ) : (
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                        <Film className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{file.name}</p>
                        <p className="text-gray-500 text-xs">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      {!running && (
                        <button onClick={reset} className="text-gray-600 hover:text-gray-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-sm"
                    >
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Start button */}
                {file && !running && (
                  <motion.button
                    onClick={startAnalysis}
                    disabled={apiOnline === false}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Start Analysis
                  </motion.button>
                )}

                {/* Progress */}
                {running && (
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-400 text-sm capitalize">
                          {stage.replace(/_/g, ' ') || 'Starting…'}
                        </span>
                        <span className="text-cyan-400 font-bold">{Math.round(progress)}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>

                    {/* Stage indicators */}
                    <div className="space-y-2">
                      {STAGES.map((st, idx) => {
                        const done   = idx < currentStage;
                        const active = idx === currentStage;
                        return (
                          <div key={st.key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
                            active ? 'bg-white/10' : ''
                          }`}>
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              done ? 'bg-green-500/20' : active ? 'bg-cyan-500/20' : 'bg-white/10'
                            }`}>
                              {done
                                ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                : <st.Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400 animate-pulse' : 'text-gray-600'}`} />}
                            </div>
                            <span className={`text-sm ${done ? 'text-green-400' : active ? 'text-white' : 'text-gray-600'}`}>
                              {st.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <button
                  onClick={reset}
                  className="flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors text-sm mb-4"
                >
                  ← Analyze another video
                </button>
                <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">How It Works</p>
                  {[
                    { icon: Eye,    label: 'YOLOv8s detects objects + ByteTrack tracks persons' },
                    { icon: Mic,    label: 'Whisper transcribes speech in any language' },
                    { icon: Volume2,label: 'MFCC classifies environmental audio events' },
                    { icon: Brain,  label: 'Cross-modal transformer fuses all signals' },
                    { icon: Shield, label: 'Surveillance engine flags anomalies + risks' },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-start gap-2.5 mb-3 last:mb-0">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: results */}
          <div>
            {result ? (
              <ResultSummary result={result} jobId={jobId} />
            ) : (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 h-full">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-6">Analysis Capabilities</p>
                <div className="space-y-4">
                  {[
                    { icon: Users,   title: 'Person Tracking',     desc: 'YOLOv8s-seg + ByteTrack identifies and tracks every individual across frames' },
                    { icon: Shield,  title: 'Threat Detection',    desc: 'Fall, fight, loitering, crowd surge, intrusion — automatically flagged' },
                    { icon: Brain,   title: 'Multimodal Fusion',   desc: '4-head cross-attention transformer aligns visual and audio signals' },
                    { icon: Mic,     title: 'Speech Intelligence', desc: 'Whisper-small transcribes speech with automatic language detection' },
                    { icon: BarChart3,'title': 'Risk Assessment',  desc: 'Per-second anomaly scoring with CRITICAL / HIGH / MEDIUM / LOW classification' },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/15 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{title}</p>
                        <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/10">
                  <Link to="/signup">
                    <button className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
                      Create account for full access
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
