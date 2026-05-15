import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, AlertTriangle, Mic, Volume2, Users, BarChart3,
  FileJson, Film, Download, ChevronDown, ChevronUp, Search,
  Clock, Activity, Brain, Eye, Zap, TrendingUp, CheckCircle,
  PersonStanding, Sparkles, Target, FileText, Maximize2, Layers,
  type LucideIcon,
} from 'lucide-react';
import {
  getJobResult, AnalysisResult, SurveillanceEvent,
  riskTextClass, riskBgClass, riskColor,
  severityBadgeClass, severityHex,
  fmtSeconds, fmtDuration,
  getRagJsonUrl, getReportUrl, getVideoUrl,
  getTranslatedTranscript,
  distinctPersonCount, trackFragmentCount,
  type FrameAnalyticsPoint,
} from '../lib/detectraApi';
import { useAuth } from '../contexts/AuthContext';
import { getVideoUploadByJobId } from '../lib/supabaseDb';
import EventTimeline from '../components/EventTimeline';
import AIAssistant from '../components/AIAssistant';

// ── Risk Gauge (semi-circle SVG) ────────────────────────────────────────────

function RiskGauge({ score, level }: { score: number; level: string }) {
  const R   = 58;
  const C   = Math.PI * R;
  const arc = Math.min(score, 1) * C;
  const col = riskColor(level);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 140 80" className="w-40 h-24">
        <path d="M 12 72 A 58 58 0 0 1 128 72"
          fill="none" stroke="#1f2937" strokeWidth="9" strokeLinecap="round" />
        <path d="M 12 72 A 58 58 0 0 1 128 72"
          fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${arc} ${C}`}
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 8px ${col}60)` }}
        />
        <text x="70" y="58" textAnchor="middle" fontSize="20" fontWeight="800" fill="white">
          {(score * 100).toFixed(0)}
        </text>
        <text x="70" y="70" textAnchor="middle" fontSize="8" fill="#6b7280" fontFamily="Inter,sans-serif">
          Risk Score
        </text>
      </svg>
      <span className={`text-2xl font-extrabold tracking-wide ${riskTextClass(level)}`}>{level}</span>
      <span className="text-gray-500 text-xs mt-0.5">Threat Level</span>
    </div>
  );
}

