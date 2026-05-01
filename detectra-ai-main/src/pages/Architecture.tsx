import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Layers, Cpu, Eye, Brain, Database, LayoutDashboard,
  Shield, Activity, Radio, Network,
  ChevronRight,
} from 'lucide-react';

// ─── Layer definitions ────────────────────────────────────────────────────────

const LAYERS = [
  {
    num: '01', title: 'Ingestion Layer',
    color: 'from-cyan-500 to-teal-500', border: 'border-cyan-500/30', glow: 'rgba(34,211,238,0.15)',
    icon: Radio,
    desc: 'RTSP stream reader, video file uploader, frame extractor, audio splitter. Entry point for all video data into the pipeline.',
  },
  {
    num: '02', title: 'Preprocessing Layer',
    color: 'from-blue-500 to-cyan-500', border: 'border-blue-500/30', glow: 'rgba(59,130,246,0.15)',
    icon: Layers,
    desc: 'Frame normalization, resizing (640×640 letterboxed), CLAHE contrast enhancement, optical flow, audio resampling & mel-spectrogram generation.',
  },
  {
    num: '03', title: 'Perception Layer',
    color: 'from-purple-500 to-pink-500', border: 'border-purple-500/30', glow: 'rgba(168,85,247,0.15)',
    icon: Eye,
    desc: 'YOLOv8x detection, ByteTrack tracking, logo recognition (ViT-B/16), PoseFormer action recognition, Whisper STT, PANNs audio classification — all parallel.',
  },
  {
    num: '04', title: 'Reasoning Layer',
    color: 'from-pink-500 to-rose-500', border: 'border-pink-500/30', glow: 'rgba(236,72,153,0.15)',
    icon: Brain,
    desc: 'Cross-modal transformer fusion, temporal event sequencing, context inference via Mistral-7B LLM, scene/story understanding over 30s sliding windows.',
  },
  {
    num: '05', title: 'Storage Layer',
    color: 'from-orange-500 to-amber-500', border: 'border-orange-500/30', glow: 'rgba(249,115,22,0.15)',
    icon: Database,
    desc: 'PostgreSQL for metadata, Redis for live event stream, S3-compatible blob for video/thumbnails, TimescaleDB hypertables for time-series events.',
  },
  {
    num: '06', title: 'API + UI Layer',
    color: 'from-green-500 to-emerald-500', border: 'border-green-500/30', glow: 'rgba(34,197,94,0.15)',
    icon: LayoutDashboard,
    desc: 'FastAPI REST + WebSocket gateway, React dashboard, real-time timeline, alert engine, PDF/CSV/JSON report export.',
  },
];

// ─── Component table ──────────────────────────────────────────────────────────

const COMPONENTS = [
  { name: 'StreamIngester',  role: 'Opens RTSP/HTTP streams via OpenCV or FFmpeg, extracts frames at configurable FPS, buffers into async queue.', tech: 'OpenCV · FFmpeg · asyncio' },
  { name: 'FrameRouter',    role: 'Dispatches frames to parallel GPU workers. Load balances across available CUDA devices. Drops frames if queue saturated.', tech: 'Redis Streams · Celery' },
  { name: 'PerceptionHub',  role: 'Orchestrates parallel calls to 5 independent inference workers: Detector, Tracker, ActionNet, LogoNet, AudioNet.', tech: 'PyTorch · ONNX Runtime' },
  { name: 'FusionEngine',   role: 'Consumes per-frame perception outputs, aligns temporal timestamps, runs cross-modal transformer — 512-dim fused scene embedding per 2s window.', tech: 'HuggingFace Transformers' },
  { name: 'ContextReasoner',role: 'Sliding 30s event buffer → Mistral-7B → natural-language scene summary, anomaly score [0–1], intent classification, recommended action.', tech: 'Mistral-7B · llama.cpp' },
  { name: 'AlertAgent',     role: 'Rule engine + ML anomaly scorer. Fires webhooks, stores alert events, sends WebSocket push to dashboard in <500ms.', tech: 'FastAPI WS · Celery Beat' },
  { name: 'TimelineDB',     role: 'Writes all timestamped events into TimescaleDB hypertables for fast range queries used by the dashboard.', tech: 'TimescaleDB · SQLAlchemy' },
  { name: 'DashboardAPI',   role: 'FastAPI REST + WebSocket. Serves timeline queries, live event push, report generation, camera management, JWT auth.', tech: 'FastAPI · Pydantic v2' },
];

// ─── Data flow nodes ──────────────────────────────────────────────────────────

const FLOW = [
  'RTSP / MP4', 'StreamIngester', 'FrameQueue (Redis)',
  'PerceptionHub', 'FusionEngine', 'ContextReasoner',
  'TimelineDB + AlertAgent', 'Dashboard WebSocket',
];

// ─── Multi-agent cards ────────────────────────────────────────────────────────

