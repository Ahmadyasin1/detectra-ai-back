import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Brain,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Eye,
  Mic,
  FileText,
  Film,
  Layers,
  Lock,
  Zap,
  BarChart3,
  Users,
} from 'lucide-react';
import Hero from '../components/Hero';
import { HeroButtonPrimary, HeroButtonSecondary } from '../components/PageHero';
import { useAuth } from '../contexts/AuthContext';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, delay },
});

const METRICS = [
  { value: '6+', label: 'Fused AI models', icon: Layers },
  { value: '250+', label: 'Brand references', icon: Eye },
  { value: '99', label: 'Speech languages', icon: Mic },
  { value: '<10 min', label: 'Typical review time', icon: Zap },
];

const STEPS = [
  {
    step: '01',
    title: 'Ingest footage',
    desc: 'Upload MP4/MOV from CCTV, body-cam, or archive. Optional Supabase storage keeps your library organized.',
  },
  {
    step: '02',
    title: 'Multimodal analysis',
    desc: 'Vision, audio, speech, and fusion run in one pipeline — tracks, events, transcripts, and risk scores aligned on a timeline.',
  },
  {
    step: '03',
    title: 'Defensible outputs',
    desc: 'Export labeled video, premium HTML report, and RAG JSON for audits, briefings, and downstream automation.',
  },
];

const CAPABILITIES = [
  { icon: Eye, title: 'Object & person intelligence', desc: 'Detection, segmentation, and persistent tracking with confidence at every frame.' },
  { icon: Brain, title: 'Scene & action context', desc: 'Activity understanding, anomaly scoring, and severity-ranked surveillance events.' },
  { icon: Mic, title: 'Multilingual speech', desc: 'Whisper-powered transcription with per-segment language detection and noise filtering.' },
  { icon: ShieldCheck, title: 'Cross-modal fusion', desc: 'Correlate visual and audio evidence so alerts are explainable, not black-box.' },
  { icon: FileText, title: 'Premium reports', desc: 'Stakeholder-ready HTML with timelines, key findings, and exportable evidence chains.' },
  { icon: Lock, title: 'Privacy-first design', desc: 'Your uploads stay scoped to your account. No facial recognition in the core pipeline.' },
];

