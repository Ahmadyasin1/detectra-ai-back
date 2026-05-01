import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Video, Sliders, Eye, Users, PersonStanding,
  Mic, Layers, Brain, Radio, GitBranch,
} from 'lucide-react';

// ─── Pipeline steps ───────────────────────────────────────────────────────────

const STEPS = [
  {
    num: 1,
    title: 'Video Input & Stream Handling',
    icon: Radio,
    color: 'from-cyan-500 to-teal-500',
    glow: 'rgba(34,211,238,0.3)',
    detail: 'OpenCV/FFmpeg opens RTSP stream or file. Frames extracted at 5fps for inference (25fps for smooth playback stored separately). Audio extracted as 16kHz mono PCM. Concurrent streams handled via asyncio + thread pool. Frame timestamps embedded as metadata from presentation timestamp (PTS).',
    tags: [
      { label: 'OpenCV VideoCapture', color: 'badge-cyan' },
      { label: 'FFmpeg subprocess', color: 'badge-gray' },
      { label: 'asyncio.Queue', color: 'badge-blue' },
      { label: '16kHz mono PCM', color: 'badge-gray' },
    ],
  },
  {
    num: 2,
    title: 'Preprocessing',
    icon: Sliders,
    color: 'from-blue-500 to-cyan-500',
    glow: 'rgba(59,130,246,0.3)',
    detail: 'Frames: resize to 640×640 (letterboxed), normalize to [0,1], CLAHE contrast enhancement for low-light. Optical flow (Farneback) computed between consecutive frames to provide motion priors. Audio: VAD (Voice Activity Detection) with Silero VAD, spectrogram via Librosa (mel-spectrogram, 128 bins, 2048 FFT).',
    tags: [
      { label: 'Albumentations', color: 'badge-gray' },
      { label: 'Librosa mel-spec', color: 'badge-yellow' },
      { label: 'Silero VAD', color: 'badge-gray' },
      { label: 'CLAHE (cv2)', color: 'badge-cyan' },
    ],
  },
  {
    num: 3,
    title: 'Object Detection + Logo Recognition',
    icon: Eye,
    color: 'from-purple-500 to-blue-600',
    glow: 'rgba(168,85,247,0.3)',
    detail: 'YOLOv8x for general object detection (80 COCO classes + custom person subclasses). RT-DETR as fallback for crowded scenes where YOLO NMS fails. Logo recognition uses a ViT-B/16 classification head fine-tuned on OpenLogos-32 + custom surveillance-specific logos. Confidence threshold: 0.45 for detection, 0.70 for logo. Non-Maximum Suppression via Torchvision.',
    tags: [
      { label: 'YOLOv8x (Ultralytics)', color: 'badge-cyan' },
      { label: 'RT-DETR', color: 'badge-blue' },
      { label: 'ViT-B/16', color: 'badge-blue' },
      { label: 'OpenLogos-32', color: 'badge-gray' },
    ],
  },
  {
    num: 4,
    title: 'Multi-Object Tracking',
    icon: Users,
    color: 'from-cyan-500 to-indigo-500',
    glow: 'rgba(34,211,238,0.3)',
    detail: 'ByteTrack for robust ID assignment across frames (handles occlusion and re-ID). Each tracked person assigned a persistent integer ID for the session. Track states: Active / Lost / Removed. Re-identification uses appearance features from ReID model (OSNet) to recover lost tracks. Track history buffers last 150 bounding boxes per ID for trajectory analysis.',
    tags: [
      { label: 'ByteTrack', color: 'badge-cyan' },
      { label: 'OSNet ReID', color: 'badge-blue' },
      { label: 'Kalman Filter', color: 'badge-gray' },
      { label: '150-frame buffer', color: 'badge-gray' },
    ],
  },
  {
    num: 5,
    title: 'Action Recognition',
    icon: PersonStanding,
    color: 'from-pink-500 to-purple-600',
    glow: 'rgba(236,72,153,0.3)',
    detail: 'Two-stage: (a) Pose estimation via YOLOv8-Pose → keypoint sequences fed into PoseFormer for action classification over a 16-frame sliding window. (b) SlowFast network for coarse action categories (walking, running, fighting, loitering, gathering) over 8-frame clips. Actions bound to tracker IDs. Temporal fusion: actions carry duration estimate (start_frame, end_frame, confidence). Custom fine-tuning on HMDB51 + NTU RGB+D.',
    tags: [
      { label: 'YOLOv8-Pose', color: 'badge-cyan' },
      { label: 'PoseFormer', color: 'badge-blue' },
      { label: 'SlowFast R50', color: 'badge-blue' },
      { label: 'HMDB51', color: 'badge-gray' },
      { label: 'NTU RGB+D', color: 'badge-yellow' },
    ],
  },
  {
    num: 6,
    title: 'Audio Intelligence',
    icon: Mic,
    color: 'from-green-500 to-emerald-600',
    glow: 'rgba(34,197,94,0.3)',
    detail: 'Speech-to-text: OpenAI Whisper (medium model, runs locally via whisper.cpp for speed). Segments of 30s processed with 5s overlap. Environmental sound: PANNs (Pretrained Audio Neural Networks) on AudioSet-20K — classifies 527 sound events. Key classes for surveillance: glass breaking, gunshot, screaming, crowd noise, vehicle. Results timestamped and merged with video timeline.',
    tags: [
      { label: 'Whisper Medium (local)', color: 'badge-cyan' },
      { label: 'PANNs / CNN14', color: 'badge-blue' },
      { label: 'AudioSet-20K', color: 'badge-gray' },
      { label: 'whisper.cpp', color: 'badge-yellow' },
    ],
  },
  {
    num: 7,
    title: 'Multimodal Fusion Engine',
    icon: Layers,
    color: 'from-rose-500 to-pink-600',
    glow: 'rgba(244,63,94,0.3)',
    detail: 'Temporal window of 2 seconds. Inputs: per-frame detection embeddings (YOLOv8 backbone features), action class logits, audio event probabilities, optical flow magnitude. A 4-head cross-attention transformer aligns modalities using synchronized timestamp as positional encoding. Output: a 512-dim fused scene embedding per window, plus a joint event descriptor JSON (objects present, actions occurring, sounds detected, confidence scores).',
    tags: [
      { label: 'Cross-Attention Transformer', color: 'badge-cyan' },
      { label: 'HuggingFace BERT backbone', color: 'badge-blue' },
      { label: 'Temporal Positional Encoding', color: 'badge-blue' },
      { label: '512-dim embedding', color: 'badge-gray' },
    ],
  },
  {
    num: 8,
    title: 'Context Understanding & Story Inference',
    icon: Brain,
    color: 'from-orange-500 to-amber-500',
    glow: 'rgba(249,115,22,0.3)',
    detail: 'A sliding 30-second event buffer feeds a fine-tuned language model (Mistral-7B-Instruct or LLaMA-3-8B via llama.cpp). The LLM receives a structured prompt: {scene_description + timeline_of_events} → generates: (1) natural-language scene summary, (2) anomaly score [0–1], (3) intent classification (benign / suspicious / urgent), (4) recommended action. This is the "story layer" — it synthesizes what happened, not just what was detected.',
    tags: [
      { label: 'Mistral-7B-Instruct (4-bit GGUF)', color: 'badge-cyan' },
      { label: 'llama.cpp', color: 'badge-blue' },
      { label: 'Structured Prompt Engineering', color: 'badge-blue' },
      { label: 'Anomaly Scoring', color: 'badge-yellow' },
    ],
  },
  {
    num: 9,
    title: 'Output: Events, Alerts, Timeline',
    icon: GitBranch,
    color: 'from-teal-500 to-cyan-600',
    glow: 'rgba(20,184,166,0.3)',
    detail: 'All timestamped events written to TimescaleDB. Alert conditions (anomaly_score > 0.75, specific actions detected) trigger the AlertAgent which pushes WebSocket messages to the dashboard in <500ms. Reports generated as JSON (structured), PDF (rendered), and CSV (tabular) on demand. Dashboard shows interactive timeline with event markers, bounding box replay, and LLM-generated summaries per segment.',
    tags: [
      { label: 'TimescaleDB hypertable', color: 'badge-cyan' },
      { label: 'WebSocket push', color: 'badge-blue' },
      { label: 'ReportLab PDF', color: 'badge-gray' },
      { label: 'Chart.js timeline', color: 'badge-yellow' },
    ],
  },
];