const AGENTS = [
  {
    name: 'StreamAgent', color: 'text-cyan-400', border: 'border-cyan-500/25', bg: 'bg-cyan-500/5',
    role: 'Ingests and preprocesses raw video/audio streams. The gatekeeper — nothing enters the pipeline without passing through this agent.',
    inputs:  ['RTSP stream URL', 'MP4/AVI file', 'Camera config JSON'],
    outputs: ['FramePackets → Redis', 'AudioChunks → Redis'],
    inputColor: 'badge-cyan', outputColor: 'badge-blue',
    detail: 'Responsibilities: RTSP connection management, frame extraction at variable FPS, audio splitting, CLAHE preprocessing, optical flow computation, timestamp embedding, frame routing.',
  },
  {
    name: 'PerceptionAgent', color: 'text-blue-400', border: 'border-blue-500/25', bg: 'bg-blue-500/5',
    role: 'Runs all visual and audio inference models in parallel. The "senses" — raw detection and recognition.',
    inputs:  ['FramePackets from Redis', 'AudioChunks from Redis'],
    outputs: ['DetectionResults JSON', 'TrackState JSON', 'ActionLogits JSON', 'AudioEvents JSON'],
    inputColor: 'badge-cyan', outputColor: 'badge-blue',
    detail: 'YOLOv8 detection, ByteTrack tracking, logo recognition, PoseFormer action, SlowFast clips, Whisper transcription, PANNs audio. All models run concurrently on GPU.',
  },
  {
    name: 'FusionAgent', color: 'text-purple-400', border: 'border-purple-500/25', bg: 'bg-purple-500/5',
    role: 'Combines all perception outputs into a unified scene representation. The "understanding" layer.',
    inputs:  ['DetectionResults', 'ActionLogits', 'AudioEvents'],
    outputs: ['SceneEmbedding (512-dim)', 'EventDescriptor JSON'],
    inputColor: 'badge-cyan', outputColor: 'badge-blue',
    detail: 'Cross-modal transformer fusion over 2s windows, temporal AV alignment, scene embedding generation, structured event descriptor JSON for the LLM context layer.',
  },
  {
    name: 'ReasoningAgent', color: 'text-orange-400', border: 'border-orange-500/25', bg: 'bg-orange-500/5',
    role: 'Generates high-level scene narratives, anomaly scores, and intent classifications using the LLM. The "brain".',
    inputs:  ['EventDescriptor JSON (30s buffer)'],
    outputs: ['SceneNarrative text', 'AnomalyScore [0–1]', 'AlertTrigger event'],
    inputColor: 'badge-cyan', outputColor: 'badge-yellow',
    detail: 'Maintains 30s event buffer → Mistral-7B (4-bit GGUF) → anomaly_score, intent_class, narrative_text. Decides whether to trigger AlertAgent. Writes summaries to DB.',
  },
];

