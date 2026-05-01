import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  CheckCircle, X, ArrowRight, Zap, Shield, Building2,
  Sparkles, Brain, FileJson, Film, Download, Users, Cpu,
  HelpCircle, type LucideIcon,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlanFeature {
  text:      string;
  included:  boolean | 'partial';
  note?:     string;
}

interface Plan {
  name:      string;
  icon:      LucideIcon;
  iconColor: string;
  price:     { monthly: string; annual: string };
  saving?:   string;
  desc:      string;
  features:  PlanFeature[];
  cta:       string;
  href:      string;
  highlight: boolean;
  badge?:    string;
}

// ── Plan data ─────────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    name:      'Free',
    icon:      Zap,
    iconColor: 'from-gray-500 to-gray-600',
    price:     { monthly: '$0', annual: '$0' },
    desc:      'For individuals exploring video intelligence.',
    cta:       'Get Started Free',
    href:      '/signup',
    highlight: false,
    features: [
      { text: '3 videos per month',           included: true },
      { text: 'Up to 5 min per video',        included: true },
      { text: 'Object & person detection',    included: true },
      { text: 'Audio classification',         included: true },
      { text: 'Basic risk report',            included: true },
      { text: 'Download JSON results',        included: true },
      { text: 'Speech-to-text (Whisper)',     included: false },
      { text: 'Action recognition',           included: false },
      { text: 'Cross-modal AI fusion',        included: false },
      { text: 'AI Video Q&A (LLM)',           included: false },
      { text: 'PDF report export',            included: false },
      { text: 'API access',                   included: false },
      { text: 'Team workspaces',              included: false },
      { text: 'Priority processing',          included: false },
    ],
  },
  {
    name:      'Professional',
    icon:      Shield,
    iconColor: 'from-cyan-500 to-blue-600',
    price:     { monthly: '$29', annual: '$23' },
    saving:    'Save $72/yr',
    desc:      'For security teams, analysts, and power users.',
    cta:       'Start 14-Day Trial',
    href:      '/signup',
    highlight: true,
    badge:     'Most Popular',
    features: [
      { text: '50 videos per month',           included: true },
      { text: 'Up to 60 min per video',        included: true },
      { text: 'Object & person detection',     included: true },
      { text: 'Audio classification',          included: true },
      { text: 'Full risk report + severity',   included: true },
      { text: 'Download JSON results',         included: true },
      { text: 'Speech-to-text (Whisper)',      included: true },
      { text: 'Action recognition',            included: true },
      { text: 'Cross-modal AI fusion',         included: true },
      { text: 'AI Video Q&A (Mistral-7B)',     included: true },
      { text: 'PDF report export',             included: true },
      { text: 'API access',                    included: 'partial', note: '1,000 req/month' },
      { text: 'Team workspaces',               included: false },
      { text: 'Priority processing',           included: true },
    ],
  },
  {
    name:      'Enterprise',
    icon:      Building2,
    iconColor: 'from-indigo-500 to-purple-600',
    price:     { monthly: 'Custom', annual: 'Custom' },
    desc:      'For organisations with custom scale and compliance needs.',
    cta:       'Contact Sales',
    href:      '/contact',
    highlight: false,
    features: [
      { text: 'Unlimited videos',              included: true },
      { text: 'Unlimited video length',        included: true },
      { text: 'Object & person detection',     included: true },
      { text: 'Audio classification',          included: true },
      { text: 'Full risk report + severity',   included: true },
      { text: 'Download JSON results',         included: true },
      { text: 'Speech-to-text (Whisper)',      included: true },
      { text: 'Action recognition',            included: true },
      { text: 'Cross-modal AI fusion',         included: true },
      { text: 'AI Video Q&A (custom LLM)',     included: true },
      { text: 'PDF report export',             included: true },
      { text: 'API access (unlimited)',        included: true },
      { text: 'Team workspaces',               included: true },
      { text: 'Priority + dedicated compute',  included: true },
    ],
  },
];

// ── Feature comparison table data ────────────────────────────────────────────