// ─── Metrics ──────────────────────────────────────────────────────────────────

const METRICS = [
  { value: '9',       label: 'Pipeline Stages' },
  { value: '7',       label: 'AI Models Integrated' },
  { value: '527',     label: 'Audio Event Classes' },
  { value: '80+',     label: 'Object Classes' },
  { value: '<300ms',  label: 'Perception Latency' },
  { value: '2s',      label: 'Fusion Window Size' },
];

// ─── Tag component ────────────────────────────────────────────────────────────

function Tag({ label, color }: { label: string; color: string }) {
  return <span className={`${color} text-xs font-mono`}>{label}</span>;
}

export default function Pipeline() {
  const headerRef = useRef(null);
  const headerIn  = useInView(headerRef, { once: true, margin: '-80px' });

  return (
    <div className="pt-20 min-h-screen bg-gray-950">

      {/* ── Header ── */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_var(--tw-gradient-stops))] from-purple-500/8 via-transparent to-transparent" />

        <div ref={headerRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={headerIn ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55 }}>
            <span className="badge-blue mb-5 inline-flex gap-1.5">
              <Video className="w-3.5 h-3.5" />
              AI Pipeline · 9-Stage Design
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5">
              Intelligence <span className="text-gradient-cyan">Pipeline</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Every frame of video passes through 9 specialized stages — from raw RTSP input to a complete multimodal intelligence report with natural-language scene understanding.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Metrics strip ── */}
      <section className="py-8 bg-gray-900 border-y border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {METRICS.map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="text-center"
              >
                <p className="text-2xl font-extrabold text-gradient-cyan tabular-nums">{value}</p>
                <p className="text-gray-500 text-xs mt-0.5 leading-tight">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline steps ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[22px] top-10 bottom-10 w-px bg-gradient-to-b from-cyan-500/60 via-purple-500/30 to-orange-500/20 hidden sm:block" />

            <div className="space-y-6">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="relative flex gap-5 sm:gap-6"
                >
                  {/* Step number badge */}
                  <div className="relative flex-shrink-0 z-10">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                      style={{ boxShadow: `0 0 16px ${step.glow}` }}
                    >
                      <step.icon className="w-5 h-5 text-white" />
                    </div>
                    {/* Step number overlay */}
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-950 border border-gray-700 flex items-center justify-center text-gray-400 font-mono text-xs font-bold">
                      {step.num}
                    </span>
                  </div>

                  {/* Card */}
                  <div className="flex-1 card-dark p-5 hover:border-gray-700 transition-all duration-200 group">
                    <h3 className="text-white font-semibold text-base mb-2 group-hover:text-cyan-300 transition-colors">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4">{step.detail}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {step.tags.map(tag => (
                        <Tag key={tag.label} label={tag.label} color={tag.color} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Optimization note ── */}
      <section className="py-12 bg-gray-900 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {[
              { title: 'Zero-Copy Frame Passing', desc: 'Shared memory (multiprocessing.shared_memory) between StreamAgent and PerceptionAgent. Avoid Redis serialization for frame arrays — only send frame IDs over Redis.', icon: '⚡' },
              { title: 'Early Exit Detection', desc: 'If optical flow is near-zero AND no persons detected in prior 10 frames, skip SlowFast and PoseFormer — save ~80ms per frame in static scenes.', icon: '🔁' },
              { title: 'Adaptive FPS', desc: 'Drop FPS to 2 when optical flow magnitude is below threshold (static scene). Auto-ramp back when motion detected. Reduces GPU load 30–50% in idle scenes.', icon: '📊' },
            ].map(opt => (
              <div key={opt.title} className="card-dark p-5">
                <p className="text-2xl mb-2">{opt.icon}</p>
                <h4 className="text-white font-semibold text-sm mb-2">{opt.title}</h4>
                <p className="text-gray-500 text-xs leading-relaxed">{opt.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
