import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Shield, Play, CheckCircle, Zap, Brain,
  Eye, Mic, Volume2, Target, Layers, ChevronDown,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Neural-network particle mesh ──────────────────────────────────────────────

function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();

    type Pt = { x: number; y: number; vx: number; vy: number; r: number };
    const N = 60;
    const pts: Pt[] = Array.from({ length: N }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r:  Math.random() * 1.6 + 0.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(34,211,238,${0.06 * (1 - d / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34,211,238,0.5)';
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none opacity-35" />;
}

// ── Live scanning overlay on the mock preview ─────────────────────────────────

function ScanOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Corners */}
      {(['top-2 left-2 border-t-2 border-l-2', 'top-2 right-2 border-t-2 border-r-2',
         'bottom-2 left-2 border-b-2 border-l-2', 'bottom-2 right-2 border-b-2 border-r-2'] as const
      ).map((cls, i) => (
        <div key={i} className={`absolute w-5 h-5 border-cyan-400/80 ${cls}`} />
      ))}
      {/* Scan line */}
      <motion.div
        animate={{ y: ['0%', '100%', '0%'] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg,transparent,rgba(34,211,238,0.7),transparent)' }}
      />
    </div>
  );
}

// ── Bounding box annotation ───────────────────────────────────────────────────

function BBox({ x, y, w, h, label, id, color, delay }: {
  x: string; y: string; w: string; h: string;
  label: string; id: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35 }}
      className="absolute"
      style={{ left: x, top: y, width: w, height: h }}
    >
      <div className="relative w-full h-full border rounded-sm" style={{ borderColor: color, borderWidth: 1.5 }}>
        <div
          className="absolute -top-5 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-white text-[9px] font-mono font-semibold"
          style={{ backgroundColor: color + 'dd' }}
        >
          <span>{id}</span>
          <span className="opacity-70">|</span>
          <span>{label}</span>
        </div>
        <motion.div
          animate={{ opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.5, repeat: Infinity, delay }}
          className="absolute inset-0 rounded-sm"
          style={{ backgroundColor: color + '12' }}
        />
      </div>
    </motion.div>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const step = to / 40;
    const t = setInterval(() => {
      start = Math.min(start + step, to);
      setVal(Math.round(start));
      if (start >= to) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [to]);

  return <span ref={ref}>{val}{suffix}</span>;
}

// ── Pipeline model badges (auto-scrolling strip) ──────────────────────────────

