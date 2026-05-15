import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  CheckCircle, Clock, BookOpen, Eye, Brain, Volume2, Layers,
  LayoutDashboard, FlaskConical, Rocket, TrendingUp,
} from 'lucide-react';
import PageHero from '../components/PageHero';

interface Phase {
  phase:        string;
  period:       string;
  status:       'completed' | 'in_progress' | 'planned';
  progress:     number;
  icon:         React.FC<{ className?: string }>;
  color:        string;
  deliverables: string[];
  achievement?: string;
}

const PHASES: Phase[] = [
  {
    phase:    'Requirements & Literature Review',
    period:   'Aug – Sep 2025',
    status:   'completed',
    progress: 100,
    icon:     BookOpen,
    color:    'from-blue-500 to-cyan-500',
    deliverables: ['SRS Document', 'Research Survey (15+ papers)', 'Technology Stack Decision', 'Dataset Identification'],
    achievement: 'Identified 6-modality pipeline architecture',
  },
  {
    phase:    'Object Detection & Tracking Module',
    period:   'Oct – Nov 2025',
    status:   'completed',
    progress: 100,
    icon:     Eye,
    color:    'from-cyan-500 to-blue-600',
    deliverables: ['YOLOv8s-seg integration', 'ByteTrack multi-object tracking', 'Pose estimation (17-keypoint)', 'Frame extraction pipeline'],
    achievement: '80+ COCO classes, persistent person IDs',
  },
  {
    phase:    'Audio Analysis Pipeline',
    period:   'Nov – Dec 2025',
    status:   'completed',
    progress: 100,
    icon:     Volume2,
    color:    'from-green-500 to-emerald-600',
    deliverables: ['Whisper-small STT integration', 'YAMNet audio classifier (521 classes)', 'Librosa MFCC feature extraction', 'Language detection'],
    achievement: 'Real-time speech + environmental audio fusion',
  },
  {
    phase:    'Action Recognition Module',
    period:   'Dec 2025 – Jan 2026',
    status:   'completed',
    progress: 100,
    icon:     Brain,
    color:    'from-purple-500 to-indigo-600',
    deliverables: ['VideoMAE fine-tuned on UCF-101', 'ActionBuffer sliding window', 'Behaviour classification (fight, fall, loiter…)', 'Pose-action correlation'],
    achievement: 'Temporal activity classification over sliding windows',
  },
  {
    phase:    'Cross-Modal Fusion Engine',
    period:   'Jan – Feb 2026',
    status:   'completed',
    progress: 100,
    icon:     Layers,
    color:    'from-pink-500 to-rose-600',
    deliverables: ['Cross-Modal Transformer (8-head attention)', 'Visual ↔ Audio alignment scoring', 'Anomaly score per second', 'Threat severity classification (LOW→CRITICAL)'],
    achievement: 'Unified multimodal intelligence report generation',
  },
  {
    phase:    'Web Dashboard & API',
    period:   'Feb – Mar 2026',
    status:   'completed',
    progress: 100,
    icon:     LayoutDashboard,
    color:    'from-orange-500 to-amber-500',
    deliverables: ['React + TypeScript frontend', 'FastAPI backend with WebSocket progress', 'Interactive SVG event timeline', 'PDF / JSON report export'],
    achievement: 'Real-time pipeline progress via WebSocket',
  },
  {
    phase:    'Testing, Integration & Demo',
    period:   'Mar – Apr 2026',
    status:   'in_progress',
    progress: 80,
    icon:     FlaskConical,
    color:    'from-yellow-500 to-orange-500',
    deliverables: ['End-to-end pipeline validation', 'Performance benchmarking on CPU', 'User acceptance testing', 'Live demo deployment'],
    achievement: 'Processing 1-min video in ~8–12 min on CPU',
  },
  {
    phase:    'Final Submission & Viva',
    period:   'May – Jul 2026',
    status:   'planned',
    progress: 0,
    icon:     Rocket,
    color:    'from-slate-500 to-slate-600',
    deliverables: ['Final project report', 'Research paper submission', 'Viva preparation', 'Open-source release'],
  },
];

