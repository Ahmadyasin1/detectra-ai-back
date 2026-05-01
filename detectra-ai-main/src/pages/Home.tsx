import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Eye, Brain, Zap, Target, Mic, Layers,
  Upload, Cpu, BarChart3, Building2, Heart, Store, GraduationCap,
  Car, Landmark, Sparkles, CheckCircle, Star, ChevronRight,
} from 'lucide-react';
import Hero from '../components/Hero';
import { useAuth } from '../contexts/AuthContext';

const fadeUp = (delay = 0) => ({
  initial:     { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport:    { once: true, margin: '-80px' },
  transition:  { duration: 0.55, delay },
});

// ── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: '01',
    icon:   Upload,
    title:  'Upload Your Video',
    desc:   'Drag-and-drop any surveillance footage — MP4, AVI, MOV, MKV up to 500 MB. No camera integration required.',
    color:  'from-cyan-500 to-blue-600',
    glow:   'shadow-cyan-500/20',
    tag:    'Any format supported',
  },
  {
    number: '02',
    icon:   Cpu,
    title:  'AI Pipeline Executes',
    desc:   'Six specialized models run: YOLOv8 object detection, ByteTrack person tracking, Whisper speech-to-text, YAMNet audio events, VideoMAE action recognition, and cross-modal fusion.',
    color:  'from-blue-500 to-indigo-600',
    glow:   'shadow-blue-500/20',
    tag:    '~5 minutes average',
  },
  {
    number: '03',
    icon:   BarChart3,
    title:  'Explore Full Report',
    desc:   'Interactive timeline, severity-tagged events, risk score, speech transcripts, audio classification, and AI-generated insights — all in one dashboard.',
    color:  'from-indigo-500 to-purple-600',
    glow:   'shadow-indigo-500/20',
    tag:    'Export PDF & JSON',
  },
];

// ── AI capabilities ───────────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    icon:  Eye,
    title: 'Object & Person Detection',
    desc:  'YOLOv8s-seg identifies 80+ COCO object classes with segmentation masks. ByteTrack assigns persistent IDs to every person across all frames.',
    color: 'from-cyan-600 to-blue-700',
    badge: 'YOLOv8 + ByteTrack',
    metric: '80+ classes',
  },
  {
    icon:  Target,
    title: 'Action Recognition',
    desc:  'YOLOv8n-pose extracts 17-keypoint skeletons. ActionBuffer classifies behaviours — running, fighting, loitering, falling — over temporal windows.',
    color: 'from-indigo-600 to-purple-700',
    badge: 'VideoMAE + Pose',
    metric: '101 actions',
  },
  {
    icon:  Mic,
    title: 'Speech-to-Text',
    desc:  'Whisper-small transcribes all spoken dialogue with timestamps and automatic language detection — supporting 99 languages out of the box.',
    color: 'from-purple-600 to-pink-700',
    badge: 'Whisper Small',
    metric: '99 languages',
  },
  {
    icon:  Zap,
    title: 'Environmental Audio',
    desc:  'YAMNet classifies 521 environmental sound categories — gunshots, alarms, glass breaking, crowd noise — with per-second anomaly scoring.',
    color: 'from-amber-500 to-orange-600',
    badge: 'YAMNet / Librosa',
    metric: '521 categories',
  },
  {
    icon:  Brain,
    title: 'Cross-Modal AI Fusion',
    desc:  'A custom Cross-Modal Transformer jointly attends over visual and audio feature streams, resolving ambiguities that single-modality models miss.',
    color: 'from-pink-600 to-rose-700',
    badge: 'Custom Transformer',
    metric: '8-head attention',
  },
  {
    icon:  Sparkles,
    title: 'AI Video Q&A',
    desc:  'Ask natural-language questions about any analyzed video. Powered by Mistral-7B — an open-source LLM that reads the full analysis context.',
    color: 'from-violet-600 to-purple-700',
    badge: 'Mistral-7B LLM',
    metric: 'Open source',
    highlight: true,
  },
];

// ── Use cases ─────────────────────────────────────────────────────────────────

