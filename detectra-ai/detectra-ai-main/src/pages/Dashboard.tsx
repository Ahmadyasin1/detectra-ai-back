/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cpu, RotateCw, UploadCloud, Film, X, Radio, Play, Database, Video, Shield,
  Users, TrendingUp, Brain, FileText, Download, Bell, Loader2, Square,
  Search, SlidersHorizontal, Sparkles, Trash2, ExternalLink
} from 'lucide-react';
import Chart from 'chart.js/auto';
import {
  submitVideo, submitVideoFromUrl, checkHealth, getJobResult, listMyJobs, deleteJob,
  getReportUrl, getVideoUrl, distinctPersonCount, apiUrl, getLiveWsUrl,
  type JobStatus, type AnalysisResult, type ApiHealth,
} from '../lib/detectraApi';
import './Dashboard.css';
import {
  createVideoUpload,
  getUserVideoUploads,
  getVideoUploadByJobId,
  deleteVideoUpload,
  uploadVideoFileToBucket,
  updateVideoUpload,
} from '../lib/supabaseDb';
import { mergeJobsFromApiAndDatabase, jobsFromUploadsOnly } from '../lib/jobListMerge';
import { isSupabaseConfigured } from '../lib/supabase';

// Reusing global styling via style tag
const DashboardStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
    .glass {
      background: rgba(13, 17, 23, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid #21262d;
    }
    .panel {
      background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    }
    .panel:hover {
      border-color: rgba(34,211,238,0.25);
    }
    .soft-ring {
      box-shadow:
        0 0 0 1px rgba(255,255,255,0.06) inset,
        0 18px 50px rgba(0,0,0,0.55);
    }
    .btn-premium {
      background: linear-gradient(135deg, rgba(34,211,238,0.18), rgba(59,130,246,0.10));
      border: 1px solid rgba(34,211,238,0.28);
      color: rgba(165,243,252,0.92);
    }
    .btn-premium:hover { background: linear-gradient(135deg, rgba(34,211,238,0.26), rgba(59,130,246,0.14)); }
    .btn-ghost {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: rgba(226,232,240,0.92);
    }
    .btn-ghost:hover { background: rgba(255,255,255,0.09); }
    .btn-danger {
      background: rgba(244,63,94,0.10);
      border: 1px solid rgba(244,63,94,0.20);
      color: rgba(251,113,133,0.95);
    }
    .btn-danger:hover { background: rgba(244,63,94,0.16); }
    .brand-gradient {
      background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-bg-gradient {
      background: linear-gradient(135deg, #22d3ee 0%, #3b82f6 100%);
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .custom-scroll::-webkit-scrollbar { width: 4px; }
    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #21262d; border-radius: 10px; }
    
    @keyframes scanline {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100%); }
    }
    .scanline {
      position: absolute;
      top: 0; left: 0; width: 100%; height: 2px;
      background: rgba(34, 211, 238, 0.25);
      box-shadow: 0 0 10px rgba(34, 211, 238, 0.45);
      animation: scanline 4s linear infinite;
      pointer-events: none;
      z-index: 10;
    }
    .table-sticky thead th {
      position: sticky;
      top: 0;
      z-index: 5;
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(14px);
    }
  `}</style>
);

const fmtTime = (s: number) => {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [apiOnline, setApiOnline] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Initializing...');
  const [health, setHealth] = useState<ApiHealth | null>(null);
  
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobQuery, setJobQuery] = useState('');
  const [jobFilter, setJobFilter] = useState<'all' | 'completed' | 'running' | 'pending' | 'failed'>('all');
  
  // Job Data
  const [jobData, setJobData] = useState<any>(null);
  
  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bucketWarning, setBucketWarning] = useState<string | null>(null);
  
  // Live State
  const [isLive, setIsLive] = useState(false);
  const [streamSrc, setStreamSrc] = useState('0');
  const [liveCanvasSrc, setLiveCanvasSrc] = useState('');
  const [livePersons, setLivePersons] = useState(0);
  const [liveAction, setLiveAction] = useState('IDLE');
  
  // Ledger/Alerts
  const [alertsFeed, setAlertsFeed] = useState<any[]>([]);

  // Refs
  const liveWsRef = useRef<WebSocket | null>(null);
  const densityChartRef = useRef<any>(null);
  const anomalyChartRef = useRef<any>(null);

  const checkServerHealth = async () => {
    try {
      const res = await checkHealth();
      setApiOnline(true);
      setHealth(res);
      if (res.models_loaded) {
        setBackendStatus(res.active_jobs > 0 ? `ACTIVE JOBS: ${res.active_jobs}` : 'AI MODELS READY');
      } else {
        setBackendStatus('LOADING AI MODELS…');
      }
    } catch {
      setApiOnline(false);
      setHealth(null);
      setBackendStatus('WAITING FOR ENGINE...');
    }
  };

  useEffect(() => {
    checkServerHealth();
    const interval = setInterval(checkServerHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const list = await listMyJobs();
      if (user && isSupabaseConfigured) {
        const uploads = await getUserVideoUploads(user.id).catch(() => []);
        setJobs(mergeJobsFromApiAndDatabase(list, uploads, user.id));
      } else {
        setJobs(list);
      }
    } catch (err) {
      console.warn('Jobs list fetch failed', err);
      if (user && isSupabaseConfigured) {
        try {
          const uploads = await getUserVideoUploads(user.id);
          setJobs(jobsFromUploadsOnly(uploads, user.id));
        } catch {
          setJobs([]);
        }
      } else {
        setJobs([]);
      }
    }
  };

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  const startUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    
    try {
      let uploadResult: { storagePath: string; publicUrl: string | null; error: string | null } | null = null;
      if (user && isSupabaseConfigured) {
        uploadResult = await uploadVideoFileToBucket(selectedFile);
      }

      // Only use the bucket-routed path when the upload actually succeeded.
      // On any error we silently fall back to direct multipart upload — this
      // avoids the "Bucket not found / object missing" cascade where the
      // backend later fails to download a path that was never created.
      const bucketOk = !!uploadResult && !uploadResult.error;

      let res;
      if (bucketOk && uploadResult?.publicUrl) {
        res = await submitVideoFromUrl(uploadResult.publicUrl, null, null, selectedFile.name || 'upload.mp4');
      } else if (bucketOk && uploadResult?.storagePath) {
        res = await submitVideoFromUrl(null, uploadResult.storagePath, null, selectedFile.name || 'upload.mp4');
      } else {
        if (uploadResult?.error && uploadResult.error !== 'guest_mode') {
          console.warn(
            `[Dashboard] Supabase bucket upload failed (${uploadResult.error}). Falling back to direct multipart upload.`,
          );
          if (/bucket.*not.*found/i.test(uploadResult.error)) {
            setBucketWarning(
              `Storage bucket "${import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'videos'}" not found in Supabase. ` +
                'Create it in Supabase Dashboard → Storage, or set VITE_SUPABASE_STORAGE_BUCKET to match an existing bucket. ' +
                'Falling back to direct upload for now.',
            );
          }
        }
        res = await submitVideo(selectedFile);
      }

      if (user && isSupabaseConfigured) {
        await createVideoUpload(user.id, res.job_id, selectedFile.name || res.video_name).catch(console.warn);
      }
      clearFile();
      navigate(`/analyze/progress/${res.job_id}`);
    } catch (err: any) {
      alert(`Upload failed: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const applyResultToDashboard = (result: AnalysisResult) => {
    setJobData(result);
    const typed = result as AnalysisResult;
    const densityFrames = typed.frame_analytics?.length
      ? typed.frame_analytics.map(p => ({ timestamp_s: p.t, person_count: p.person_count }))
      : [];
    initDensityChart(densityFrames);
    initAnomalyChart(typed.fusion_insights || []);

    const newAlerts = (result.surveillance_events || [])
      .filter((e: any) => e.severity === 'critical' || e.severity === 'high')
      .slice()
      .reverse();
    setAlertsFeed(newAlerts.slice(0, 20));
  };

  const loadJobData = async (jobId: string) => {
    setCurrentJobId(jobId);
    setJobData(null);

    try {
      const result = await getJobResult(jobId);
      applyResultToDashboard(result);

      if (user && isSupabaseConfigured) {
        updateVideoUpload(user.id, jobId, {
          status: 'completed',
          analysis_results: result,
        }).catch(console.warn);
      }
      loadJobs();
    } catch {
      if (user && isSupabaseConfigured) {
        const row = await getVideoUploadByJobId(user.id, jobId).catch(() => null);
        if (row?.analysis_results) {
          applyResultToDashboard(row.analysis_results);
          loadJobs();
          return;
        }
      }
      console.warn('Load Job Data Error: API offline or job missing, no cached result');
    }
  };

  const pushAlert = (e: any, liveTs: number | null = null) => {
    setAlertsFeed(prev => {
      const isCrit = e.severity === 'critical';
      const newAlert = {
        id: Math.random().toString(),
        event_type: e.event_type || 'UNKNOWN',
        timestamp: liveTs ? `${liveTs}s` : fmtTime(e.timestamp_s),
        description: e.description,
        isCrit
      };
      const updated = [newAlert, ...prev];
      if (updated.length > 20) return updated.slice(0, 20);
      return updated;
    });
  };

  const initDensityChart = (frames: any[]) => {
    const canvas = document.getElementById('density-chart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (densityChartRef.current) densityChartRef.current.destroy();
    
    densityChartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: frames.map(f => fmtTime(f.timestamp_s)),
        datasets: [{
          label: 'Tracks',
          data: frames.map(f => f.person_count),
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34, 211, 238, 0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { min: 0, grid: { color: 'rgba(255,255,255,0.05)' } as any, ticks: { color: '#6e7681', font: { size: 9 } } }
        }
      }
    });
  };

  const initAnomalyChart = (ins: any[]) => {
    const canvas = document.getElementById('anomaly-chart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (anomalyChartRef.current) anomalyChartRef.current.destroy();
    
    anomalyChartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ins.map(i => fmtTime(i.window_start_s)),
        datasets: [{
          label: 'Anomaly Score',
          data: ins.map(i => i.anomaly_score),
          backgroundColor: ins.map(i => i.anomaly_score > 0.65 ? 'rgba(244, 63, 94, 0.6)' : i.anomaly_score > 0.4 ? 'rgba(251, 146, 60, 0.5)' : 'rgba(16, 185, 129, 0.3)'),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: true, grid: { display: false }, ticks: { color: '#6e7681', font: { size: 8 } } },
          y: { min: 0, max: 1, grid: { color: 'rgba(255,255,255,0.05)' } as any, ticks: { color: '#6e7681', font: { size: 9 } } }
        }
      }
    });
  };

  const toggleLive = async () => {
    if (isLive) {
      await fetch(apiUrl('/api/live/stop'), { method: 'DELETE' }).catch(console.warn);
      stopLive();
    } else {
      try {
        const res = await fetch(
          apiUrl(`/api/live/start?source=${encodeURIComponent(streamSrc)}`),
          { method: 'POST' },
        );
        if (res.ok) startLive();
        else alert(`Live stream failed (HTTP ${res.status}). Check the backend.`);
      } catch (err) {
        console.error('Live start failed:', err);
        alert('Failed to reach live-stream processor — is the backend running?');
      }
    }
  };

  const startLive = () => {
    setIsLive(true);
    connectLiveSocket();
  };

  const stopLive = () => {
    setIsLive(false);
    if (liveWsRef.current) {
      try { liveWsRef.current.close(); } catch { /* noop */ }
      liveWsRef.current = null;
    }
  };

  const connectLiveSocket = () => {
    try {
      const ws = new WebSocket(getLiveWsUrl());
      liveWsRef.current = ws;
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'frame') {
            if (msg.frame_b64) setLiveCanvasSrc(`data:image/jpeg;base64,${msg.frame_b64}`);
            setLivePersons(msg.persons || 0);
            setLiveAction(msg.action || 'IDLE');
            if (Array.isArray(msg.alerts) && msg.alerts.length > 0) {
              msg.alerts.forEach((a: any) => pushAlert(a, msg.ts));
            }
          } else if (msg.type === 'live_stopped') {
            stopLive();
          }
        } catch (err) {
          console.warn('[Live] malformed frame:', err);
        }
      };
      ws.onerror = (err) => console.warn('[Live] WebSocket error:', err);
      ws.onclose = () => {
        if (liveWsRef.current === ws) {
          liveWsRef.current = null;
          setIsLive(false);
        }
      };
    } catch (err) {
      console.error('[Live] failed to open WebSocket:', err);
      stopLive();
    }
  };

  const handleDownloadReport = () => {
    if (currentJobId) window.open(getReportUrl(currentJobId), '_blank');
  };

  const handleDownloadVideo = () => {
    if (currentJobId) window.open(getVideoUrl(currentJobId), '_blank');
  };

  const handleOpenJob = (jobId: string, status?: string) => {
    if (!jobId) return;
    if (status === 'completed') navigate(`/analyze/results/${jobId}`);
    else navigate(`/analyze/progress/${jobId}`);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!jobId) return;
    const ok = confirm('Delete this analysis job (including report/video outputs)?');
    if (!ok) return;
    try {
      await deleteJob(jobId);
    } catch (err) {
      console.warn('Backend job delete failed:', err);
    }
    if (user && isSupabaseConfigured) {
      await deleteVideoUpload(user.id, jobId).catch(() => {});
    }
    if (currentJobId === jobId) setCurrentJobId(null);
    await loadJobs();
  };

  // Safe checks for rendering
  const r = jobData;
  const distinctPeopleCount = r ? distinctPersonCount(r as AnalysisResult) : 0;
  const eventsCount = r ? (r.surveillance_events || []).length : 0;
  const speechCount = r ? (r.speech_segments || []).filter((v: any) => !v.is_noise).length : 0;
  const risk = r?.risk_level || 'STABLE';
  const riskClass = risk === 'CRITICAL' ? 'text-rose-500' : risk === 'HIGH' ? 'text-orange-400' : 'text-cyan-400';
  const filteredJobs = jobs
    .filter(j => {
      if (jobFilter === 'all') return true;
      if (jobFilter === 'running') return j.status === 'running';
      if (jobFilter === 'pending') return j.status === 'pending';
      if (jobFilter === 'completed') return j.status === 'completed';
      if (jobFilter === 'failed') return j.status === 'failed';
      return true;
    })
    .filter(j => {
      const q = jobQuery.trim().toLowerCase();
      if (!q) return true;
      return (j.video_name || '').toLowerCase().includes(q) || (j.job_id || '').toLowerCase().includes(q);
    });

  return (
    <>
      <DashboardStyles />
      <div className="min-h-screen flex flex-col font-[Inter] bg-[#05070a] text-[#e6edf3] overflow-x-hidden pt-20 md:pt-24">
        {!user && !isSupabaseConfigured && (
          <div className="px-6 pb-2">
            <div className="panel soft-ring rounded-2xl px-4 py-2.5 border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-amber-200/90">
                Guest mode — account & history features are off. Add <code className="font-mono">VITE_SUPABASE_URL</code> &amp; <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to <code className="font-mono">.env</code> to enable them. The AI pipeline still works.
              </span>
            </div>
          </div>
        )}
        {bucketWarning && (
          <div className="px-6 pb-2">
            <div className="panel soft-ring rounded-2xl px-4 py-2.5 border border-orange-500/30 bg-orange-500/5 flex items-start justify-between gap-3">
              <span className="text-[11px] text-orange-200/90 leading-relaxed">{bucketWarning}</span>
              <button
                onClick={() => setBucketWarning(null)}
                className="text-orange-300/70 hover:text-orange-200 text-[10px] font-bold uppercase tracking-widest"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        <div className="px-6 pb-4">
          <div className="panel soft-ring rounded-2xl px-4 py-3 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-cyan-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-700'}`}></span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${apiOnline ? 'text-cyan-400' : 'text-slate-500'}`}>
                {apiOnline ? 'API ONLINE' : 'API OFFLINE'}
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {backendStatus}
              </span>
              {health?.version && (
                <span className="hidden md:inline text-slate-600 font-mono text-[10px]">
                  v{health.version}
                </span>
              )}
            </div>
            <button onClick={loadJobs} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white" title="Refresh data">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-80 border-r border-[#21262d] flex flex-col bg-transparent/20">
            {/* Upload Section */}
            <div className="p-5 border-b border-white/10 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <UploadCloud className="w-3.5 h-3.5" />
                Ingest Evidence
              </h3>
              
              {!selectedFile ? (
                <label className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all cursor-pointer panel soft-ring">
                  <input type="file" className="hidden" accept="video/*" onChange={handleFileSelect} />
                  <Film className="w-8 h-8 text-slate-600 group-hover:text-cyan-400 mb-2 transition-colors" />
                  <span className="text-xs font-semibold text-slate-200">Drop a video or browse</span>
                  <span className="text-[10px] text-slate-500 mt-1">MP4, AVI, MOV · up to 500MB</span>
                </label>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-md rounded-lg border border-white/10 panel soft-ring">
                    <Video className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs truncate flex-1 font-medium">{selectedFile.name}</span>
                    <button onClick={clearFile} className="p-1 text-slate-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button 
                    onClick={startUpload}
                    disabled={isUploading}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl brand-bg-gradient text-slate-900 font-extrabold text-sm shadow-lg shadow-cyan-500/25 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {isUploading ? <><Loader2 className="w-4 h-4 animate-spin"/> UPLOADING...</> : 'EXECUTE ANALYSIS'}
                  </button>
                </div>
              )}
            </div>

            {/* Live Stream Section */}
            <div className="p-5 border-b border-white/10 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5" />
                Active Surveillance
              </h3>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={streamSrc}
                  onChange={(e) => setStreamSrc(e.target.value)}
                  placeholder="Source (0 or URL)" 
                  className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-cyan-500/50 outline-none text-slate-300" 
                />
                <button 
                  onClick={toggleLive}
                  className={`px-4 py-2 rounded-lg border font-bold text-xs hover:bg-opacity-20 transition-all flex items-center gap-1.5 ${
                    isLive 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20' 
                      : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'
                  }`}
                >
                  {isLive ? <><Square className="w-3 h-3 border border-current rounded-sm"/> STOP</> : <><Play className="w-3 h-3"/> LIVE</>}
                </button>
              </div>
            </div>

            {/* Historical Records */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 pb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  Archive Jobs
                </h3>
              </div>
              <div className="px-5 pb-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 panel">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input
                      value={jobQuery}
                      onChange={(e) => setJobQuery(e.target.value)}
                      placeholder="Search by name or job id…"
                      className="w-full bg-transparent text-xs text-slate-200 placeholder:text-slate-600 outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 panel">
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                    <select
                      value={jobFilter}
                      onChange={(e) => setJobFilter(e.target.value as any)}
                      className="bg-transparent text-xs text-slate-200 outline-none"
                    >
                      <option value="all">All</option>
                      <option value="completed">Completed</option>
                      <option value="running">Running</option>
                      <option value="pending">Queued</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-600">
                  <span className="font-mono">{filteredJobs.length} job(s)</span>
                  <button onClick={loadJobs} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-200 transition-colors">
                    <RotateCw className="w-3.5 h-3.5" /> refresh
                  </button>
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-2 p-5 pt-0 overflow-y-auto custom-scroll">
                {!filteredJobs.length ? (
                  <div className="text-center py-10 opacity-30">
                    <Database className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs font-mono">No jobs found</p>
                  </div>
                ) : (
                  filteredJobs.map(j => (
                    <div 
                      key={j.job_id} 
                      className={`p-3 bg-white/5 backdrop-blur-md border rounded-2xl transition-all group panel soft-ring ${
                        j.job_id === currentJobId ? 'ring-1 ring-cyan-500 border-cyan-500' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-extrabold text-slate-300 truncate group-hover:text-white transition-colors">
                          {j.video_name}
                        </span>
                        <span className="text-[8px] font-mono text-slate-600 truncate max-w-[60px]">{j.job_id}</span>
                      </div>
                      <div className="flex items-center gap-2 border-white/10">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          j.status === 'completed' ? 'bg-cyan-500/10 text-cyan-500' :
                          j.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {j.status}
                        </span>
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full brand-bg-gradient" style={{ width: `${j.status === 'completed' ? 100 : j.progress}%` }}></div>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">{j.processing_s ?? 0}s</span>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleOpenJob(j.job_id, j.status)}
                          className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all btn-premium"
                        >
                          <span className="inline-flex items-center justify-center gap-1">
                            Open <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </button>
                        <button
                          onClick={() => loadJobData(j.job_id)}
                          className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all btn-ghost"
                          title="Preview metrics in dashboard"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteJob(j.job_id)}
                          className="py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all btn-danger"
                          title="Delete job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Center Stage: Analytics & Feed */}
          <section className="flex-1 flex flex-col bg-black relative">
            <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-6">

              {/* Empty state when no job is selected */}
              {!r && !isLive && (
                <div className="panel soft-ring rounded-3xl p-7 border border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl brand-bg-gradient flex items-center justify-center shadow-lg shadow-cyan-500/20">
                      <Sparkles className="w-6 h-6 text-slate-900" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-extrabold tracking-tight text-white">Analyze footage in seconds</h2>
                      <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                        Upload a video to run multimodal detection (visual + audio + fusion). Or open a previous job to view charts, alerts, and the full report.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement | null)?.click()}
                          className="px-4 py-2 rounded-xl font-extrabold text-sm btn-premium"
                        >
                          Upload video
                        </button>
                        <button
                          onClick={() => setJobFilter('completed')}
                          className="px-4 py-2 rounded-xl font-extrabold text-sm btn-ghost"
                        >
                          View completed jobs
                        </button>
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] text-slate-400">
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                          <div className="text-slate-200 font-bold">Pipeline timeline</div>
                          <div className="text-slate-500 mt-0.5">Live stage updates + ETA</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                          <div className="text-slate-200 font-bold">Risk scoring</div>
                          <div className="text-slate-500 mt-0.5">Severity-weighted alerts</div>
                        </div>
                        <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                          <div className="text-slate-200 font-bold">Exportables</div>
                          <div className="text-slate-500 mt-0.5">Report + labeled footage</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Live Preview Stage */}
              <div className={`animate-in zoom-in-95 duration-300 ${!isLive ? 'hidden' : ''}`}>
                <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-2xl panel soft-ring">
                  <div className="scanline"></div>
                  {liveCanvasSrc && <img src={liveCanvasSrc} className="w-full h-auto min-h-[300px] object-contain" alt="SURVEILLANCE FEED" />}
                  <div className="absolute top-4 left-4 flex gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/90 rounded-md shadow-lg animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">LIVE FEED</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-md border border-white/10">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-mono font-bold">{livePersons.toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="px-2 py-0.5 bg-cyan-500 text-black inline-block text-[10px] font-black uppercase rounded">{liveAction}</div>
                      <div className="text-[10px] font-mono text-white/70 drop-shadow-md">CAM_01 // MULTIMODAL_FUSION_ACTIVE</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                <div className="p-4 panel soft-ring rounded-3xl flex flex-col items-center justify-center text-center group cursor-default transition-all">
                  <Users className="w-4 h-4 text-slate-600 mb-2" />
                  <span className="text-3xl font-black brand-gradient mono">{distinctPeopleCount.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Distinct individuals</span>
                </div>
                <div className="p-4 panel soft-ring rounded-3xl flex flex-col items-center justify-center text-center group cursor-default transition-all">
                  <Bell className="w-4 h-4 text-slate-600 mb-2" />
                  <span className="text-3xl font-black text-rose-500 mono">{eventsCount.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Surv Events</span>
                </div>
                <div className="p-4 panel soft-ring rounded-3xl flex flex-col items-center justify-center text-center group cursor-default transition-all">
                  <Shield className="w-4 h-4 text-slate-600 mb-2" />
                  <span className={`text-lg font-black uppercase tracking-tighter ${riskClass}`}>{risk}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Risk Index</span>
                </div>
                <div className="p-4 panel soft-ring rounded-3xl flex flex-col items-center justify-center text-center group cursor-default transition-all">
                  <Cpu className="w-4 h-4 text-slate-600 mb-2" />
                  <span className="text-3xl font-black text-blue-400 mono">{speechCount.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Audio Cues</span>
                </div>
                <div className="p-4 panel soft-ring rounded-3xl flex flex-col items-center justify-center text-center group cursor-default transition-all col-span-2 md:col-span-1">
                  <Sparkles className="w-4 h-4 text-slate-600 mb-2" />
                  <span className="text-xs font-black text-cyan-400">{r ? 'READY' : '—'}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">System State</span>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 panel soft-ring rounded-3xl space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Track Density
                  </h4>
                  <div className="h-48 relative w-full">
                    <canvas id="density-chart"></canvas>
                  </div>
                </div>
                <div className="p-6 panel soft-ring rounded-3xl space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5" /> Anomaly Fusion Scoring
                  </h4>
                  <div className="h-48 relative w-full">
                    <canvas id="anomaly-chart"></canvas>
                  </div>
                </div>
              </div>

              {/* Event Ledger */}
              <div className="panel soft-ring rounded-3xl overflow-hidden border border-white/10">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#21262d]">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Security Occurrence Ledger</h4>
                  <span className="px-2 py-0.5 bg-white/10 text-slate-300 text-[10px] rounded-full font-mono">{eventsCount} ENTRIES</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-separate border-spacing-0 table-sticky">
                    <thead>
                      <tr className="bg-white/5 backdrop-blur-md">
                        <th className="px-6 py-3 border-b border-[#21262d] text-slate-500 uppercase font-bold tracking-wider">Timestamp</th>
                        <th className="px-6 py-3 border-b border-[#21262d] text-slate-500 uppercase font-bold tracking-wider">Severity</th>
                        <th className="px-6 py-3 border-b border-[#21262d] text-slate-500 uppercase font-bold tracking-wider">Classification</th>
                        <th className="px-6 py-3 border-b border-[#21262d] text-slate-500 uppercase font-bold tracking-wider">Contextual Description</th>
                        <th className="px-6 py-3 border-b border-[#21262d] text-slate-500 uppercase font-bold tracking-wider text-right">Conf %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#21262d]/50">
                      {eventsCount === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-slate-500 italic">No anomalies detected or load a completed job.</td>
                        </tr>
                      ) : (
                        r.surveillance_events.map((e: any, idx: number) => (
                          <tr key={idx} className={`transition-colors group ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''} hover:bg-white/5`}>
                              <td className="px-6 py-4 font-mono text-cyan-400 font-bold">{fmtTime(e.timestamp_s)}</td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                    e.severity==='critical'?'bg-rose-500/20 text-rose-500':'bg-orange-500/20 text-orange-400'
                                  }`}>{e.severity}</span>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-200 capitalize w-max truncate">{e.event_type.replace(/_/g, ' ')}</td>
                              <td className="px-6 py-4 text-slate-400 group-hover:text-slate-200 transition-colors w-max">{e.description}</td>
                              <td className="px-6 py-4 text-right font-mono text-slate-500">{Math.round(e.confidence*100)}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Action Header */}
            {r && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-end justify-between border-t border-white/10 animate-in slide-in-from-bottom-5">
                <div className="max-w-xl">
                  <h2 className="text-2xl font-black truncate">{r.video_name}</h2>
                  <p className="text-slate-400 text-xs mt-1">
                    {Math.floor(r.duration_s || 0)}s Footage // {r.height}p @ {Math.round(r.fps)}fps // {eventsCount} Surveillance Hits
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap justify-end">
                  <Link
                    to={`/analyze/results/${currentJobId}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 font-bold transition-all"
                  >
                    <Brain className="w-4 h-4" /> DEEP ANALYSIS
                  </Link>
                  <button onClick={handleDownloadReport} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-slate-700 text-slate-200 border border-white/20 font-bold transition-all">
                    <FileText className="w-4 h-4" /> EXPORT REPORT
                  </button>
                  <button onClick={handleDownloadVideo} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-xl shadow-cyan-500/20">
                    <Download className="w-4 h-4" /> RETRIEVE FOOTAGE
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Right Sidebar: Live Alerts Feed */}
          <aside className="w-72 border-l border-[#21262d] flex-col bg-transparent/40 hidden xl:flex">
            <div className="p-5 border-b border-[#21262d] bg-white/5 backdrop-blur-md flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Intel Log
              </h3>
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
              {alertsFeed.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <Bell className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Listening for insights</p>
                </div>
              ) : (
                alertsFeed.map((e) => (
                  <div key={e.id} className={`p-4 rounded-2xl border panel soft-ring ${e.isCrit ? 'bg-rose-500/5 border-rose-500/20' : 'bg-orange-500/5 border-orange-500/20'} animate-in slide-in-from-right-5 duration-300`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${e.isCrit ? 'text-rose-500' : 'text-orange-400'}`}>{e.event_type.replace(/_/g, ' ')}</span>
                        <span className="text-[9px] font-mono text-slate-600">{e.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{e.description}</p>
                  </div>
                ))
              )}
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