const COMPARE_ROWS: { label: string; free: string; pro: string; ent: string; icon?: LucideIcon }[] = [
  { label: 'Videos per month',      free: '3',           pro: '50',          ent: 'Unlimited',  icon: Film },
  { label: 'Max video length',      free: '5 min',       pro: '60 min',      ent: 'Unlimited'              },
  { label: 'Processing queue',      free: 'Standard',    pro: 'Priority',    ent: 'Dedicated'              },
  { label: 'Object detection',      free: '✓',           pro: '✓',           ent: '✓',          icon: Cpu  },
  { label: 'Person tracking',       free: '✓',           pro: '✓',           ent: '✓'                      },
  { label: 'Speech-to-text',        free: '—',           pro: '✓',           ent: '✓',          icon: Brain },
  { label: 'Audio classification',  free: '✓',           pro: '✓',           ent: '✓'                      },
  { label: 'Action recognition',    free: '—',           pro: '✓',           ent: '✓'                      },
  { label: 'Cross-modal fusion',    free: '—',           pro: '✓',           ent: '✓'                      },
  { label: 'AI Video Q&A (LLM)',    free: '—',           pro: '✓',           ent: 'Custom model', icon: Sparkles },
  { label: 'JSON export',           free: '✓',           pro: '✓',           ent: '✓',          icon: FileJson },
  { label: 'PDF report',            free: '—',           pro: '✓',           ent: '✓',          icon: Download },
  { label: 'API access',            free: '—',           pro: '1K req/mo',   ent: 'Unlimited'              },
  { label: 'Team workspaces',       free: '—',           pro: '—',           ent: '✓',          icon: Users },
  { label: 'SLA guarantee',         free: '—',           pro: '—',           ent: '99.9% uptime'           },
  { label: 'Support',               free: 'Community',   pro: 'Email 48h',   ent: 'Dedicated'              },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Do I need a GPU to run Detectra AI?',
    a: 'No. Detectra AI is designed for CPU-only deployment. All models are quantised and optimised for efficient inference without NVIDIA hardware. This makes it deployable on any standard server or cloud VM.',
  },
  {
    q: 'What video formats are supported?',
    a: 'We support MP4, AVI, MOV, MKV, and WebM. Videos can be up to 500 MB per upload. Longer videos are automatically split into segments for parallel processing.',
  },
  {
    q: 'How does the AI Video Q&A work?',
    a: 'After analysis completes, the full intelligence report (events, persons, speech, audio, risk score) is fed as context to Mistral-7B — an open-source LLM hosted on HuggingFace. You can ask natural-language questions and get factual answers grounded in the actual video data.',
  },
  {
    q: 'Is my video data private?',
    a: 'Yes. Videos are processed on your own server instance and are not shared with any third party. The AI Q&A feature sends only the text analysis report (not video frames) to HuggingFace for LLM inference.',
  },
  {
    q: 'Can I self-host Detectra AI?',
    a: 'Yes. The full backend is open-source (FastAPI + Python) and can be deployed on your own infrastructure using Docker. Enterprise customers receive assisted deployment and custom model integration.',
  },
  {
    q: 'What is the typical processing time?',
    a: 'A 1-minute video takes approximately 4–6 minutes on a standard 4-core CPU server. A 10-minute video takes 20–30 minutes. Professional and Enterprise plans have priority queue access for faster turnaround.',
  },
];

