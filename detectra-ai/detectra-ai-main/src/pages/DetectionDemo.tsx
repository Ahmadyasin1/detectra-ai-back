import { motion } from 'framer-motion';
import {
  LayoutDashboard, Eye, Users, Brain, Volume2, Mic,
  Shield, Zap, CheckCircle, ArrowRight, Cpu, BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DetectraVideoShowcase from '../components/DetectraVideoShowcase';
import DetectraLiveAnalysis from '../components/DetectraLiveAnalysis';
import PageHero, { HeroButtonSecondary } from '../components/PageHero';

// ── Model cards data ──────────────────────────────────────────────────────────

const MODELS = [
  {
    icon:    Eye,
    title:   'Object & Person Detection',
    model:   'YOLOv8s-seg + ByteTrack',
    desc:    'Detects 80+ COCO object classes with segmentation masks. ByteTrack assigns persistent IDs across every frame.',
    metric:  '80+ classes',
    color:   'from-cyan-500 to-blue-600',
    border:  'border-cyan-500/20 hover:border-cyan-500/45',
    badge:   'text-cyan-400 bg-cyan-500/10',
  },
  {
    icon:    Brain,
    title:   'Action Recognition',
    model:   'VideoMAE + Pose Estimation',
    desc:    'YOLOv8n-pose extracts 17-keypoint skeletons. ActionBuffer classifies running, fighting, loitering, and falls.',
    metric:  '101 actions',
    color:   'from-indigo-500 to-purple-600',
    border:  'border-indigo-500/20 hover:border-indigo-500/45',
    badge:   'text-indigo-400 bg-indigo-500/10',
  },
  {
    icon:    Mic,
    title:   'Speech-to-Text',
    model:   'Whisper-small',
    desc:    'Transcribes all spoken dialogue with precise timestamps and automatic language detection — 99 languages supported.',
    metric:  '99 languages',
    color:   'from-green-500 to-emerald-600',
    border:  'border-green-500/20 hover:border-green-500/45',
    badge:   'text-green-400 bg-green-500/10',
  },
  {
    icon:    Volume2,
    title:   'Environmental Audio',
    model:   'YAMNet / AudioSet',
    desc:    'Classifies 521 environmental sound categories — gunshots, alarms, glass breaking — with per-second anomaly scores.',
    metric:  '521 categories',
    color:   'from-yellow-500 to-orange-500',
    border:  'border-yellow-500/20 hover:border-yellow-500/45',
    badge:   'text-yellow-400 bg-yellow-500/10',
  },
  {
    icon:    Users,
    title:   'Person Tracking',
    model:   'ByteTrack',
    desc:    'Assigns persistent person IDs that survive occlusion and re-entry, enabling accurate count and trajectory analytics.',
    metric:  'ID persistence',
    color:   'from-blue-500 to-indigo-600',
    border:  'border-blue-500/20 hover:border-blue-500/45',
    badge:   'text-blue-400 bg-blue-500/10',
  },
  {
    icon:    Shield,
    title:   'Cross-Modal Fusion',
    model:   'Custom Transformer',
    desc:    'An 8-head cross-attention transformer jointly processes visual and audio streams to produce severity-tagged events.',
    metric:  '8-head attention',
    color:   'from-rose-500 to-red-600',
    border:  'border-rose-500/20 hover:border-rose-500/45',
    badge:   'text-rose-400 bg-rose-500/10',
  },
];

// ── Demo stats ────────────────────────────────────────────────────────────────

const DEMO_STATS = [
  { icon: Cpu,      value: '6',      label: 'AI Models',       color: 'text-cyan-400'   },
  { icon: Zap,      value: 'Real',   label: 'Live API',        color: 'text-green-400'  },
  { icon: BarChart3, value: '100%',  label: 'Interactive',     color: 'text-purple-400' },
  { icon: CheckCircle, value: 'PDF', label: 'Export Ready',    color: 'text-blue-400'   },
];

// ── Main export ───────────────────────────────────────────────────────────────

export default function DetectionDemo() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-transparent">

      <PageHero
        backTo={{ href: '/', label: 'Home' }}
        badge="Live demo — powered by real AI models"
        title="See Detectra AI"
        titleAccent="in action"
        description="Upload a video below to trigger the full v5 multimodal pipeline — then explore the interactive report with detections, transcripts, and fusion insights."
        stats={DEMO_STATS}
        actions={
          user ? (
            <HeroButtonSecondary to="/analyze" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Open analyzer
            </HeroButtonSecondary>
          ) : undefined
        }
      >
        {/* Model cards */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {MODELS.map((m, i) => (
                <motion.div
                  key={m.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 * i, duration: 0.45 }}
                  className={`group relative bg-white/5 backdrop-blur-md rounded-xl p-5 border ${m.border} transition-all duration-200 hover:-translate-y-0.5`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 bg-gradient-to-br ${m.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <m.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-white font-semibold text-sm leading-tight">{m.title}</h3>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badge}`}>
                          {m.metric}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed mb-2">{m.desc}</p>
                      <p className="text-gray-400 text-[10px] font-mono">{m.model}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
        </motion.div>
      </PageHero>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mx-8" />

      {/* ── Video showcase (simulated walkthrough) ── */}
      <div className="py-2">
        <DetectraVideoShowcase />
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mx-8" />

      {/* ── Live analysis section ── */}
      <section className="py-10 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/25 rounded-full text-green-400 text-sm font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live Analysis — Upload Your Own Video
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Analyse your footage with{' '}
              <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                real AI models
              </span>
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Connect to a running <code className="px-1.5 py-0.5 bg-white/10 text-gray-300 rounded text-sm">api_server.py</code> instance
              and upload any video to see all 6 models run live.
            </p>
          </motion.div>
        </div>
        <DetectraLiveAnalysis />
      </section>

      {/* ── Footer CTA ── */}
      <section className="py-20 bg-gradient-to-b from-gray-950 via-gray-900/50 to-gray-950 border-t border-white/10/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
          >
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-cyan-500/20">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">
              Ready to analyse{' '}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                your footage?
              </span>
            </h2>
            <p className="text-gray-400 text-base mb-8 max-w-lg mx-auto">
              {user
                ? 'Open the Analyzer to upload a video and get a full multimodal intelligence report in minutes.'
                : 'Create a free account and get your first video analysis — no credit card required.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link to="/analyze">
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Open Analyzer
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </motion.div>
                </Link>
              ) : (
                <Link to="/signup">
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="group inline-flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
                  >
                    Get Started Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </motion.div>
                </Link>
              )}
              <Link to="/fyp-project">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-transparent border border-white/20 text-gray-400 rounded-xl font-semibold hover:border-gray-600 hover:text-white transition-all"
                >
                  View Full Project
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