const MODELS = [
  { label: 'YOLOv8s-seg',        color: 'text-cyan-400',    bg: 'bg-cyan-500/10'    },
  { label: 'ByteTrack',           color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  { label: 'Whisper-small',       color: 'text-green-400',   bg: 'bg-green-500/10'   },
  { label: 'YAMNet',              color: 'text-yellow-400',  bg: 'bg-yellow-500/10'  },
  { label: 'VideoMAE',            color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  { label: 'Fusion Transformer',  color: 'text-pink-400',    bg: 'bg-pink-500/10'    },
  { label: 'Mistral-7B LLM',      color: 'text-indigo-400',  bg: 'bg-indigo-500/10'  },
];

function ModelStrip() {
  const doubled = [...MODELS, ...MODELS];
  return (
    <div className="relative overflow-hidden mask-gradient-x">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="flex gap-2 w-max"
      >
        {doubled.map((m, i) => (
          <span
            key={i}
            className={`flex-shrink-0 px-3 py-1 ${m.bg} ${m.color} text-xs rounded-full border border-current/20 font-medium`}
          >
            {m.label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const STATS = [
  { icon: Brain,  value: 6,    suffix: '',     label: 'AI Models',       sub: 'in one pipeline' },
  { icon: Zap,    value: 5,    suffix: 'min',  label: 'Avg Processing',  sub: 'per video' },
  { icon: Eye,    value: 80,   suffix: '+',    label: 'Object Classes',  sub: 'COCO detection' },
  { icon: Volume2, value: 521, suffix: '',     label: 'Audio Events',    sub: 'YAMNet classes' },
];

// ── Main export ───────────────────────────────────────────────────────────────

export default function Hero() {
  const { user } = useAuth();
  const { scrollY } = useScroll();
  const opacity   = useTransform(scrollY, [0, 300], [1, 0]);
  const translateY = useTransform(scrollY, [0, 300], [0, -40]);

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden bg-gray-950">

      {/* ── Layered backgrounds ── */}
      <NeuralCanvas />
      {/* Primary radial glow — top center */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 55% at 50% -5%, rgba(34,211,238,0.09) 0%, transparent 70%)' }} />
      {/* Secondary glow — bottom right */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 45% at 85% 90%, rgba(99,102,241,0.07) 0%, transparent 70%)' }} />
      {/* Subtle grid */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
        backgroundSize: '56px 56px',
      }} />
      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, transparent, #030712)' }} />

      {/* ── Content ── */}
      <motion.div
        style={{ opacity, y: translateY }}
        className="relative z-10 flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 sm:pt-32"
      >
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 xl:gap-16 items-center">

          {/* ── Left column ── */}
          <div className="max-w-xl">

            {/* FYP badge */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-2.5 mb-6"
            >
              <span className="flex items-center gap-2 px-3.5 py-1.5 bg-cyan-500/10 border border-cyan-500/25 rounded-full text-cyan-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                AI-Powered Video Intelligence · FYP 2025–26
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="text-5xl sm:text-6xl lg:text-[4rem] xl:text-[4.5rem] font-extrabold text-white leading-[1.04] tracking-tight mb-5"
            >
              Every threat.{' '}
              <br className="hidden sm:block" />
              Every{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                  moment.
                </span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 1.0 }}
                  className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500 origin-left rounded-full"
                />
              </span>
              <br />
              Detected.
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="text-gray-400 text-lg sm:text-xl leading-relaxed mb-7"
            >
              Upload any surveillance video. Detectra AI runs{' '}
              <span className="text-white font-medium">6 specialized models</span> in parallel — object
              detection, person tracking, speech transcription, audio intelligence, action recognition,
              and cross-modal fusion — then delivers a{' '}
              <span className="text-white font-medium">complete intelligence report</span> in minutes.
            </motion.p>

            {/* Proof points */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col gap-2 mb-8"
            >
              {[
                'No GPU required — fully CPU-optimised inference',
                'Full multimodal report including PDF & JSON export',
                'AI Video Q&A powered by Mistral-7B open-source LLM',
              ].map(t => (
                <div key={t} className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-gray-400 text-sm">{t}</span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 mb-8"
            >
              <Link to={user ? '/dashboard' : '/signup'}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="group inline-flex items-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-sm shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all"
                >
                  <Play className="w-4 h-4" />
                  {user ? 'Analyse a Video' : 'Start for Free'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.div>
              </Link>

              <Link to="/demo">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white/5 border border-white/12 text-gray-300 rounded-xl font-semibold text-sm hover:bg-white/8 hover:border-white/22 hover:text-white transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Watch Live Demo
                </motion.div>
              </Link>
            </motion.div>

            {/* Scrolling model strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              <p className="text-gray-700 text-xs mb-2 font-medium uppercase tracking-widest">Powered by</p>
              <ModelStrip />
            </motion.div>
          </div>

          {/* ── Right column — product preview ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.25 }}
            className="relative hidden lg:block"
          >
            {/* Ambient glow */}
            <div className="absolute -inset-4 bg-gradient-to-br from-cyan-500/10 via-blue-600/8 to-purple-600/10 rounded-3xl blur-3xl" />

            {/* Main card */}
            <div className="relative rounded-2xl border border-gray-700/70 bg-gray-900 overflow-hidden shadow-2xl shadow-black/50">

              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-950/90 border-b border-gray-800/80">
                <div className="flex gap-1.5">
                  {['#ff5f57', '#febc2e', '#28c840'].map(c => (
                    <div key={c} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <span className="flex-1 text-center text-gray-600 text-xs font-mono">
                  detectra-ai · surveillance_cam_lobby.mp4
                </span>
                <span className="flex items-center gap-1 text-cyan-400 text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Analyzing
                </span>
              </div>

              {/* Video frame */}
              <div className="relative aspect-video bg-gray-950 overflow-hidden">
                {/* Simulated scene background */}
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, #111827 0%, #0c1220 50%, #0a0f1e 100%)' }}>
                  {/* CRT scanlines */}
                  <div className="absolute inset-0 opacity-[0.06]" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 3px)',
                  }} />
                  {/* Subtle scene elements */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20"
                    style={{ background: 'linear-gradient(to top, rgba(34,211,238,0.1), transparent)' }} />
                </div>

                {/* Bounding boxes */}
                <BBox x="14%" y="18%" w="13%" h="46%" label="97%" id="#P01" color="#22d3ee" delay={0.5} />
                <BBox x="42%" y="22%" w="15%" h="42%" label="94%" id="#P02" color="#22d3ee" delay={0.7} />
                <BBox x="68%" y="35%" w="11%" h="26%" label="89%" id="Bag"  color="#f59e0b" delay={0.9} />

                {/* Pose skeleton hint */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.35 }}
                  transition={{ delay: 1.1 }}
                  className="absolute"
                  style={{ left: '16%', top: '28%', width: '8%', height: '30%' }}
                >
                  <svg viewBox="0 0 30 80" className="w-full h-full" stroke="#a78bfa" fill="none" strokeWidth="1.5">
                    <circle cx="15" cy="6" r="5" />
                    <line x1="15" y1="11" x2="15" y2="38" />
                    <line x1="15" y1="18" x2="5" y2="28" />
                    <line x1="15" y1="18" x2="25" y2="28" />
                    <line x1="15" y1="38" x2="8" y2="60" />
                    <line x1="15" y1="38" x2="22" y2="60" />
                  </svg>
                </motion.div>

                <ScanOverlay />

                {/* HUD overlay */}
                <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-sm text-cyan-400 text-[10px] font-mono px-2 py-1 rounded border border-cyan-500/20">
                  CH-1 · 00:04:37 · 8 FPS · 1080p
                </div>
                <div className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-sm text-gray-400 text-[10px] font-mono px-2 py-1 rounded">
                  Frame 2219 / 4800
                </div>

                {/* Risk badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-bold shadow-lg"
                  style={{ background: 'rgba(239,68,68,0.85)', backdropFilter: 'blur(4px)' }}
                >
                  <Shield className="w-3 h-3" />
                  HIGH RISK · 76/100
                </motion.div>

                {/* Speech bubble */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="absolute bottom-3 right-3 max-w-[45%] bg-black/70 backdrop-blur-sm border border-green-500/30 rounded-lg px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Mic className="w-2.5 h-2.5 text-green-400" />
                    <span className="text-green-400 text-[9px] font-semibold">Whisper · 00:04:35</span>
                  </div>
                  <p className="text-gray-300 text-[9px] leading-snug">"…stop right there, don't move…"</p>
                </motion.div>
              </div>

              {/* Analysis results panel */}
              <div className="p-4 space-y-2.5 bg-gray-900">
                <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider mb-3">
                  Pipeline Output — 6 Models
                </p>
                {[
                  { label: 'Object & Person Detection', val: '2 persons tracked · Bag detected',  color: '#22d3ee', pct: 94 },
                  { label: 'Action Recognition',         val: 'Confrontation · 87%',              color: '#a78bfa', pct: 87 },
                  { label: 'Speech-to-Text',             val: '"Stop right there…" · EN',         color: '#34d399', pct: 91 },
                  { label: 'Audio Events',               val: 'Raised voices · Alarm · 82%',      color: '#fbbf24', pct: 82 },
                  { label: 'Fusion Confidence',          val: 'CRITICAL anomaly detected',        color: '#f97316', pct: 76 },
                ].map(({ label, val, color, pct }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-gray-600 text-[10px] w-40 flex-shrink-0 truncate">{label}</span>
                    <div className="flex-1 bg-gray-800 rounded-full h-1 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.3, delay: 0.9, ease: 'easeOut' }}
                        className="h-1 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <span className="text-gray-500 text-[10px] w-36 text-right flex-shrink-0 truncate">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating card — bottom left */}
            <motion.div
              initial={{ opacity: 0, x: -16, y: 16 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1.5, type: 'spring', stiffness: 120 }}
              className="absolute -bottom-6 -left-7 bg-gray-900 border border-gray-700 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Report Ready</p>
                <p className="text-gray-500 text-xs">Processed in 4m 38s</p>
              </div>
            </motion.div>

            {/* Floating card — top right */}
            <motion.div
              initial={{ opacity: 0, x: 16, y: -16 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1.7, type: 'spring', stiffness: 120 }}
              className="absolute -top-6 -right-7 bg-gray-900 border border-cyan-500/30 rounded-2xl px-4 py-3 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3.5 h-3.5 text-red-400" />
                <p className="text-red-400 font-bold text-sm">4 Events Detected</p>
              </div>
              <p className="text-gray-500 text-xs">1 Critical · 2 High · 1 Medium</p>
            </motion.div>

            {/* Floating card — middle right */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.9, type: 'spring', stiffness: 100 }}
              className="absolute top-1/2 -right-14 -translate-y-1/2 bg-gray-900 border border-purple-500/25 rounded-xl px-3 py-2.5 shadow-xl"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Layers className="w-3 h-3 text-purple-400" />
                <span className="text-purple-400 text-[11px] font-semibold">Fusion Score</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-white font-extrabold text-2xl leading-none">76</span>
                <span className="text-gray-500 text-xs mb-0.5">/ 100</span>
              </div>
            </motion.div>
          </motion.div>

        </div>

        {/* ── Stats strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="mt-20 border-t border-gray-800/60 pt-10"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
            {STATS.map(({ icon: Icon, value, suffix, label, sub }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="group"
              >
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <span className="text-3xl font-extrabold text-white tabular-nums">
                    <Counter to={value} suffix={suffix} />
                  </span>
                </div>
                <p className="text-white text-sm font-semibold">{label}</p>
                <p className="text-gray-600 text-xs mt-0.5">{sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Scroll cue ── */}
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="flex flex-col items-center gap-2">
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </div>
      </motion.div>
    </section>
  );
}
