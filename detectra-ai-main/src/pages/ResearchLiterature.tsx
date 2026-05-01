import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { BookOpen, ExternalLink, Award, Cpu, Mic, Eye, Brain, Volume2, Users2 } from 'lucide-react';

interface Paper {
  id:          number;
  title:       string;
  authors:     string;
  venue:       string;
  year:        number;
  module:      string;
  icon:        React.FC<{ className?: string }>;
  color:       string;
  relevance:   string;
  description: string;
  url?:        string;
}

const PAPERS: Paper[] = [
  {
    id: 1,
    title: 'YOLOv8: A New State-of-the-Art YOLO Model',
    authors: 'G. Jocher, A. Chaurasia, J. Qiu — Ultralytics',
    venue: 'Ultralytics', year: 2023,
    module: 'Object Detection',
    icon: Eye,
    color: 'from-blue-500 to-cyan-500',
    relevance: 'Core visual detection backbone',
    description: 'YOLOv8 introduces a new anchor-free detection head and improved backbone, achieving state-of-the-art real-time object detection with the -seg variant adding instance segmentation. Used as the primary detection model in Detectra AI.',
    url: 'https://github.com/ultralytics/ultralytics',
  },
  {
    id: 2,
    title: 'ByteTrack: Multi-Object Tracking by Associating Every Detection Box',
    authors: 'Y. Zhang et al. — ECCV 2022',
    venue: 'ECCV', year: 2022,
    module: 'Person Tracking',
    icon: Users2,
    color: 'from-cyan-500 to-indigo-500',
    relevance: 'Persistent person ID assignment',
    description: 'ByteTrack associates every detection box (high and low confidence) using inter-frame motion cues, achieving near-perfect tracking on MOT benchmarks. Detectra uses it to assign stable IDs across video frames for person re-identification.',
    url: 'https://arxiv.org/abs/2110.06864',
  },
  {
    id: 3,
    title: 'Robust Speech Recognition via Large-Scale Weak Supervision',
    authors: 'A. Radford et al. — OpenAI / ICML 2023',
    venue: 'ICML', year: 2023,
    module: 'Speech-to-Text',
    icon: Mic,
    color: 'from-green-500 to-emerald-600',
    relevance: 'Speech-to-text transcription',
    description: 'OpenAI Whisper is trained on 680K hours of multilingual web audio using weak supervision, achieving near-human word-error rates. Detectra AI uses the "whisper-small" variant for CPU-feasible real-time transcription with automatic language detection.',
    url: 'https://arxiv.org/abs/2212.04356',
  },
  {
    id: 4,
    title: 'AudioSet: An Ontology and Human-Labeled Dataset for Audio Events',
    authors: 'J. F. Gemmeke et al. — Google / ICASSP 2017',
    venue: 'ICASSP', year: 2017,
    module: 'Audio Classification',
    icon: Volume2,
    color: 'from-yellow-500 to-orange-500',
    relevance: 'Environmental sound classification',
    description: 'AudioSet defines a hierarchical ontology of 632 audio event classes and provides 2M+ human-labeled 10-second clips. YAMNet, trained on AudioSet, is used in Detectra AI to classify 521 categories of environmental sounds with per-second anomaly scores.',
    url: 'https://research.google.com/audioset/',
  },
  {
    id: 5,
    title: 'VideoMAE: Masked Autoencoders are Data-Efficient Learners for Self-Supervised Video Pre-Training',
    authors: 'Z. Tong et al. — NeurIPS 2022',
    venue: 'NeurIPS', year: 2022,
    module: 'Action Recognition',
    icon: Brain,
    color: 'from-purple-500 to-pink-600',
    relevance: 'Temporal action understanding',
    description: 'VideoMAE applies masked autoencoders to video by randomly masking 90–95% of tokens and reconstructing them, learning rich spatiotemporal representations. Fine-tuned on UCF-101, it powers the action recognition module that detects fighting, falling, loitering and other activities.',
    url: 'https://arxiv.org/abs/2203.12602',
  },
  {
    id: 6,
    title: 'Attention Is All You Need',
    authors: 'A. Vaswani et al. — Google Brain / NeurIPS 2017',
    venue: 'NeurIPS', year: 2017,
    module: 'Fusion Engine',
    icon: Cpu,
    color: 'from-rose-500 to-red-600',
    relevance: 'Foundation of the Cross-Modal Transformer',
    description: 'The seminal transformer paper introducing multi-head self-attention as the core mechanism for sequence modeling. Detectra\'s Cross-Modal Fusion Engine is built on multi-head cross-attention (visual queries × audio keys/values) across temporal bins to align and fuse modalities.',
    url: 'https://arxiv.org/abs/1706.03762',
  },
  {
    id: 7,
    title: 'Learning Transferable Visual Models from Natural Language Supervision (CLIP)',
    authors: 'A. Radford et al. — OpenAI / ICML 2021',
    venue: 'ICML', year: 2021,
    module: 'Multimodal Alignment',
    icon: Brain,
    color: 'from-indigo-500 to-blue-600',
    relevance: 'Cross-modal representation learning',
    description: 'CLIP demonstrates that visual and language representations can be jointly trained via contrastive learning on 400M image-text pairs. Detectra\'s fusion engine is inspired by CLIP\'s approach of aligning representations from different modalities into a shared embedding space.',
    url: 'https://arxiv.org/abs/2103.00020',
  },
  {
    id: 8,
    title: 'An Image is Worth 16×16 Words: Transformers for Image Recognition at Scale (ViT)',
    authors: 'A. Dosovitskiy et al. — Google Brain / ICLR 2021',
    venue: 'ICLR', year: 2021,
    module: 'Visual Features',
    icon: Eye,
    color: 'from-teal-500 to-cyan-600',
    relevance: 'Patch-based visual encoding',
    description: 'Vision Transformer (ViT) splits images into fixed-size patches and processes them with a standard transformer encoder. The patch-embedding architecture directly influences the visual feature extraction strategy used in Detectra\'s multimodal fusion pipeline.',
    url: 'https://arxiv.org/abs/2010.11929',
  },
];