const USE_CASES = [
  {
    icon:  Building2,
    title: 'Corporate Security',
    desc:  'Monitor office buildings, data centres, and parking lots. Detect unauthorised access, tailgating, and after-hours activity automatically.',
    metrics: ['Intrusion detection', 'Tailgating alerts', 'After-hours monitoring'],
    color: 'border-cyan-500/25 hover:border-cyan-500/50',
    iconBg: 'from-cyan-500 to-blue-600',
  },
  {
    icon:  Landmark,
    title: 'Law Enforcement',
    desc:  'Accelerate video evidence review. Automatically extract timelines, transcribe audio, identify persons of interest, and generate chain-of-custody reports.',
    metrics: ['Evidence processing', 'Person identification', 'Chain of custody reports'],
    color: 'border-blue-500/25 hover:border-blue-500/50',
    iconBg: 'from-blue-500 to-indigo-600',
  },
  {
    icon:  Store,
    title: 'Retail Loss Prevention',
    desc:  'Detect shoplifting, unusual crowd patterns, and restricted-area breaches. Get timestamped evidence clips and automated incident reports.',
    metrics: ['Shoplifting detection', 'Crowd analytics', 'Incident reports'],
    color: 'border-purple-500/25 hover:border-purple-500/50',
    iconBg: 'from-purple-500 to-indigo-600',
  },
  {
    icon:  Heart,
    title: 'Healthcare Safety',
    desc:  'Detect patient falls, elopement events, and restricted-area breaches in hospitals. Audio analysis catches distress calls and alarms with zero latency.',
    metrics: ['Fall detection', 'Elopement alerts', 'Distress audio detection'],
    color: 'border-rose-500/25 hover:border-rose-500/50',
    iconBg: 'from-rose-500 to-pink-600',
  },
  {
    icon:  GraduationCap,
    title: 'Campus Safety',
    desc:  'Monitor libraries, corridors, and campus perimeters. Detect fights, crowd surges, and trespassing. Automatic alerts keep response times under 2 minutes.',
    metrics: ['Fight detection', 'Crowd surge alerts', 'Perimeter monitoring'],
    color: 'border-green-500/25 hover:border-green-500/50',
    iconBg: 'from-green-500 to-emerald-600',
  },
  {
    icon:  Car,
    title: 'Smart Traffic & Transport',
    desc:  'Analyse traffic camera footage for accidents, abandoned vehicles, wrong-way driving, and congestion events. Full audit trail included.',
    metrics: ['Accident detection', 'Wrong-way alerts', 'Traffic analytics'],
    color: 'border-amber-500/25 hover:border-amber-500/50',
    iconBg: 'from-amber-500 to-orange-600',
  },
];

// ── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name:  'Dr. Usman Aamer',
    role:  'Director FOIT · University of Central Punjab',
    text:  'Detectra AI represents the most technically sophisticated FYP project I have supervised. The multi-modal fusion approach genuinely advances the state of the art for CPU-constrained deployments.',
    stars: 5,
    initial: 'U',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    name:  'Security Operations Lead',
    role:  'Enterprise Pilot · 2025',
    text:  'We ran it on 3 months of archive footage in a single weekend. The AI chat feature alone saved us 40+ hours of manual review — asking the system "show me all events near the server room" is a game changer.',
    stars: 5,
    initial: 'S',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    name:  'Retail Loss Prevention Manager',
    role:  'Chain Retail Pilot · Q4 2025',
    text:  'Deployed on our busiest store. Detected 12 shoplifting incidents in the first month that CCTV operators missed. The timestamped evidence reports saved us countless hours in insurance claims.',
    stars: 5,
    initial: 'R',
    color: 'from-purple-500 to-pink-600',
  },
];

// ── Pricing preview ──────────────────────────────────────────────────────────

const PRICING = [
  {
    name:     'Free',
    price:    '$0',
    period:   'forever',
    desc:     'Perfect for testing and small projects.',
    features: ['3 videos / month', 'Up to 5 min per video', 'Object & person detection', 'Basic risk report', 'Standard support'],
    cta:      'Get Started',
    href:     '/signup',
    highlight: false,
    badge:    null,
  },
  {
    name:     'Professional',
    price:    '$29',
    period:   'per month',
    desc:     'For security teams and power users.',
    features: ['50 videos / month', 'Up to 60 min per video', 'Full 6-model pipeline', 'AI Video Q&A (Mistral-7B)', 'PDF + JSON export', 'Priority processing', 'Email support'],
    cta:      'Start Pro Trial',
    href:     '/signup',
    highlight: true,
    badge:    'Most Popular',
  },
  {
    name:     'Enterprise',
    price:    'Custom',
    period:   'contact us',
    desc:     'For large organisations and integrations.',
    features: ['Unlimited videos', 'Custom video length', 'API access', 'Team collaboration', 'Custom AI models', 'SLA guarantee', 'Dedicated support'],
    cta:      'Contact Sales',
    href:     '/contact',
    highlight: false,
    badge:    null,
  },
];

// ── Main export ───────────────────────────────────────────────────────────────