const DELIVERABLES = [
  { icon: Film, title: 'Labeled video', desc: 'Bounding boxes, tracks, and on-screen context for rapid review.' },
  { icon: FileText, title: 'Investigation report', desc: 'Executive summary, severity breakdown, and event narrative.' },
  { icon: BarChart3, title: 'RAG JSON', desc: 'Structured output for chat assistants, ticketing, and SIEM workflows.' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <motion.div className="bg-black text-white">
      <Hero />

      {/* Trust metrics strip */}
      <section className="relative border-y border-white/10 bg-gradient-to-b from-cyan-950/20 to-black">
        <div className="page-shell py-10 sm:py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {METRICS.map(({ value, label, icon: Icon }, i) => (
              <motion.div
                key={label}
                {...fadeUp(i * 0.06)}
                className="elite-card flex flex-col items-center text-center p-5 sm:p-6"
              >
                <Icon className="h-5 w-5 text-cyan-400 mb-3" aria-hidden />
                <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">{value}</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Positioning statement */}
      <section className="section-y">
        <div className="page-shell-narrow text-center">
          <motion.p {...fadeUp(0)} className="elite-label mb-4">
            Built for operators who need proof
          </motion.p>
          <motion.h2
            {...fadeUp(0.06)}
            className="text-[clamp(1.5rem,4.5vw,2.75rem)] font-extrabold leading-snug tracking-tight text-white"
          >
            Surveillance intelligence that stands up in{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              briefings, audits, and court-adjacent reviews
            </span>
          </motion.h2>
          <motion.p {...fadeUp(0.12)} className="mt-5 text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Detectra AI is a multimodal analysis platform — not a generic chat wrapper. Every alert ties back to
            timestamps, modalities, and confidence you can inspect.
          </motion.p>
        </div>
      </section>

      {/* How it works */}
      <section className="section-y border-t border-white/5 bg-white/[0.02]">
        <motion.div className="page-shell">
          <div className="text-center mb-12 sm:mb-16">
            <p className="elite-label mb-3">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">From raw footage to defensible intelligence</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {STEPS.map((item, idx) => (
              <motion.div
                key={item.step}
                {...fadeUp(idx * 0.08)}
                className="elite-card relative p-6 sm:p-8"
              >
                <span className="text-4xl font-black text-cyan-500/20 absolute top-4 right-6">{item.step}</span>
                <p className="text-cyan-400 font-mono text-sm font-bold mb-3">{item.step}</p>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp(0.2)} className="mt-10 flex justify-center">
            <HeroButtonPrimary to={user ? '/analyze' : undefined} onClick={user ? undefined : () => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signup' } }))}>
              Try the analyzer <ArrowRight className="h-4 w-4" />
            </HeroButtonPrimary>
          </motion.div>
        </motion.div>
      </section>

      {/* Capabilities grid */}
      <section className="section-y">
        <motion.div className="page-shell">
          <motion.div {...fadeUp(0)} className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 sm:mb-14">
            <div>
              <p className="elite-label mb-3">Platform capabilities</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white max-w-xl">
                One pipeline. Every modality. One timeline.
              </h2>
            </div>
            <Link to="/capabilities" className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors shrink-0">
              Full capability spec <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {CAPABILITIES.map((cap, idx) => (
              <motion.div key={cap.title} {...fadeUp(idx * 0.05)} className="elite-card p-5 sm:p-6 group hover:border-cyan-500/25 transition-colors">
                <cap.icon className="h-6 w-6 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-white mb-2">{cap.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{cap.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Deliverables */}
      <section className="section-y border-t border-white/5">
        <motion.div className="page-shell">
          <motion.div {...fadeUp(0)} className="text-center mb-10 sm:mb-12">
            <p className="elite-label mb-3">What you receive</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Artifacts your team can trust</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DELIVERABLES.map((d, idx) => (
              <motion.div key={d.title} {...fadeUp(idx * 0.07)} className="elite-card p-6 text-center sm:text-left">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mb-4">
                  <d.icon className="h-6 w-6 text-cyan-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{d.title}</h3>
                <p className="text-sm text-gray-400">{d.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Trust pillars */}
      <section className="section-y bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent">
        <motion.div className="page-shell">
          <motion.div {...fadeUp(0)} className="elite-card p-6 md:p-10">
            <motion.div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="max-w-xl">
                <p className="elite-label mb-3">Why teams choose Detectra</p>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Professional grade. Operator friendly. Evidence first.
                </h2>
                <p className="text-gray-400 mt-3 text-sm sm:text-base leading-relaxed">
                  Reduce investigation time, standardize shift handoffs, and give leadership reports they can defend.
                </p>
              </div>
              <Link to="/business-case" className="inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 shrink-0">
                View business case <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, title: 'Reliable triage', desc: 'Severity-ranked events with timestamps and track context.' },
                { icon: Brain, title: 'Explainable AI', desc: 'Confidence scores, fusion corroboration, and event traces.' },
                { icon: Sparkles, title: 'Premium exports', desc: 'Labeled video, HTML report, and JSON in one job.' },
              ].map((item, idx) => (
                <motion.div key={item.title} {...fadeUp(0.05 * idx)} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <item.icon className="h-5 w-5 text-cyan-400 mb-2" />
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Social proof / FYP */}
      <section className="py-12 border-t border-white/10">
        <motion.div {...fadeUp(0)} className="page-shell flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <motion.div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-cyan-400/80 shrink-0" />
            <div>
              <p className="text-white font-semibold text-sm">University of Central Punjab · BSAI FYP</p>
              <p className="text-gray-500 text-xs mt-0.5">Research-grade pipeline · Production-minded UX</p>
            </div>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-2">
            {['Multimodal fusion', 'Open models', 'Self-hostable', 'Vercel + GPU ready'].map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-400">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="section-y relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-cyan-900/15 via-transparent to-transparent pointer-events-none" />
        <motion.div {...fadeUp(0)} className="page-shell-narrow relative z-10 text-center flex flex-col items-center">
          <p className="elite-label mb-4">Get started</p>
          <h2 className="text-[clamp(1.5rem,5vw,2.75rem)] font-extrabold tracking-tight mb-4 sm:mb-6">
            One video. Proof in minutes.
          </h2>
          <p className="text-gray-400 text-base sm:text-lg mb-8 max-w-xl">
            Upload a clip, run the full v5 stack, and walk away with intelligence your team can stand behind.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {user ? (
              <HeroButtonPrimary to="/analyze" className="w-full sm:w-auto">
                Open analyzer <ArrowRight className="h-4 w-4" />
              </HeroButtonPrimary>
            ) : (
              <HeroButtonPrimary onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signup' } }))} className="w-full sm:w-auto">
                Start free <ArrowRight className="h-4 w-4" />
              </HeroButtonPrimary>
            )}
            <HeroButtonSecondary to="/demo" className="w-full sm:w-auto">
              Watch live demo
            </HeroButtonSecondary>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-3xl">
            {[
              'Multimodal evidence on one timeline',
              'Labeled video + report + JSON exports',
              'Confidence scoring for human review',
            ].map((point) => (
              <div key={point} className="flex items-start gap-2 rounded-xl border border-white/10 bg-black/40 p-3 text-left">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-300 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </motion.div>
  );
}