const METRICS = [
  { label: 'AI Models Integrated',      value: '6',     sub: 'YOLOv8, Whisper, YAMNet, VideoMAE, ByteTrack, Fusion Transformer' },
  { label: 'Object Classes Detected',   value: '80+',   sub: 'COCO-80 + pose keypoints' },
  { label: 'Audio Event Categories',    value: '521',   sub: 'via YAMNet / AudioSet' },
  { label: 'Phases Completed',          value: '6 / 8', sub: 'as of April 2026' },
];

const statusIcon = (status: Phase['status']) => {
  if (status === 'completed')   return <CheckCircle className="w-5 h-5 text-green-400" />;
  if (status === 'in_progress') return <div className="w-5 h-5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />;
  return <Clock className="w-5 h-5 text-gray-600" />;
};

const statusBadge = (status: Phase['status']) => {
  if (status === 'completed')   return <span className="badge-green">Completed</span>;
  if (status === 'in_progress') return <span className="badge-cyan flex items-center gap-1"><span className="status-dot-active" />In Progress</span>;
  return <span className="badge-gray">Planned</span>;
};

export default function Timeline() {
  const metricsRef = useRef(null);
  const metricsIn  = useInView(metricsRef, { once: true, margin: '-80px' });

  return (
    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Project Timeline · Aug 2025 – Jul 2026"
        badgeIcon={TrendingUp}
        title="Development"
        titleAccent="Progress"
        description="12-month structured delivery plan for Detectra AI — from research to production-ready multimodal video intelligence platform."
      />

      {/* Metrics strip */}
      <section ref={metricsRef} className="py-10 bg-white/5 backdrop-blur-md border-y border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {METRICS.map(({ label, value, sub }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                animate={metricsIn ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-extrabold text-gradient-cyan">{value}</p>
                <p className="text-white font-semibold text-sm mt-1">{label}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-tight">{sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Phase timeline */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="relative">
            {/* Vertical connector */}
            <div className="absolute left-7 top-8 bottom-8 w-px bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-gray-800 hidden sm:block" />

            <div className="space-y-6">
              {PHASES.map((phase, i) => (
                <motion.div
                  key={phase.phase}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className={`relative pl-0 sm:pl-20 ${phase.status === 'planned' ? 'opacity-60' : ''}`}
                >
                  {/* Timeline node */}
                  <div className="hidden sm:flex absolute left-0 top-5 w-14 h-14 items-center justify-center">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center shadow-lg z-10 relative`}>
                      <phase.icon className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Card */}
                  <div className={`card-glass p-5 transition-all duration-300 ${
                    phase.status === 'completed'   ? 'border-green-500/20 hover:border-green-500/40' :
                    phase.status === 'in_progress' ? 'border-cyan-500/30 glow-cyan'                 :
                    'border-white/10'
                  }`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div className="flex items-start gap-3">
                        {/* Mobile icon */}
                        <div className={`sm:hidden w-9 h-9 rounded-xl bg-gradient-to-br ${phase.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <phase.icon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-base sm:text-lg">{phase.phase}</h3>
                          <p className="text-gray-500 text-sm mt-0.5">{phase.period}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {statusBadge(phase.status)}
                        {statusIcon(phase.status)}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {phase.status !== 'planned' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                          <span>Progress</span>
                          <span className={phase.status === 'completed' ? 'text-green-400' : 'text-cyan-400'}>
                            {phase.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${phase.progress}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
                            className={`h-1.5 rounded-full bg-gradient-to-r ${
                              phase.status === 'completed' ? 'from-green-500 to-emerald-400' : 'from-cyan-500 to-blue-500'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Deliverables */}
                    <div className="flex flex-wrap gap-2">
                      {phase.deliverables.map(d => (
                        <span key={d} className={`px-2.5 py-1 rounded-lg text-xs border ${
                          phase.status === 'completed'   ? 'bg-green-500/8 text-green-400/80 border-green-500/20' :
                          phase.status === 'in_progress' ? 'bg-cyan-500/8 text-cyan-400/80 border-cyan-500/20'   :
                          'bg-white/10 text-gray-500 border-white/20'
                        }`}>
                          {phase.status === 'completed' && <span className="mr-1">✓</span>}
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Achievement */}
                    {phase.achievement && phase.status !== 'planned' && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 border-t border-white/10 pt-3">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
                        <span>{phase.achievement}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