export default function Architecture() {
  const headerRef = useRef(null);
  const headerIn  = useInView(headerRef, { once: true, margin: '-80px' });

  return (
    <div className="pt-20 min-h-screen bg-gray-950">

      {/* ── Header ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_var(--tw-gradient-stops))] from-cyan-500/8 via-transparent to-transparent" />

        <div ref={headerRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={headerIn ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55 }}>
            <span className="badge-cyan mb-5 inline-flex gap-1.5">
              <Network className="w-3.5 h-3.5" />
              Production Architecture · 6-Layer Design
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5">
              System <span className="text-gradient-cyan">Architecture</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A 6-layer production architecture with clear boundaries between ingestion, processing, intelligence, reasoning, storage, and presentation — all communicating via async message queues.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

        {/* ── 6-Layer Grid ── */}
        <section>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Architecture Layers</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {LAYERS.map((layer, i) => (
              <motion.div
                key={layer.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
                className={`card-dark p-5 border ${layer.border} relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200`}
                style={{ boxShadow: `0 0 30px ${layer.glow}` }}
              >
                {/* Top accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${layer.color}`} />

                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <layer.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="text-gray-600 font-mono text-xs">Layer {layer.num}</span>
                    <h3 className="text-white font-semibold text-sm">{layer.title}</h3>
                  </div>
                </div>

                <p className="text-gray-500 text-xs leading-relaxed">{layer.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Data Flow ── */}
        <section>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">End-to-End Data Flow</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-dark p-5 border-purple-500/20"
            style={{ boxShadow: '0 0 20px rgba(168,85,247,0.08)' }}
          >
            <div className="flex flex-wrap items-center gap-0">
              {FLOW.map((node, i) => (
                <div key={node} className="flex items-center gap-1">
                  <span className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white font-mono whitespace-nowrap hover:border-cyan-500/50 transition-colors">
                    {node}
                  </span>
                  {i < FLOW.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-cyan-500 flex-shrink-0 mx-0.5" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-500/8 border border-blue-500/20 rounded-xl">
              <p className="text-blue-300 text-xs leading-relaxed">
                <span className="font-semibold">Audio is parallel, not sequential.</span> The audio pipeline branches from the ingester simultaneously with the visual pipeline. Both streams converge at FusionEngine with a shared timestamp index — critical for correct AV synchronization.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ── Components Table ── */}
        <section>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Component Responsibilities</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-dark overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800/60 border-b border-gray-800">
                    <th className="text-left px-5 py-3.5 text-gray-500 font-mono text-xs uppercase tracking-widest w-44">Component</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-mono text-xs uppercase tracking-widest">Responsibility</th>
                    <th className="text-left px-5 py-3.5 text-gray-500 font-mono text-xs uppercase tracking-widest w-48">Technology</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPONENTS.map((c, i) => (
                    <motion.tr
                      key={c.name}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <span className="text-cyan-400 font-mono text-sm font-semibold">{c.name}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-xs leading-relaxed">{c.role}</td>
                      <td className="px-5 py-4 text-gray-600 text-xs font-mono">{c.tech}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </section>

        {/* ── Multi-Agent Design ── */}
        <section>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Multi-Agent Design</h2>
          </motion.div>
          <p className="text-gray-500 text-sm mb-8 ml-11">4-agent architecture — each agent is a specialized, independently scalable process communicating through Redis Streams.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {AGENTS.map((agent, i) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className={`card-dark p-5 border ${agent.border} ${agent.bg}`}
              >
                <div className="mb-3">
                  <h3 className={`font-mono font-bold text-base ${agent.color} mb-1`}>{agent.name}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{agent.role}</p>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed mb-4">{agent.detail}</p>

                <div className="space-y-3">
                  <div>
                    <p className="text-gray-600 font-mono text-xs uppercase tracking-widest mb-1.5">Inputs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.inputs.map(inp => (
                        <span key={inp} className="badge-cyan text-xs">{inp}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 font-mono text-xs uppercase tracking-widest mb-1.5">Outputs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {agent.outputs.map(out => (
                        <span key={out} className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          agent.name === 'ReasoningAgent' && out.includes('Alert')
                            ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                            : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        }`}>{out}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Agent flow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-6 card-dark p-5"
          >
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mb-4">Agent Communication Flow</p>
            <div className="flex flex-wrap items-center gap-2">
              {['StreamAgent', 'PerceptionAgent', 'FusionAgent', 'ReasoningAgent', 'Dashboard / Alerts'].map((node, i) => (
                <div key={node} className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border ${
                    i === 0 ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25'
                    : i === 1 ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                    : i === 2 ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                    : i === 3 ? 'bg-orange-500/10 text-orange-400 border-orange-500/25'
                    : 'bg-green-500/10 text-green-400 border-green-500/25'
                  }`}>{node}</span>
                  {i < 4 && (
                    <span className="text-gray-600 text-xs font-mono">
                      {i === 0 ? '→ Redis:frames' : i === 1 ? '→ Redis:detections' : i === 2 ? '→ Redis:events' : '→ DB + WS'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-500/6 border border-amber-500/20 rounded-xl">
              <p className="text-amber-300 text-xs leading-relaxed">
                <span className="font-semibold">LLM latency note:</span> ReasoningAgent processes 30s windows with ~3s LLM latency. Real-time alerts come from PerceptionAgent's rule-based output, not the LLM. These are two separate alert pathways — clearly distinct in the dashboard UI.
              </p>
            </div>
          </motion.div>
        </section>

        {/* ── Deployment modes ── */}
        <section>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Deployment Modes</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Edge Node (On-Site)', color: 'from-cyan-500 to-teal-500', border: 'border-cyan-500/25',
                items: ['StreamAgent + PerceptionAgent', 'Local GPU server / Jetson AGX Orin', 'Processes all camera feeds locally', 'Sends only structured JSON events upstream', 'Drastically reduces bandwidth requirements'],
              },
              {
                title: 'Cloud / Central Server', color: 'from-blue-500 to-indigo-600', border: 'border-blue-500/25',
                items: ['FusionAgent + ReasoningAgent (LLM)', 'TimescaleDB + FastAPI + React Dashboard', 'Serves multiple edge nodes', 'Handles heavy LLM inference centrally', 'Multi-tenant with per-site isolation'],
              },
              {
                title: 'FYP Demo Mode', color: 'from-purple-500 to-pink-600', border: 'border-purple-500/25',
                items: ['All services on single GPU workstation', 'docker-compose with GPU sharing via MPS', 'StreamAgent reads local MP4 or RTSP', '2–3 cameras on RTX 3060 (12GB)', 'NVIDIA Container Toolkit'],
              },
            ].map((mode, i) => (
              <motion.div
                key={mode.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`card-dark p-5 border ${mode.border}`}
              >
                <div className={`h-0.5 bg-gradient-to-r ${mode.color} mb-4 rounded-full`} />
                <h3 className="text-white font-semibold text-sm mb-3">{mode.title}</h3>
                <ul className="space-y-1.5">
                  {mode.items.map(item => (
                    <li key={item} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="text-cyan-500 mt-0.5 flex-shrink-0">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          {/* Performance metrics */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6"
          >
            {[
              { value: '5fps', label: 'Inference rate per camera' },
              { value: '<300ms', label: 'Perception latency' },
              { value: '<500ms', label: 'Alert push latency' },
              { value: '2–3', label: 'Cameras on single RTX 3060' },
            ].map(({ value, label }) => (
              <div key={label} className="card-dark p-4 text-center">
                <p className="text-2xl font-extrabold text-gradient-cyan tabular-nums">{value}</p>
                <p className="text-gray-500 text-xs mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  );
}
