"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Eye, Mic, Layers, BarChart3, Shield, Zap,
  ArrowRight, Play, Github, Brain, Film, Volume2,
  AlertTriangle, Camera, Activity,
} from "lucide-react";

const FEATURES = [
  {
    icon: Eye,
    color: "from-indigo-500 to-violet-500",
    title: "Object Detection & Tracking",
    desc: "YOLOv8s-seg detects + segments 80 COCO classes per frame. ByteTrack assigns persistent IDs across frames for surveillance continuity.",
  },
  {
    icon: Activity,
    color: "from-emerald-500 to-teal-500",
    title: "Pose-Based Action Recognition",
    desc: "YOLOv8n-pose extracts 17 COCO keypoints → biomechanical analysis detects fighting, falling, running, loitering with temporal smoothing.",
  },
  {
    icon: Layers,
    color: "from-amber-500 to-orange-500",
    title: "Logo & OCR Recognition",
    desc: "EasyOCR detects and reads text, brand logos, and signs in every frame — enabling brand intelligence and license plate context.",
  },
  {
    icon: Mic,
    color: "from-blue-500 to-cyan-500",
    title: "Speech-to-Text",
    desc: "OpenAI Whisper delivers timestamped transcripts with word-level precision across 99 languages — auto-detected from audio.",
  },
  {
    icon: Volume2,
    color: "from-pink-500 to-rose-500",
    title: "Advanced Audio Classification",
    desc: "Librosa-powered classifier detects 7 event types including screams and gunshots using spectral fingerprinting at 50ms resolution.",
  },
  {
    icon: Brain,
    color: "from-violet-500 to-purple-600",
    title: "Cross-Modal Transformer Fusion",
    desc: "8-head cross-attention transformer aligns visual and audio streams into unified 1-second scene insights with anomaly scoring.",
  },
  {
    icon: AlertTriangle,
    color: "from-red-500 to-rose-600",
    title: "Surveillance Anomaly Detection",
    desc: "12 anomaly types: loitering, fighting, crowd surge, weapon proximity, gunshot, stampede — with per-event temporal deduplication.",
  },
  {
    icon: Camera,
    color: "from-slate-500 to-slate-600",
    title: "Live Stream Analysis",
    desc: "Real-time RTSP / webcam analysis with WebSocket frame streaming and instant alert push to the surveillance dashboard.",
  },
];

const STATS = [
  { value: "7",   label: "AI Modules" },
  { value: "12",  label: "Anomaly Types" },
  { value: "99",  label: "Languages (STT)" },
  { value: "0",   label: "External APIs" },
];

const ANOMALY_TYPES = [
  "Loitering",
  "Abandoned Object",
  "Tailgating",
  "Weapon Proximity",
  "Fighting",
  "Person Fallen",
  "Stampede",
  "Crowd Surge",
  "Person Vanished",
  "Scream Detected",
  "Gunshot Detected",
  "Loud Noise",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Detectra AI</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold">
              v4 SURVEILLANCE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-red-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-6">
              <Shield className="w-3.5 h-3.5" />
              100% API-Free · Privacy-First · Real-Time RTSP/Webcam · No Data Leaves Your Server
            </span>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white mb-6 leading-none">
              AI-Powered
              <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-red-400 bg-clip-text text-transparent">
                {" "}Surveillance
              </span>
              <br />Intelligence
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Detectra AI analyzes video and live streams across 7 AI modalities — detecting objects,
              actions, logos, speech, audio events, and 12 types of surveillance anomalies — all fused
              through a transformer-based cross-modal attention engine.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/register" className="btn-primary flex items-center gap-2 text-base px-6 py-3">
                Start Analyzing <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="https://github.com/UCP-FYP-F25AI009/detectra-ai"
                className="btn-ghost flex items-center gap-2 text-base border border-white/10 px-6 py-3 rounded-lg"
              >
                <Github className="w-4 h-4" /> View on GitHub
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 + 0.3 }}
            >
              <div className="text-4xl font-black text-white mb-1">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-white mb-4">Seven AI Modules. One Pipeline.</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Every module runs locally — no third-party API calls, no privacy compromise.
              Designed for production surveillance deployments on CPU hardware.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 + 0.2 }}
                className="card p-5 hover:border-white/20 transition-all duration-300 group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Surveillance Anomaly Types */}
      <section className="py-20 px-6 border-t border-white/5 bg-red-500/2">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3 flex items-center justify-center gap-3">
              <AlertTriangle className="w-7 h-7 text-red-400" />
              12 Surveillance Anomaly Types
            </h2>
            <p className="text-slate-400">
              Real-time detection with per-event temporal deduplication windows to eliminate false positives
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ANOMALY_TYPES.map((type, i) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 + 0.1 }}
                className="flex items-center gap-2.5 p-3 card border-red-500/10 bg-red-500/5 rounded-xl"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-slate-300 text-sm font-medium">{type}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Cross-Modal Transformer Fusion</h2>
          <p className="text-slate-400 mb-10">
            Visual and audio streams are projected into a shared 256-dimensional space,
            fused via 8-head cross-attention, then processed by temporal self-attention
            across 1-second bins to produce scene labels, anomaly scores, and alert triggers.
          </p>
          <div className="card p-8 text-left font-mono text-sm text-slate-300 overflow-x-auto">
            <pre className="whitespace-pre">{`Video / RTSP / Webcam
    │
    ├─ [YOLOv8s-seg + ByteTrack]  Detection + Tracking
    ├─ [YOLOv8n-pose + ActionBuf] Pose → Actions (temporal smoothing)
    ├─ [EasyOCR]                  Logo + Text Recognition
    ├─ [Whisper base]             Speech → Text (99 languages)
    └─ [Librosa]                  Audio: silence/speech/scream/gunshot
              │
    ┌─────── CrossModalTransformer ───────┐
    │   Visual(→256) ←→ Audio(→256)       │
    │   8-head cross-attention            │
    │   Temporal self-attention           │
    └──────────────────────────────────────┘
              │
    ┌─────────┴────────────┐
    ▼                      ▼
Scene Label           Anomaly Score
(11 classes)    + SurveillanceDetector
                  (12 anomaly types)
                       │
              Alerts + Timeline Report`}</pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-red-500/5 pointer-events-none" />
            <Shield className="w-10 h-10 text-brand-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">Ready to analyze your first video?</h2>
            <p className="text-slate-400 mb-8">
              Upload any MP4/AVI up to 500MB or connect a live RTSP/webcam stream.
              Full multimodal surveillance report in minutes.
            </p>
            <Link href="/register" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3">
              Create Free Account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-slate-600 text-sm">
        <p>Detectra AI — University of Central Punjab · BSAI · FYP Group F25AI009 · 2025-2026</p>
        <p className="mt-1">Built by Abdul Rehman · Eman Sarfraz · Ahmad Yasin · Advisor: Mr. Usman Aamer</p>
      </footer>
    </div>
  );
}
