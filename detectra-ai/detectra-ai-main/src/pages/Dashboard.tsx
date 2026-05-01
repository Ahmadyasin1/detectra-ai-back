/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-empty */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Cpu, RotateCw, UploadCloud, Film, X, Radio, Play, Database, Video,
  Users, TrendingUp, Brain, FileText, Download, Bell, Loader2, Square, Info,
  User, LogOut
} from 'lucide-react';
import Chart from 'chart.js/auto';
import {
  submitVideo, checkHealth, getJobStatus, getJobResult, listMyJobs,
  getReportUrl, getVideoUrl, type JobStatus
} from '../lib/detectraApi';
import { createVideoUpload } from '../lib/supabaseDb';

// Reusing global styling via style tag
const DashboardStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
    .glass {
      background: rgba(13, 17, 23, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid #21262d;
    }
    .brand-gradient {
      background: linear-gradient(135deg, #00e5a0 0%, #00c2ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .brand-bg-gradient {
      background: linear-gradient(135deg, #00e5a0 0%, #00c2ff 100%);
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
      background: rgba(0, 229, 160, 0.2);
      box-shadow: 0 0 10px rgba(0, 229, 160, 0.5);
      animation: scanline 4s linear infinite;
      pointer-events: none;
      z-index: 10;
    }
  `}</style>
);

const API_URL = window.location.origin;

const fmtTime = (s: number) => {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [serverTime, setServerTime] = useState('00:00:00');
  const [apiOnline, setApiOnline] = useState(false);
  const [backendStatus, setBackendStatus] = useState('Initializing...');
  
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  
  // Job Data
  const [jobData, setJobData] = useState<any>(null);
  
  // Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Processing Overlay
  const [isProcessing, setIsProcessing] = useState(false);
  const [procProgress, setProcProgress] = useState(0);
  const [procStage, setProcStage] = useState('INITIALIZING ENGINES...');
  const [procTimer, setProcTimer] = useState(0);
  
  // Live State
  const [isLive, setIsLive] = useState(false);
  const [streamSrc, setStreamSrc] = useState('0');
  const [liveCanvasSrc, setLiveCanvasSrc] = useState('');
  const [livePersons, setLivePersons] = useState(0);
  const [liveAction, setLiveAction] = useState('IDLE');
  
  // Ledger/Alerts
  const [alertsFeed, setAlertsFeed] = useState<any[]>([]);

  // Refs
  const jobWsRef = useRef<WebSocket | null>(null);
  const liveWsRef = useRef<WebSocket | null>(null);
  const densityChartRef = useRef<any>(null);
  const anomalyChartRef = useRef<any>(null);
  const procIntervalRef = useRef<any>(null);

  useEffect(() => {
    const timerId = setInterval(() => {
      setServerTime(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  const checkServerHealth = async () => {
    try {
      const res = await checkHealth();
      setApiOnline(true);
      setBackendStatus(res.status === 'ok' ? 'AI MODELS READY' : 'MODELS INITIALIZING...');
    } catch {
      setApiOnline(false);
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
      setJobs(list);
    } catch (err) {
      console.warn('Jobs list fetch failed', err);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

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
      const res = await submitVideo(selectedFile);
      if (user) {
        await createVideoUpload(user.id, res.job_id, res.video_name).catch(console.warn);
      }
      initProcessing(res.job_id);
    } catch (err: any) {
      alert(`Critical System Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const initProcessing = (jobId: string) => {
    setIsProcessing(true);
    setProcTimer(0);
    setCurrentJobId(jobId);
    setProcProgress(0);
    setProcStage('INITIALIZING ENGINES...');
    
    if (procIntervalRef.current) clearInterval(procIntervalRef.current);
    procIntervalRef.current = setInterval(() => {
      setProcTimer((prev) => prev + 1);
    }, 1000);

    connectJobSocket(jobId);
  };

  const updateProcUI = (pct: number, stage: string) => {
    setProcProgress(pct);
    setProcStage(stage.replace(/_/g, ' ').toUpperCase() + '...');
  };

  const closeProc = useCallback(() => {
    setIsProcessing(false);
    if (procIntervalRef.current) clearInterval(procIntervalRef.current);
    if (jobWsRef.current) jobWsRef.current.close();
    clearFile();
  }, []);

  const finishProc = useCallback((jobId: string) => {
    updateProcUI(100, 'SUCCESS');
    setTimeout(() => {
      closeProc();
      loadJobs();
      loadJobData(jobId);
    }, 1000);
  }, [closeProc]);

  const pollJob = useCallback(async (jobId: string) => {
    try {
      const data = await getJobStatus(jobId);
      updateProcUI(data.progress, data.stage);
      if (data.status === 'completed') finishProc(jobId);
      else if (data.status === 'failed') {
        alert('Job failed');
        closeProc();
      } else {
        setTimeout(() => pollJob(jobId), 3000);
      }
    } catch {}
  }, [finishProc, closeProc]);

  const connectJobSocket = (jobId: string) => {
    if (jobWsRef.current) jobWsRef.current.close();
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    jobWsRef.current = new WebSocket(`${proto}//${window.location.host}/ws/${jobId}`);
    
    jobWsRef.current.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'progress') {
        updateProcUI(msg.progress, msg.stage);
      } else if (msg.type === 'completed' || msg.status === 'completed') {
        finishProc(jobId);
      } else if (msg.type === 'error') {
        alert(`Analysis Error: ${msg.error}`);
        closeProc();
      }
    };
    
    jobWsRef.current.onerror = () => {
      setProcStage('WEBSOCKET FAILURE // FALLING BACK TO POLLING...');
      pollJob(jobId);
    };
  };

  const loadJobData = async (jobId: string) => {
    setCurrentJobId(jobId);
    setJobData(null); // to show loading if we want
    
    try {
      const result = await getJobResult(jobId);
      setJobData(result);
      
      initDensityChart((result as any).frame_results || []);
      initAnomalyChart((result as any).fusion_insights || []);
      
      const newAlerts = (result.surveillance_events || [])
        .filter((e: any) => e.severity === 'critical' || e.severity === 'high')
        .slice()
        .reverse();

      setAlertsFeed(newAlerts.slice(0, 20));
      
      if (user) {
        import('../lib/supabaseDb').then(({ updateVideoUpload }) => {
          updateVideoUpload(user.id, jobId, {
            status: 'completed',
            analysis_results: result,
          }).catch(console.warn);
        });
      }

      loadJobs();
    } catch (err) {
      console.warn('Load Job Data Error:', err);
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
          borderColor: '#00e5a0',
          backgroundColor: 'rgba(0, 229, 160, 0.05)',
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
      await fetch(`${API_URL}/api/live/stop`, { method: 'DELETE' }).catch(console.warn);
      stopLive();
    } else {
      const res = await fetch(`${API_URL}/api/live/start?source=${encodeURIComponent(streamSrc)}`, { method: 'POST' }).catch(() => null);
      if (res && res.ok) startLive();
      else alert('Failed to synchronize with live stream processor.');
    }
  };

  const startLive = () => {
    setIsLive(true);
    connectLiveSocket();
  };

  const stopLive = () => {
    setIsLive(false);
    if (liveWsRef.current) liveWsRef.current.close();
  };

  const connectLiveSocket = () => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    liveWsRef.current = new WebSocket(`${proto}//${window.location.host}/ws/live`);
    liveWsRef.current.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'frame') {
        if (msg.frame_b64) setLiveCanvasSrc(`data:image/jpeg;base64,${msg.frame_b64}`);
        setLivePersons(msg.persons || 0);
        setLiveAction(msg.action || 'IDLE');
        if (msg.alerts && msg.alerts.length > 0) {
          msg.alerts.forEach((a: any) => pushAlert(a, msg.ts));
        }
      } else if (msg.type === 'live_stopped') {
        stopLive();
      }
    };
  };

  const handleDownloadReport = () => {
    if (currentJobId) window.open(getReportUrl(currentJobId), '_blank');
  };

  const handleDownloadVideo = () => {
    if (currentJobId) window.open(getVideoUrl(currentJobId), '_blank');
  };

  // Safe checks for rendering
  const r = jobData;
  const uniqueTracksCount = r ? (r.unique_track_ids || []).length : 0;
  const eventsCount = r ? (r.surveillance_events || []).length : 0;
  const speechCount = r ? (r.speech_segments || []).filter((v: any) => !v.is_noise).length : 0;
  const risk = r?.risk_level || 'STABLE';
  const riskClass = risk === 'CRITICAL' ? 'text-rose-500' : risk === 'HIGH' ? 'text-orange-400' : 'text-emerald-400';

  return (
    <>
      <DashboardStyles />
      <div className="min-h-screen flex flex-col font-[Inter] bg-[#05070a] text-[#e6edf3] overflow-x-hidden pt-12">
        {/* Top Navigation */}
        <header className="h-14 glass sticky top-0 z-50 flex items-center px-6 gap-4 border-b border-[#21262d]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg brand-bg-gradient flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-slate-900" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight">
              Detectra<span className="text-emerald-400">AI</span> 
              <span className="text-xs font-medium text-slate-500 ml-1">v4.1 Pro</span>
            </h1>
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10">
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-700'}`}></span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${apiOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                {apiOnline ? 'API ONLINE' : 'API OFFLINE'}
              </span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 uppercase">
              <Cpu className="w-3.5 h-3.5 text-emerald-500" />
              <span>{backendStatus}</span>
            </div>
            <div className="text-xs font-mono text-slate-500 mr-2">{serverTime}</div>
            
            {/* Header Navigation Actions */}
            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <button onClick={loadJobs} className="p-2 rounded-lg hover:bg-white/20 transition-colors text-slate-400 hover:text-white" title="Refresh Dashboard">
                <RotateCw className="w-4 h-4" />
              </button>
              <Link to="/profile" className="p-2 rounded-lg hover:bg-white/20 transition-colors text-slate-400 hover:text-white" title="User Profile">
                <User className="w-4 h-4" />
              </Link>
              <button 
                onClick={async () => { await signOut(); navigate('/'); }} 
                className="p-2 rounded-lg hover:bg-rose-500/10 transition-colors text-slate-400 hover:text-rose-400" 
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

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
                <label className="group relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/10 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer">
                  <input type="file" className="hidden" accept="video/*" onChange={handleFileSelect} />
                  <Film className="w-8 h-8 text-slate-600 group-hover:text-emerald-400 mb-2 transition-colors" />
                  <span className="text-xs font-medium text-slate-300">Drop video or browse</span>
                  <span className="text-[10px] text-slate-500 mt-1">MP4, AVI, MOV up to 500MB</span>
                </label>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
                    <Video className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs truncate flex-1 font-medium">{selectedFile.name}</span>
                    <button onClick={clearFile} className="p-1 text-slate-500 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button 
                    onClick={startUpload}
                    disabled={isUploading}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg brand-bg-gradient text-slate-900 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
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
                  className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500/50 outline-none text-slate-300" 
                />
                <button 
                  onClick={toggleLive}
                  className={`px-4 py-2 rounded-lg border font-bold text-xs hover:bg-opacity-20 transition-all flex items-center gap-1.5 ${
                    isLive 
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20' 
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
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
              <div className="flex-1 flex flex-col gap-2 p-5 pt-0 overflow-y-auto custom-scroll">
                {!jobs.length ? (
                  <div className="text-center py-10 opacity-30">
                    <Database className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-xs font-mono">Archive Empty</p>
                  </div>
                ) : (
                  jobs.map(j => (
                    <div 
                      key={j.job_id} 
                      onClick={() => loadJobData(j.job_id)}
                      className={`p-3 bg-white/5 backdrop-blur-md border rounded-xl cursor-pointer hover:border-emerald-500/40 transition-all group ${
                        j.job_id === currentJobId ? 'ring-1 ring-emerald-500 border-emerald-500' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold text-slate-500 truncate group-hover:text-slate-300 transition-colors">
                          {j.video_name}
                        </span>
                        <span className="text-[8px] font-mono text-slate-600 truncate max-w-[60px]">{j.job_id}</span>
                      </div>
                      <div className="flex items-center gap-2 border-white/10">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                          j.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          j.status === 'failed' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                          {j.status}
                        </span>
                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full brand-bg-gradient" style={{ width: `${j.status === 'completed' ? 100 : j.progress}%` }}></div>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">{j.processing_s ?? 0}s</span>
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
              
              {/* Live Preview Stage */}
              <div className={`animate-in zoom-in-95 duration-300 ${!isLive ? 'hidden' : ''}`}>
                <div className="relative rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-md overflow-hidden shadow-2xl">
                  <div className="scanline"></div>
                  {liveCanvasSrc && <img src={liveCanvasSrc} className="w-full h-auto min-h-[300px] object-contain" alt="SURVEILLANCE FEED" />}
                  <div className="absolute top-4 left-4 flex gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-600/90 rounded-md shadow-lg animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                      <span className="text-[10px] font-black uppercase text-white tracking-widest">LIVE FEED</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-md border border-white/10">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-mono font-bold">{livePersons.toString().padStart(2, '0')}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div className="space-y-1">
                      <div className="px-2 py-0.5 bg-emerald-500 text-black inline-block text-[10px] font-black uppercase rounded">{liveAction}</div>
                      <div className="text-[10px] font-mono text-white/70 drop-shadow-md">CAM_01 // MULTIMODAL_FUSION_ACTIVE</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metric Dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                <div className="p-4 glass rounded-2xl flex flex-col items-center justify-center text-center group cursor-default hover:border-emerald-500/30 transition-all">
                  <span className="text-3xl font-black brand-gradient mono">{uniqueTracksCount.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Unique Tracks</span>
                </div>
                <div className="p-4 glass rounded-2xl flex flex-col items-center justify-center text-center group cursor-default hover:border-red-500/30 transition-all">
                  <span className="text-3xl font-black text-rose-500 mono">{eventsCount.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Surv Events</span>
                </div>
                <div className="p-4 glass rounded-2xl flex flex-col items-center justify-center text-center group cursor-default hover:border-orange-500/30 transition-all">
                  <span className={`text-lg font-black uppercase tracking-tighter ${riskClass}`}>{risk}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Risk Index</span>
                </div>
                <div className="p-4 glass rounded-2xl flex flex-col items-center justify-center text-center group cursor-default hover:border-blue-500/30 transition-all">
                  <span className="text-3xl font-black text-blue-400 mono">{speechCount.toString().padStart(2, '0')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Audio Cues</span>
                </div>
                <div className="p-4 glass rounded-2xl flex flex-col items-center justify-center text-center group cursor-default hover:border-emerald-500/30 transition-all col-span-2 md:col-span-1">
                  <span className="text-xs font-bold text-emerald-400">{r ? 'COMPLETED' : '—'}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">System State</span>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 glass rounded-2xl space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Track Density
                  </h4>
                  <div className="h-48 relative w-full">
                    <canvas id="density-chart"></canvas>
                  </div>
                </div>
                <div className="p-6 glass rounded-2xl space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Brain className="w-3.5 h-3.5" /> Anomaly Fusion Scoring
                  </h4>
                  <div className="h-48 relative w-full">
                    <canvas id="anomaly-chart"></canvas>
                  </div>
                </div>
              </div>

              {/* Event Ledger */}
              <div className="glass rounded-2xl overflow-hidden border border-[#21262d]">
                <div className="px-6 py-4 flex items-center justify-between border-b border-[#21262d]">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Security Occurrence Ledger</h4>
                  <span className="px-2 py-0.5 bg-white/10 text-slate-300 text-[10px] rounded-full font-mono">{eventsCount} ENTRIES</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-separate border-spacing-0">
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
                          <tr key={idx} className="hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4 font-mono text-emerald-400 font-bold">{fmtTime(e.timestamp_s)}</td>
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
                <div className="flex gap-3">
                  <button onClick={handleDownloadReport} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-slate-700 text-slate-200 border border-white/20 font-bold transition-all">
                    <FileText className="w-4 h-4" /> EXPORT REPORT
                  </button>
                  <button onClick={handleDownloadVideo} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-xl shadow-emerald-500/20">
                    <Download className="w-4 h-4" /> RETRIEVE FOOTAGE
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Right Sidebar: Live Alerts Feed */}
          <aside className="w-72 border-l border-[#21262d] flex flex-col bg-transparent/40">
            <div className="p-5 border-b border-[#21262d] bg-white/5 backdrop-blur-md flex items-center justify-between">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Intel Log
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll">
              {alertsFeed.length === 0 ? (
                <div className="text-center py-20 opacity-20">
                  <Bell className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Listening for insights</p>
                </div>
              ) : (
                alertsFeed.map((e) => (
                  <div key={e.id} className={`p-4 rounded-2xl border ${e.isCrit ? 'bg-rose-500/5 border-rose-500/20' : 'bg-orange-500/5 border-orange-500/20'} animate-in slide-in-from-right-5 duration-300`}>
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

      {/* PROCESSOR OVERLAY */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 sm:p-20 bg-transparent/90 backdrop-blur-2xl">
          <div className="max-w-md w-full glass p-8 rounded-3xl border-2 border-emerald-500/30 text-center space-y-6 shadow-2xl">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-2xl border-4 border-emerald-500/10"></div>
              <div className="absolute inset-0 rounded-2xl border-t-4 border-emerald-500 animate-spin"></div>
              <div className="absolute inset-4 rounded-xl brand-bg-gradient opacity-20 animate-pulse"></div>
              <Cpu className="absolute inset-0 m-auto w-8 h-8 text-emerald-400" />
            </div>
            
            <div>
              <h2 className="text-2xl font-black tracking-tight font-[Inter] text-white">PROCESSING EVIDENCE</h2>
              <p className="text-slate-500 font-mono text-[10px] uppercase mt-1 tracking-widest">{procStage}</p>
            </div>
            
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div className="h-full brand-bg-gradient transition-all duration-700" style={{ width: `${Math.round(procProgress)}%` }}></div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
               <span>{Math.round(procProgress).toString().padStart(2, '0')}% COMPLETED</span>
               <span>ELAPSED: {procTimer}s</span>
            </div>

            <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 text-[10px] text-slate-400 text-left leading-relaxed mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-bold text-white uppercase tracking-wider">Analysis Info</span>
              </div>
              YOLOv8 Small Seg + Pose + ByteTrack + Whisper Fusion Engine. CPU-Optimized Inference enabled.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