const IMPACT_LEVELS: Record<string, { label: string; color: string }> = {
  'Object Detection':     { label: 'Direct Integration', color: 'badge-cyan'   },
  'Person Tracking':      { label: 'Direct Integration', color: 'badge-cyan'   },
  'Speech-to-Text':       { label: 'Direct Integration', color: 'badge-cyan'   },
  'Audio Classification': { label: 'Direct Integration', color: 'badge-cyan'   },
  'Action Recognition':   { label: 'Direct Integration', color: 'badge-cyan'   },
  'Fusion Engine':        { label: 'Architecture Base',  color: 'badge-blue'   },
  'Multimodal Alignment': { label: 'Conceptual Basis',   color: 'badge-yellow' },
  'Visual Features':      { label: 'Architecture Base',  color: 'badge-blue'   },
};

export default function ResearchLiterature() {
  const headerRef = useRef(null);
  const headerIn  = useInView(headerRef, { once: true, margin: '-80px' });

  return (
    <div className="pt-20 min-h-screen bg-gray-950">

      {/* Header */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_var(--tw-gradient-stops))] from-indigo-500/8 via-transparent to-transparent" />

        <div ref={headerRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={headerIn ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55 }}>
            <span className="badge-blue mb-5 inline-flex">
              <BookOpen className="w-3.5 h-3.5" />
              Research Foundation · 8 Key Papers
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-5">
              Literature <span className="text-gradient-cyan">Review</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              The academic papers that directly underpin every AI module in Detectra AI — from detection backbone to cross-modal fusion engine.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Papers grid */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {PAPERS.map((paper, i) => {
              const impact = IMPACT_LEVELS[paper.module];
              return (
                <motion.div
                  key={paper.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.5, delay: i * 0.06 }}
                  className="card-dark p-5 hover:border-gray-700 transition-all duration-200 group flex flex-col"
                >
                  {/* Header row */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-11 h-11 bg-gradient-to-br ${paper.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                      <paper.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={impact.color}>{impact.label}</span>
                        <span className="badge-gray">{paper.module}</span>
                        <span className="text-gray-600 text-xs">{paper.venue} {paper.year}</span>
                      </div>
                      <h3 className="text-white font-semibold text-sm leading-snug">{paper.title}</h3>
                    </div>
                  </div>

                  {/* Authors */}
                  <p className="text-gray-500 text-xs mb-3 flex items-center gap-1.5">
                    <Award className="w-3 h-3 flex-shrink-0" />
                    {paper.authors}
                  </p>

                  {/* Relevance tag */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-px flex-1 bg-gradient-to-r ${paper.color} opacity-30`} />
                    <span className="text-gray-400 text-xs italic flex-shrink-0">{paper.relevance}</span>
                    <div className={`h-px flex-1 bg-gradient-to-r ${paper.color} opacity-30`} />
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed flex-1">{paper.description}</p>

                  {/* Link */}
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1.5 text-xs text-cyan-500 hover:text-cyan-400 transition-colors self-start"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View paper / repository
                    </a>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Summary footer */}
      <section className="py-12 bg-gray-900 border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-gray-400 text-sm leading-relaxed max-w-2xl mx-auto">
              Detectra AI synthesises these foundational works into a single, deployable pipeline — replacing multi-vendor API dependencies with self-contained, privacy-preserving, CPU-optimised inference. Each model is either used directly (YOLOv8, Whisper, YAMNet, VideoMAE, ByteTrack) or architecturally inspired by the research listed above.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