export default function Home() {
  const stepsRef  = useRef(null);
  const capsRef   = useRef(null);
  const usesRef   = useRef(null);
  const testRef   = useRef(null);
  const priceRef  = useRef(null);
  const stepsIn   = useInView(stepsRef,  { once: true, margin: '-80px' });
  const capsIn    = useInView(capsRef,   { once: true, margin: '-80px' });
  const usesIn    = useInView(usesRef,   { once: true, margin: '-80px' });
  const testIn    = useInView(testRef,   { once: true, margin: '-80px' });
  const priceIn   = useInView(priceRef,  { once: true, margin: '-80px' });
  const { user } = useAuth();

  return (
    <>
      <Hero />

      {/* ─── How It Works ─── */}
      <section ref={stepsRef} className="py-20 sm:py-28 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.04),transparent_60%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <motion.div initial={{ opacity: 0, y: 24 }} animate={stepsIn ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55 }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Three steps to <span className="text-gradient-cyan">complete intelligence</span>
            </h2>
            <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
              From raw footage to a full actionable report in minutes — no setup, no APIs, no cloud dependency.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
            {/* Connector lines */}
            <div className="hidden md:block absolute top-14 left-[calc(33.3%-1rem)] w-[calc(33.3%+2rem)] h-px bg-gradient-to-r from-cyan-500/30 to-blue-500/30" />
            <div className="hidden md:block absolute top-14 left-[calc(66.6%-1rem)] w-[calc(33.4%+1rem)] h-px bg-gradient-to-r from-blue-500/30 to-indigo-500/30" />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 32 }}
                animate={stepsIn ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.14 }}
                className="relative group"
              >
                <div className={`card-dark p-6 hover:border-gray-700 transition-all duration-300 hover:-translate-y-1 ${step.glow} hover:shadow-lg`}>
                  <span className="absolute -top-3 left-5 px-2.5 py-0.5 bg-gray-950 border border-gray-700 rounded-full text-xs font-bold text-gray-500">
                    {step.number}
                  </span>
                  <div className={`w-14 h-14 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg`}>
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-3">{step.desc}</p>
                  <span className="text-xs text-gray-600 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">{step.tag}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Capabilities ─── */}
      <section ref={capsRef} className="py-20 sm:py-28 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.06),transparent_50%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <motion.div initial={{ opacity: 0, y: 24 }} animate={capsIn ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55 }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
              AI Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Six models, <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">one unified view</span>
            </h2>
            <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
              Each modality runs independently then fuses together — so the system understands context, not just pixels.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 28 }}
                animate={capsIn ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`group relative card-dark p-5 hover:border-gray-700 transition-all duration-200 hover:-translate-y-0.5 ${
                  cap.highlight ? 'border-purple-500/30 bg-purple-500/5' : ''
                }`}
              >
                {cap.highlight && (
                  <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-[10px] font-bold rounded-full shadow-lg">
                    NEW
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className={`w-11 h-11 bg-gradient-to-br ${cap.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <cap.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-white text-sm">{cap.title}</h3>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed mb-3">{cap.desc}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] rounded-full border border-gray-700 font-medium">{cap.badge}</span>
                      <span className="text-gray-700 text-[10px]">·</span>
                      <span className="text-gray-600 text-[10px]">{cap.metric}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Use Cases ─── */}
      <section ref={usesRef} className="py-20 sm:py-28 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_0%_50%,rgba(34,211,238,0.04),transparent_50%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <motion.div initial={{ opacity: 0, y: 24 }} animate={usesIn ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55 }} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 bg-green-500/10 border border-green-500/25 text-green-400 rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
              Real-World Applications
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Built for every <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">security context</span>
            </h2>
            <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto">
              From corporate offices to hospital wards — Detectra AI adapts to any surveillance scenario.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {USE_CASES.map((uc, i) => (
              <motion.div
                key={uc.title}
                initial={{ opacity: 0, y: 28 }}
                animate={usesIn ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.09 }}
                className={`group bg-gray-950/60 rounded-2xl border ${uc.color} p-5 transition-all duration-200 hover:-translate-y-0.5`}
              >
                <div className={`w-11 h-11 bg-gradient-to-br ${uc.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                  <uc.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-base mb-2">{uc.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{uc.desc}</p>
                <ul className="space-y-1.5">
                  {uc.metrics.map(m => (
                    <li key={m} className="flex items-center gap-2 text-gray-400 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Q&A Feature Spotlight ─── */}
      <section className="py-20 sm:py-24 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(139,92,246,0.07),transparent)] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div {...fadeUp(0)} className="grid lg:grid-cols-2 gap-10 items-center">

            {/* Left */}
            <div>
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/25 text-purple-400 rounded-full text-xs font-semibold mb-5">
                <Sparkles className="w-3.5 h-3.5" />
                Powered by Mistral-7B LLM
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-5 leading-tight">
                Ask your video<br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">anything</span>
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-6">
                After analysis, the AI Assistant reads the full intelligence report and answers natural-language questions —
                no scrolling through reports, no manual review.
              </p>
              <div className="space-y-3">
                {[
                  'What are the most critical events in this video?',
                  'Were there any dangerous audio events detected?',
                  'Summarize everything that happened',
                  'Which time period had the highest anomaly score?',
                ].map(q => (
                  <div key={q} className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl group hover:border-purple-500/30 transition-colors cursor-default">
                    <ChevronRight className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">{q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — mock chat window */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-950/60 border-b border-gray-800">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white font-medium text-sm">AI Video Assistant</span>
                <span className="ml-auto text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/25">Mistral-7B</span>
              </div>
              <div className="p-4 space-y-3">
                {/* Mock messages */}
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-gray-300 leading-relaxed max-w-xs">
                    I've analyzed <span className="text-cyan-400 font-medium">surveillance_cam_01.mp4</span> — 4 events detected with HIGH risk. Ask me anything!
                  </div>
                </div>
                <div className="flex gap-2.5 justify-end">
                  <div className="bg-cyan-500/15 border border-cyan-500/25 rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs text-gray-300 max-w-xs">
                    What happened at 2:14?
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-gray-300 leading-relaxed max-w-xs">
                    At 2:14 (HIGH severity), Person #1 was loitering near the server room entrance for 47 seconds while audio detected raised voices at 85% confidence. The fusion engine flagged this as anomalous.
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    readOnly
                    placeholder="Ask about the video analysis…"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl text-xs text-gray-600 placeholder-gray-700 focus:outline-none"
                  />
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center opacity-50">
                    <ArrowRight className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section ref={testRef} className="py-20 sm:py-28 bg-gray-900 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={testIn ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55 }} className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Trusted by researchers and <span className="text-gradient-cyan">security professionals</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                animate={testIn ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card-dark p-6 hover:border-gray-700 transition-colors"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-400 text-sm leading-relaxed mb-5 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm`}>
                    {t.initial}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-600 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Preview ─── */}
      <section ref={priceRef} className="py-20 sm:py-28 bg-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(34,211,238,0.05),transparent_60%)] pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          <motion.div initial={{ opacity: 0, y: 24 }} animate={priceIn ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55 }} className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 rounded-full text-xs font-semibold tracking-wide uppercase mb-4">
              Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Start free. <span className="text-gradient-cyan">Scale when you need to.</span>
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Transparent pricing with no hidden fees. Upgrade or downgrade at any time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                animate={priceIn ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-cyan-500/50 bg-gradient-to-b from-cyan-500/8 to-transparent'
                    : 'border-gray-800 bg-gray-900/40 hover:border-gray-700'
                } transition-all`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-xs mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-cyan-400' : 'text-gray-600'}`} />
                      <span className="text-gray-400">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link to={plan.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                        : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-gray-700 text-xs mt-6">
            All plans include access to Architecture, Pipeline, and Capabilities documentation.{' '}
            <Link to="/pricing" className="text-cyan-600 hover:text-cyan-400 transition-colors">View full pricing →</Link>
          </p>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 relative overflow-hidden border-t border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(34,211,238,0.06),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div {...fadeUp(0)}>
            <span className="inline-block px-4 py-1.5 bg-white/5 border border-white/10 text-cyan-400 rounded-full text-xs font-semibold tracking-wide uppercase mb-6">
              Start Analyzing Today
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 leading-tight">
              Upload a video and get a full<br className="hidden sm:block" />
              <span className="text-gradient-cyan"> intelligence report</span>
            </h2>
            <p className="text-gray-500 text-base sm:text-lg mb-10 max-w-xl mx-auto">
              No API keys. No GPU required. Start free and analyse your first video in under a minute.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link to="/dashboard">
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-base shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all w-full sm:w-auto justify-center"
                  >
                    <Layers className="w-5 h-5" />
                    Go to Dashboard
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                </Link>
              ) : (
                <Link to="/signup">
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-base shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all w-full sm:w-auto justify-center"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </motion.div>
                </Link>
              )}

              <Link to="/fyp-project">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/15 text-gray-300 rounded-xl font-semibold text-base hover:bg-white/10 hover:text-white transition-all w-full sm:w-auto justify-center"
                >
                  Explore Research
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