// ── Metric card ─────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, color = 'text-cyan-400', bg = 'bg-cyan-500/10', border = 'border-cyan-500/20' }:
  { icon: LucideIcon; label: string; value: string | number; sub?: string; color?: string; bg?: string; border?: string }) {
  return (
    <div className={`bg-white/10 rounded-xl p-4 border ${border} flex items-start gap-3`}>
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-white font-bold text-xl leading-none tabular-nums">{value}</p>
        <p className="text-gray-400 text-xs mt-1">{label}</p>
        {sub && <p className="text-gray-600 text-xs mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ── Key Findings ─────────────────────────────────────────────────────────────

function KeyFindings({ result }: { result: AnalysisResult }) {
  const findings: { icon: LucideIcon; text: string; color: string }[] = [];

  const criticals = result.surveillance_events.filter(e => e.severity === 'critical');
  if (criticals.length > 0)
    findings.push({ icon: AlertTriangle, color: 'text-red-400',
      text: `${criticals.length} critical event${criticals.length > 1 ? 's' : ''} detected: ${[...new Set(criticals.map(e => e.event_type.replace(/_/g, ' ')))].join(', ')}` });

  if (distinctPersonCount(result) > 0)
    findings.push({ icon: PersonStanding, color: 'text-cyan-400',
      text: `${distinctPersonCount(result)} distinct individual${distinctPersonCount(result) > 1 ? 's' : ''} (estimated) — max ${result.max_concurrent_persons} concurrent`
        + (trackFragmentCount(result) > distinctPersonCount(result)
          ? ` · ${trackFragmentCount(result)} tracker ID segments`
          : '') });

  const alertFusions = result.fusion_insights.filter(f => f.alert);
  if (alertFusions.length > 0)
    findings.push({ icon: Brain, color: 'text-pink-400',
      text: `${alertFusions.length} cross-modal alert${alertFusions.length > 1 ? 's' : ''} from the fusion transformer` });

  const cleanSpeech = result.speech_segments.filter(s => !s.is_noise);
  if (cleanSpeech.length > 0)
    findings.push({ icon: Mic, color: 'text-green-400',
      text: `Speech detected: ${cleanSpeech.length} segment${cleanSpeech.length > 1 ? 's' : ''}${result.detected_languages.length > 0 ? ` in ${result.detected_languages.map(l => l.name || l.code).join(', ')}` : ''}` });

  const topObj = result.top_objects[0];
  if (topObj)
    findings.push({ icon: Eye, color: 'text-blue-400',
      text: `Most frequent object: "${topObj.label}" (${topObj.count}×), ${Object.keys(result.class_frequencies).length} object types total` });

  if (result.processing_time_s > 0)
    findings.push({ icon: Zap, color: 'text-yellow-400',
      text: `Processed in ${fmtDuration(result.processing_time_s)} — ${result.total_frames.toLocaleString()} frames at ${result.fps.toFixed(1)} fps` });

  if (findings.length === 0)
    findings.push({ icon: CheckCircle, color: 'text-green-400', text: 'No significant threats detected in this video.' });

  return (
    <div className="space-y-2.5">
      {findings.map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.06 }}
          className="flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/5"
        >
          <f.icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${f.color}`} />
          <p className="text-gray-300 text-sm leading-relaxed">{f.text}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ── Event feed ──────────────────────────────────────────────────────────────

function EventFeed({ events }: { events: SurveillanceEvent[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch]     = useState('');
  const [sevFilter, setSevFilter] = useState<string>('all');

  const filtered = events.filter(ev => {
    const matchSev = sevFilter === 'all' || ev.severity === sevFilter;
    const matchQ   = !search || ev.description.toLowerCase().includes(search.toLowerCase())
      || ev.event_type.toLowerCase().includes(search.toLowerCase());
    return matchSev && matchQ;
  });

  const SEV_OPTIONS = ['all', 'critical', 'high', 'medium', 'low'];
  const SEV_COLORS: Record<string, string> = {
    critical: 'bg-red-500/25 text-red-300 border-red-500/50',
    high:     'bg-orange-500/25 text-orange-300 border-orange-500/50',
    medium:   'bg-yellow-500/25 text-yellow-300 border-yellow-500/50',
    low:      'bg-blue-500/25 text-blue-300 border-blue-500/50',
    all:      'bg-gray-700 text-gray-300 border-gray-600',
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full pl-8 pr-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {SEV_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSevFilter(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border capitalize transition-colors ${
                sevFilter === s ? SEV_COLORS[s] : 'bg-white/10 text-gray-500 border-white/20 hover:text-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-600 text-sm">No events match the filter</div>
      ) : (
        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
          {filtered.map((ev, i) => (
            <div key={i} className="rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/20 text-left transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: severityHex(ev.severity) }} />
                <span className={`px-2 py-0.5 rounded text-xs font-semibold border flex-shrink-0 ${severityBadgeClass(ev.severity)}`}>
                  {ev.severity.toUpperCase()}
                </span>
                <span className="text-cyan-400 text-xs font-mono w-12 flex-shrink-0">{fmtSeconds(ev.timestamp_s)}</span>
                <span className="text-gray-200 text-sm flex-1 truncate">{ev.description}</span>
                <span className="text-gray-600 text-xs flex-shrink-0">{(ev.confidence * 100).toFixed(0)}%</span>
                {expanded === i
                  ? <ChevronUp className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />}
              </button>
              <AnimatePresence>
                {expanded === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-2 bg-transparent/60 border-t border-white/10 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">Type: </span><span className="text-gray-300 capitalize">{ev.event_type.replace(/_/g, ' ')}</span></div>
                      <div><span className="text-gray-500">Confidence: </span><span className="text-gray-300">{(ev.confidence * 100).toFixed(1)}%</span></div>
                      {ev.track_ids.length > 0 && (
                        <div><span className="text-gray-500">Person IDs: </span><span className="text-gray-300">{ev.track_ids.join(', ')}</span></div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Bar chart (pure CSS) ─────────────────────────────────────────────────────

function FrameAnalyticsDeep({ points, durationS }: { points: FrameAnalyticsPoint[]; durationS: number }) {
  if (!points.length) {
    return (
      <div className="text-center py-12 px-4">
        <Layers className="w-10 h-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
          Per-frame crowd density, motion, and action labels appear when the analyzer returns{' '}
          <code className="px-1 py-0.5 rounded bg-white/10 text-cyan-400/90 text-[11px]">frame_analytics</code>.
          Use the latest <code className="px-1 py-0.5 rounded bg-white/10 text-gray-400 text-[11px]">api_server.py</code> and re-run the job.
        </p>
      </div>
    );
  }
  const maxP = Math.max(...points.map(p => p.person_count), 1);
  const maxM = Math.max(...points.map(p => p.motion), 1e-6);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Crowd density (sampled frames)</p>
        <div className="flex items-end gap-px h-28 bg-black/30 rounded-xl p-2 border border-white/10">
          {points.map((p, i) => (
            <div
              key={i}
              title={`${fmtSeconds(p.t)} · ${p.person_count} people`}
              className="flex-1 min-w-[2px] rounded-t-sm bg-gradient-to-t from-cyan-700 to-cyan-400/95 hover:opacity-90 transition-opacity"
              style={{ height: `${Math.max(8, (p.person_count / maxP) * 100)}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-gray-600 text-[10px] mt-1 font-mono">
          <span>0:00</span>
          <span>{fmtSeconds(durationS)}</span>
        </div>
      </div>
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Scene motion (optical flow)</p>
        <div className="flex items-end gap-px h-24 bg-black/30 rounded-xl p-2 border border-white/10">
          {points.map((p, i) => (
            <div
              key={i}
              title={`${fmtSeconds(p.t)} · motion ${p.motion.toFixed(3)}`}
              className="flex-1 min-w-[2px] rounded-t-sm bg-gradient-to-t from-violet-800 to-violet-400/95 opacity-95"
              style={{ height: `${Math.max(6, (p.motion / maxM) * 100)}%` }}
            />
          ))}
        </div>
      </div>
      <div className="max-h-72 overflow-y-auto border border-white/10 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-gray-950/95 backdrop-blur-sm border-b border-white/10">
            <tr>
              <th className="px-3 py-2 text-gray-500 font-semibold">Time</th>
              <th className="px-3 py-2 text-gray-500 font-semibold">People</th>
              <th className="px-3 py-2 text-gray-500 font-semibold">Motion</th>
              <th className="px-3 py-2 text-gray-500 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-3 py-1.5 text-cyan-400 font-mono tabular-nums">{fmtSeconds(p.t)}</td>
                <td className="px-3 py-1.5 text-white tabular-nums">{p.person_count}</td>
                <td className="px-3 py-1.5 text-gray-400 tabular-nums">{p.motion.toFixed(3)}</td>
                <td className="px-3 py-1.5 text-gray-300 capitalize truncate max-w-[12rem]">
                  {p.action ? p.action.replace(/_/g, ' ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HBarChart({ data, color = '#22d3ee' }: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="text-gray-400 text-xs capitalize w-28 truncate flex-shrink-0">{label.replace(/_/g, ' ')}</span>
          <div className="flex-1 bg-white/10 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(value / max) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <span className="text-gray-500 text-xs w-8 text-right tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Labeled Video Player ─────────────────────────────────────────────────────

function VideoPlayer({ jobId }: { jobId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.09 }}
      className="card-glass overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-400" />
          <span className="text-white font-semibold text-sm">Labeled Video</span>
          <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] rounded-full border border-cyan-500/20 font-semibold">AI-Annotated</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getVideoUrl(jobId)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            title="Open in new tab"
            className="p-1 text-gray-600 hover:text-cyan-400 transition-colors rounded"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </a>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-gray-600" />
            : <ChevronDown className="w-4 h-4 text-gray-600" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {videoError ? (
                <div className="flex flex-col items-center justify-center h-48 bg-transparent rounded-xl border border-white/10">
                  <Film className="w-10 h-10 text-gray-700 mb-2" />
                  <p className="text-gray-600 text-sm font-medium">Labeled video not available</p>
                  <p className="text-gray-700 text-xs mt-1">Backend may still be generating the annotated output</p>
                  <a href={getVideoUrl(jobId)} target="_blank" rel="noopener noreferrer"
                    className="mt-3 px-3 py-1.5 bg-white/10 hover:bg-gray-700 text-gray-400 hover:text-white text-xs rounded-lg border border-white/20 transition-colors">
                    Try direct download
                  </a>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-xl bg-black border border-white/10"
                  style={{ maxHeight: 500 }}
                  onError={() => setVideoError(true)}
                >
                  <source src={getVideoUrl(jobId)} type="video/mp4" />
                  Your browser does not support HTML5 video.
                </video>
              )}
              <p className="text-gray-700 text-xs mt-2 text-center">
                YOLOv8 bounding boxes · ByteTrack IDs · Pose skeleton · Anomaly score overlay
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Tab button ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'events',    label: 'Events',    icon: Shield   },
  { key: 'perframe',  label: 'Per-frame', icon: Layers   },
  { key: 'ai',        label: 'Ask AI',    icon: Sparkles },
  { key: 'fusion',    label: 'Fusion',    icon: Brain    },
  { key: 'speech',    label: 'Speech',    icon: Mic      },
  { key: 'audio',     label: 'Audio',     icon: Volume2  },
  { key: 'objects',   label: 'Objects',   icon: Eye      },
  { key: 'actions',   label: 'Actions',   icon: Target   },
  { key: 'report',    label: 'Report',    icon: FileText },
] as const;

type TabKey = (typeof TABS)[number]['key'];


function Tab({ tabKey, label, icon: Icon, active, onClick }: {
  tabKey: TabKey; label: string; icon: LucideIcon; active: boolean; onClick: () => void;
}) {
  const isAI = tabKey === 'ai';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
        active
          ? isAI
            ? 'text-purple-400 border-purple-400'
            : 'text-cyan-400 border-cyan-400'
          : isAI
            ? 'text-purple-500/70 border-transparent hover:text-purple-300'
            : 'text-gray-500 border-transparent hover:text-gray-300'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {isAI && <span className="ml-0.5 px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] rounded-full border border-purple-500/30 font-semibold">NEW</span>}
    </button>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function JobResults() {
  const { jobId } = useParams<{ jobId: string }>();
  const { user }  = useAuth();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState<TabKey>('events');
  const [translateLang, setTranslateLang] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);

  // Ref to prevent double-fetch: once we have a result, skip re-runs caused by user loading
  const gotResultRef = useRef(false);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!jobId || gotResultRef.current) return;
    setLoading(true);
    setError('');
    // Try API first, fall back to Supabase-cached result
    getJobResult(jobId)
      .then(r => { setResult(r); gotResultRef.current = true; })
      .catch(async (e) => {
        const currentUser = userRef.current;
        if (currentUser) {
          const upload = await getVideoUploadByJobId(currentUser.id, jobId).catch(() => null);
          if (upload?.analysis_results) {
            setResult(upload.analysis_results);
            gotResultRef.current = true;
            return;
          }
        }
        setError(e.message || 'Results not available — the job may have been deleted or the server is offline.');
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  async function handleTranslateTranscript() {
    if (!jobId) return;
    setTranslating(true);
    setTranslatedText('');
    try {
      const data = await getTranslatedTranscript(jobId, translateLang);
      setTranslatedText(data.translated_text || data.message || 'No transcript available for translation.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Translation failed';
      setTranslatedText(`Translation error: ${msg}`);
    } finally {
      setTranslating(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-transparent pt-24 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Loading analysis results…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-transparent pt-24 flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-14 h-14 text-red-400 mx-auto mb-4" />
        <p className="text-red-300 font-medium">{error}</p>
        <Link to="/analyze">
          <button className="mt-5 btn-dark text-sm">Back to Analyzer</button>
        </Link>
      </div>
    </div>
  );

  if (!result) return null;

  const {
    video_name, duration_s, width, height, fps, total_frames,
    risk_level, risk_score, summary,
    surveillance_events, fusion_insights, speech_segments, audio_events,
    max_concurrent_persons,
    class_frequencies, action_frequencies, detected_languages,
    full_transcript, processing_time_s,
    severity_counts, top_objects, anomaly_timeline,
    frame_analytics,
  } = result;

  const videoName     = video_name || 'Untitled';
  const topActions    = Object.entries(action_frequencies || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, value]) => ({ label, value }));
  const topObjectList = (top_objects || []).slice(0, 10).map(o => ({ label: o.label, value: o.count }));
  const alertFusions  = fusion_insights.filter(f => f.alert);
  const cleanSpeech   = speech_segments.filter(s => !s.is_noise);

  const tabCounts: Record<TabKey, number | null> = {
    events:  surveillance_events.length,
    perframe: frame_analytics?.length ?? 0,
    ai:      null,
    fusion:  fusion_insights.length,
    speech:  cleanSpeech.length,
    audio:   audio_events.length,
    objects: Object.keys(class_frequencies).length,
    actions: Object.keys(action_frequencies || {}).length,
    report:  null,
  };

  return (
    <div className="min-h-screen bg-transparent pt-20 sm:pt-24 pb-[env(safe-area-inset-bottom)] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 min-w-0">

        {/* ── Breadcrumb + exports ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Link to="/analyze" className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Analyzer
          </Link>
          <div className="flex gap-2 flex-wrap">
            <a href={getRagJsonUrl(jobId!)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl border border-white/20 text-xs transition-colors">
              <FileJson className="w-3.5 h-3.5" />RAG JSON
            </a>
            <a href={getReportUrl(jobId!)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-gray-700 text-gray-400 hover:text-white rounded-xl border border-white/20 text-xs transition-colors">
              <Download className="w-3.5 h-3.5" />Report
            </a>
            <a href={getVideoUrl(jobId!)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 rounded-xl border border-cyan-500/30 text-xs transition-colors">
              <Film className="w-3.5 h-3.5" />Labeled Video
            </a>
          </div>
        </div>

        {/* ── Executive Summary ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-6 ${riskBgClass(risk_level)}`}
        >
          <div className="flex flex-col md:flex-row gap-6 items-start">

            {/* Risk gauge */}
            <div className="flex-shrink-0 text-center">
              <RiskGauge score={risk_score} level={risk_level} />
            </div>

            {/* Video info + narrative + key findings */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{videoName}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-gray-400 text-sm">
                <span>{fmtDuration(duration_s)}</span>
                <span>·</span>
                <span>{width}×{height} @ {fps.toFixed(1)} fps</span>
                <span>·</span>
                <span>{total_frames.toLocaleString()} frames</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Processed in {fmtDuration(processing_time_s)}
                </span>
              </div>

              {summary && (
                <p className="mt-3 text-gray-300 text-sm leading-relaxed border-l-2 border-white/15 pl-3">
                  {summary}
                </p>
              )}

              {/* Key findings */}
              <div className="mt-4">
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-2.5">Key Findings</p>
                <KeyFindings result={result} />
              </div>
            </div>

            {/* Severity breakdown */}
            <div className="flex-shrink-0 w-full md:w-auto bg-black/25 rounded-xl p-4 md:min-w-44 border border-white/5">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Severity</p>
              {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
                const cnt = severity_counts?.[sev] ?? 0;
                return (
                  <div key={sev} className="flex items-center justify-between gap-3 mb-2 last:mb-0">
                    <span className={`text-xs capitalize px-2 py-0.5 rounded border ${severityBadgeClass(sev)}`}>{sev}</span>
                    <span className="text-white font-bold tabular-nums">{cnt}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Trust & Validation ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Trust & Validation Signals
              </h2>
              <p className="text-gray-400 text-sm mt-1 max-w-3xl">
                Results are generated from multi-source evidence. Review confidence, severity, and correlated events before taking action.
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${severityBadgeClass(risk_level)}`}>
              Overall Risk: {risk_level.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Fusion corroboration</p>
              <p className="text-lg font-bold text-white mt-1">{alertFusions.length}/{fusion_insights.length || 1}</p>
              <p className="text-xs text-gray-400 mt-1">Alert windows with multimodal agreement.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Speech evidence</p>
              <p className="text-lg font-bold text-white mt-1">{cleanSpeech.length} segments</p>
              <p className="text-xs text-gray-400 mt-1">
                {detected_languages.length > 0
                  ? `${detected_languages.length} language profile(s) detected`
                  : 'No language profile detected'}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Identity stability</p>
              <p className="text-lg font-bold text-white mt-1">{distinctPersonCount(result)} people</p>
              <p className="text-xs text-gray-400 mt-1">
                Tracker fragments: {trackFragmentCount(result)} · lower fragmentation improves trust.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Key Metrics ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
        >
          <MetricCard icon={Users}       label="Distinct individuals" value={distinctPersonCount(result)}       sub={trackFragmentCount(result) > distinctPersonCount(result) ? `Max ${max_concurrent_persons} concurrent · ${trackFragmentCount(result)} tracker IDs` : `Max ${max_concurrent_persons} concurrent`}  color="text-cyan-400"   bg="bg-cyan-500/10"   border="border-cyan-500/20" />
          <MetricCard icon={Shield}      label="Surveillance Events" value={surveillance_events.length}        sub={`${severity_counts?.critical ?? 0} critical`} color="text-red-400"    bg="bg-red-500/10"    border="border-red-500/20" />
          <MetricCard icon={Brain}       label="Fusion Insights"     value={fusion_insights.length}            sub={`${alertFusions.length} alerts`}               color="text-pink-400"   bg="bg-pink-500/10"   border="border-pink-500/20" />
          <MetricCard icon={Mic}         label="Speech Segments"     value={cleanSpeech.length}                sub={detected_languages.map(l => l.name || l.code).join(', ') || '—'} color="text-green-400"  bg="bg-green-500/10"  border="border-green-500/20" />
          <MetricCard icon={Volume2}     label="Audio Events"        value={audio_events.length}               color="text-yellow-400" bg="bg-yellow-500/10" border="border-yellow-500/20" />
          <MetricCard icon={Eye}         label="Object Types"        value={Object.keys(class_frequencies).length} color="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" />
        </motion.div>

        {/* ── Intelligence Timeline ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-glass p-5"
        >
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Intelligence Timeline
            <span className="text-gray-600 text-sm font-normal ml-1">— hover for event details</span>
          </h2>
          <EventTimeline
            duration={duration_s}
            surveillanceEvents={surveillance_events}
            speechSegments={speech_segments}
            fusionInsights={fusion_insights}
            anomalyTimeline={anomaly_timeline}
          />
        </motion.div>

        {/* ── Labeled Video Player ── */}
        <VideoPlayer jobId={jobId!} />

        {/* ── Main content: two column ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: tabbed detail (2/3 width) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2 card-glass overflow-hidden"
          >
            {/* Tab bar */}
            <div className="flex border-b border-white/10 overflow-x-auto px-2 bg-white/5 backdrop-blur-md">
              {TABS.map(t => (
                <Tab
                  key={t.key}
                  tabKey={t.key}
                  label={tabCounts[t.key] !== null ? `${t.label} (${tabCounts[t.key]})` : t.label}
                  icon={t.icon}
                  active={tab === t.key}
                  onClick={() => setTab(t.key)}
                />
              ))}
            </div>

            <div className={tab === 'ai' ? '' : 'p-4'}>

              {/* AI Assistant */}
              {tab === 'ai' && <AIAssistant result={result} jobId={jobId!} />}

              {/* Events */}
              {tab === 'events' && <EventFeed events={surveillance_events} />}

              {tab === 'perframe' && (
                <FrameAnalyticsDeep points={frame_analytics || []} durationS={duration_s} />
              )}

              {/* Fusion insights */}
              {tab === 'fusion' && (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {fusion_insights.length === 0 ? (
                    <p className="text-center py-10 text-gray-600 text-sm">No fusion insights</p>
                  ) : (
                    fusion_insights.map((ins, i) => (
                      <div key={i} className={`p-3 rounded-xl border text-sm ${
                        ins.alert ? 'border-orange-500/30 bg-orange-500/5' : 'border-white/10 bg-transparent/40'
                      }`}>
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-gray-500 font-mono text-xs">
                            {fmtSeconds(ins.window_start_s)}–{fmtSeconds(ins.window_end_s)}
                          </span>
                          <span className="text-white font-semibold">{ins.scene_label.replace(/_/g, ' ')}</span>
                          {ins.alert && (
                            <span className="px-2 py-0.5 bg-orange-500/25 text-orange-300 text-xs rounded border border-orange-500/50 font-semibold">ALERT</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">{ins.description}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                          <span className="text-gray-600">
                            Anomaly: <span style={{ color: ins.anomaly_score > 0.5 ? '#f97316' : '#6b7280' }}>
                              {(ins.anomaly_score * 100).toFixed(0)}%
                            </span>
                          </span>
                          <span className="text-gray-600">AV-align: {(ins.visual_audio_alignment * 100).toFixed(0)}%</span>
                          <span className="text-gray-600">Conf: {(ins.confidence * 100).toFixed(0)}%</span>
                        </div>
                        {ins.contributing_factors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {ins.contributing_factors.map(f => (
                              <span key={f} className="px-1.5 py-0.5 bg-pink-500/15 text-pink-400 text-xs rounded border border-pink-500/25">
                                {f.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Speech */}
              {tab === 'speech' && (
                <div className="space-y-3">
                  <div className="bg-white/5 rounded-xl border border-white/10 p-3">
                    <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Translate Transcript</p>
                    <div className="flex gap-2 flex-wrap items-center">
                      <select
                        value={translateLang}
                        onChange={e => setTranslateLang(e.target.value)}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-cyan-500/60"
                      >
                        <option value="en">English</option>
                        <option value="ur">Urdu</option>
                        <option value="ar">Arabic</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="es">Spanish</option>
                        <option value="zh">Chinese</option>
                        <option value="hi">Hindi</option>
                        <option value="tr">Turkish</option>
                        <option value="ru">Russian</option>
                      </select>
                      <button
                        onClick={handleTranslateTranscript}
                        disabled={translating}
                        className="px-3 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-60 text-cyan-300 text-sm border border-cyan-500/30 transition-colors"
                      >
                        {translating ? 'Translating...' : 'Translate'}
                      </button>
                    </div>
                    {translatedText && (
                      <p className="mt-3 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap bg-black/20 rounded-lg p-3 border border-white/10">
                        {translatedText}
                      </p>
                    )}
                  </div>
                  {detected_languages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {detected_languages.map(l => (
                        <span key={l.code} className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/25">
                          {l.name || l.code} — {l.segment_count} segments
                        </span>
                      ))}
                    </div>
                  )}
                  {cleanSpeech.length === 0 ? (
                    <p className="text-center py-10 text-gray-600 text-sm">No speech detected</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {cleanSpeech.map((seg, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-transparent/50 rounded-xl border border-white/10">
                          <div className="text-right flex-shrink-0 w-16">
                            <p className="text-cyan-400 text-xs font-mono">{fmtSeconds(seg.start_s)}</p>
                            <p className="text-gray-700 text-xs font-mono">{fmtSeconds(seg.end_s)}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-200 text-sm leading-relaxed">{seg.text}</p>
                            <p className="text-gray-600 text-xs mt-1">
                              {(seg.confidence * 100).toFixed(0)}% conf
                              {seg.language && ` · ${seg.language_name || seg.language}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {full_transcript && (
                    <details className="mt-3">
                      <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-300 transition-colors select-none">
                        Full transcript ({full_transcript.length} chars)
                      </summary>
                      <p className="mt-2 text-gray-400 text-xs leading-relaxed bg-transparent/50 rounded-xl p-3 border border-white/10 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {full_transcript}
                      </p>
                    </details>
                  )}
                </div>
              )}

              {/* Audio */}
              {tab === 'audio' && (
                <div className="max-h-96 overflow-y-auto pr-1 space-y-1.5">
                  {audio_events.length === 0 ? (
                    <p className="text-center py-10 text-gray-600 text-sm">No audio events detected</p>
                  ) : (
                    audio_events.map((ae, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-transparent/50 rounded-xl border border-white/10">
                        <span className="text-yellow-400 text-xs font-mono w-12 flex-shrink-0">{fmtSeconds(ae.timestamp_s)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-sm capitalize">{ae.event_type.replace(/_/g, ' ')}</p>
                          {ae.details && <p className="text-gray-600 text-xs mt-0.5 truncate">{ae.details}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-16 bg-white/10 rounded-full h-1.5">
                            <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${ae.confidence * 100}%` }} />
                          </div>
                          <span className="text-gray-600 text-xs tabular-nums">{(ae.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Objects */}
              {tab === 'objects' && (
                <div className="space-y-4">
                  {topObjectList.length === 0 ? (
                    <p className="text-center py-10 text-gray-600 text-sm">No objects detected</p>
                  ) : (
                    <>
                      <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Top Detected Objects</p>
                      <HBarChart data={topObjectList} color="#22d3ee" />
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                        {Object.entries(class_frequencies).sort((a,b)=>b[1]-a[1]).map(([label, count]) => (
                          <span key={label} className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-full border border-cyan-500/20 capitalize">
                            {label} <span className="text-cyan-600">×{count}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              {tab === 'actions' && (
                <div className="space-y-4">
                  {topActions.length === 0 ? (
                    <p className="text-center py-10 text-gray-600 text-sm">No actions recognised</p>
                  ) : (
                    <>
                      <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Action Recognition — VideoMAE + Pose</p>
                      <HBarChart data={topActions} color="#a78bfa" />
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                        {topActions.map(({ label, value }) => (
                          <span key={label} className="px-2.5 py-1 bg-violet-500/10 text-violet-400 text-xs rounded-full border border-violet-500/20 capitalize">
                            {label.replace(/_/g, ' ')} <span className="text-violet-600">×{value}</span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* HTML Report */}
              {tab === 'report' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-500 text-xs uppercase tracking-widest">Generated Intelligence Report</p>
                    <a
                      href={getReportUrl(jobId!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 text-xs transition-colors"
                    >
                      <Maximize2 className="w-3 h-3" />
                      Open Full Report
                    </a>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-white/10 bg-transparent">
                    <iframe
                      src={getReportUrl(jobId!)}
                      className="w-full border-0"
                      style={{ height: 480 }}
                      title="Detectra AI Analysis Report"
                      sandbox="allow-same-origin allow-scripts"
                    />
                  </div>
                  <p className="text-gray-700 text-xs text-center">
                    Report generated by the backend · includes all detection data, charts, and summary narrative
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right: sidebar (1/3 width) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-5"
          >
            {/* Anomaly chart */}
            {anomaly_timeline.length > 0 && (
              <div className="card-glass p-5">
                <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5" />
                  Anomaly Score / Second
                </h3>
                <div className="flex items-end gap-0.5 h-24">
                  {anomaly_timeline.map((score, t) => {
                    const color = score > 0.75 ? '#ef4444' : score > 0.5 ? '#f97316' : score > 0.25 ? '#eab308' : '#374151';
                    return (
                      <div
                        key={t}
                        title={`${fmtSeconds(t)}: ${(score * 100).toFixed(0)}%`}
                        className="flex-1 rounded-sm transition-all hover:opacity-70"
                        style={{ height: `${Math.max(2, score * 100)}%`, backgroundColor: color, minWidth: 2 }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-gray-700 text-xs mt-1">
                  <span>0:00</span>
                  <span>{fmtSeconds(duration_s)}</span>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-3">
                  {[['#ef4444', 'Critical'], ['#f97316', 'High'], ['#eab308', 'Medium'], ['#374151', 'Low']].map(([c, l]) => (
                    <span key={l} className="flex items-center gap-1 text-xs text-gray-500">
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c }} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Video metadata */}
            <div className="card-glass p-5">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Video Metadata
              </h3>
              {[
                { label: 'Duration',     value: fmtDuration(duration_s) },
                { label: 'Resolution',   value: `${width}×${height}` },
                { label: 'Frame Rate',   value: `${fps.toFixed(1)} fps` },
                { label: 'Total Frames', value: total_frames.toLocaleString() },
                { label: 'Processed in', value: fmtDuration(processing_time_s) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/10 last:border-0">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className="text-gray-300 text-xs font-semibold tabular-nums">{value}</span>
                </div>
              ))}
            </div>

            {/* Languages */}
            {detected_languages.length > 0 && (
              <div className="card-glass p-5">
                <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5" />
                  Detected Languages
                </h3>
                <div className="space-y-2.5">
                  {detected_languages.map(l => (
                    <div key={l.code} className="flex items-center gap-2">
                      <span className="text-gray-300 text-sm flex-1">{l.name || l.code}</span>
                      <div className="w-20 bg-white/10 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${l.confidence * 100}%` }} />
                      </div>
                      <span className="text-gray-600 text-xs tabular-nums">{l.segment_count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Downloads */}
            <div className="card-glass p-5">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">Export</h3>
              <div className="space-y-2">
                <a href={getRagJsonUrl(jobId!)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/20 text-sm transition-colors">
                  <FileJson className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">RAG JSON</span>
                </a>
                <a href={getReportUrl(jobId!)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 text-sm transition-colors">
                  <Download className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">HTML Report</span>
                </a>
                <a href={getVideoUrl(jobId!)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-3 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/20 text-sm transition-colors">
                  <Film className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">Labeled Video</span>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