// ── FAQ item component ────────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/10 transition-colors"
      >
        <span className="text-gray-200 font-medium text-sm">{q}</span>
        <HelpCircle className={`w-4 h-4 flex-shrink-0 transition-colors ${open ? 'text-cyan-400' : 'text-gray-600'}`} />
      </button>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-5 pb-4 text-gray-500 text-sm leading-relaxed border-t border-white/10 pt-3"
        >
          {a}
        </motion.div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-transparent pt-20">

      {/* ── Header ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.07),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-grid-dark opacity-30 pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-full text-xs font-semibold mb-5">
              <Zap className="w-3.5 h-3.5" />
              Simple, Transparent Pricing
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5">
              Analyse video at any <span className="text-gradient-cyan">scale</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
              Start free, upgrade when your team grows. All plans include full access to the 6-model AI pipeline — no hidden fees.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-1.5">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!annual ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${annual ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Annual
                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full border border-green-500/30">-20%</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Plans ── */}
      <section className="py-12 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.highlight
                    ? 'border-cyan-500/50 bg-gradient-to-b from-cyan-500/8 to-gray-900'
                    : 'border-white/10 bg-white/5 backdrop-blur-md hover:border-white/20'
                } transition-all`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className={`w-11 h-11 bg-gradient-to-br ${plan.iconColor} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                    <plan.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{plan.desc}</p>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-white">
                      {annual ? plan.price.annual : plan.price.monthly}
                    </span>
                    {plan.price.monthly !== 'Custom' && (
                      <span className="text-gray-500 text-sm">/month</span>
                    )}
                  </div>
                  {annual && plan.saving && (
                    <span className="text-green-400 text-xs font-semibold mt-1 block">{plan.saving}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className={`flex items-start gap-2.5 text-sm ${!f.included ? 'opacity-40' : ''}`}>
                      {f.included === true ? (
                        <CheckCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-cyan-400' : 'text-gray-500'}`} />
                      ) : f.included === 'partial' ? (
                        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-500" />
                      ) : (
                        <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-700" />
                      )}
                      <span className="text-gray-400">
                        {f.text}
                        {f.note && <span className="text-gray-600 text-xs ml-1">({f.note})</span>}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link to={plan.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                        : 'bg-white/10 border border-white/20 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="py-12 sm:py-16 bg-white/5 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Full feature comparison</h2>
            <p className="text-gray-500 text-sm">Everything included in each plan, in one view.</p>
          </motion.div>

          <div className="card-glass overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
              <div className="px-5 py-4 text-gray-500 text-xs font-semibold uppercase tracking-wider">Feature</div>
              {['Free', 'Pro', 'Enterprise'].map(n => (
                <div key={n} className={`px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider ${n === 'Pro' ? 'text-cyan-400' : 'text-gray-400'}`}>{n}</div>
              ))}
            </div>

            {COMPARE_ROWS.map(({ label, free, pro, ent, icon: Icon }, i) => {
              const renderCell = (val: string, isCyan = false) => (
                <div className={`px-5 py-3.5 text-center text-sm ${
                  val === '✓' ? isCyan ? 'text-cyan-400' : 'text-green-400'
                  : val === '—' ? 'text-gray-700'
                  : 'text-gray-300'
                }`}>
                  {val === '✓' ? <CheckCircle className="w-4 h-4 mx-auto" /> : val === '—' ? <X className="w-4 h-4 mx-auto text-gray-800" /> : val}
                </div>
              );
              return (
                <div key={label} className={`grid grid-cols-4 border-b border-white/10 last:border-0 ${i % 2 === 0 ? '' : 'bg-white/5 backdrop-blur-md'}`}>
                  <div className="px-5 py-3.5 flex items-center gap-2 text-gray-400 text-sm">
                    {Icon && <Icon className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />}
                    {label}
                  </div>
                  {renderCell(free)}
                  {renderCell(pro, true)}
                  {renderCell(ent)}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Trust signals ── */}
      <section className="py-12 sm:py-16 border-t border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Shield,   title: 'No GPU Required',     desc: 'CPU-optimised inference works on any standard server. No NVIDIA hardware needed.' },
              { icon: Brain,    title: 'Open-Source Models',  desc: 'Built on YOLOv8, Whisper, YAMNet, VideoMAE, and Mistral-7B — all open-source.' },
              { icon: Building2, title: 'Self-Hostable',      desc: 'Deploy the full stack on your own infrastructure. Enterprise customers get assisted deployment.' },
            ].map(({ icon: Icon, title, desc }) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex gap-4 p-5 card-glass"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{title}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-12 sm:py-20 bg-white/5 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Frequently asked questions</h2>
            <p className="text-gray-500 text-sm">Can't find what you're looking for? <Link to="/contact" className="text-cyan-400 hover:text-cyan-300 transition-colors">Contact us →</Link></p>
          </motion.div>

          <div className="space-y-3">
            {FAQ.map(item => (
              <FAQItem key={item.q} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Enterprise CTA ── */}
      <section className="py-16 sm:py-20 border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-14 h-14 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-indigo-500/25">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Need a custom solution?</h2>
            <p className="text-gray-400 text-base mb-8 max-w-lg mx-auto">
              We work with enterprise security teams, government agencies, and large retailers to deploy custom model configurations, private cloud deployments, and integration with existing CCTV infrastructure.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/contact">
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                >
                  Talk to Sales
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </Link>
              <Link to="/demo">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-8 py-3.5 bg-white/5 backdrop-blur-md border border-white/20 text-gray-300 rounded-xl font-semibold hover:bg-white/20 hover:text-white transition-all"
                >
                  View Live Demo
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
