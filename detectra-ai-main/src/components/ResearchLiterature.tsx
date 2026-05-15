import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { FileText, Quote } from 'lucide-react';

export default function ResearchLiterature() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const researchPapers = [
    {
      title: 'Learning Transferable Visual Models From Natural Language Supervision (CLIP)',
      authors: 'Radford, A., et al.',
      year: '2021',
      venue: 'ICML',
      relevance: 'Foundation for vision-language understanding in multimodal systems',
      impact: 'High',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Flamingo: a Visual Language Model for Few-Shot Learning',
      authors: 'Alayrac, J-B., et al.',
      year: '2022',
      venue: 'DeepMind',
      relevance: 'Advanced multimodal fusion techniques for few-shot learning',
      impact: 'High',
      color: 'from-cyan-500 to-green-500',
    },
    {
      title: 'GPT-4 Technical Report',
      authors: 'OpenAI',
      year: '2023',
      venue: 'OpenAI',
      relevance: 'State-of-the-art language understanding and multimodal capabilities',
      impact: 'High',
      color: 'from-green-500 to-yellow-500',
    },
    {
      title: 'End-to-End Object Detection with Transformers (DETR)',
      authors: 'Carion, N., et al.',
      year: '2020',
      venue: 'ECCV',
      relevance: 'Transformer-based object detection for our core detection module',
      impact: 'High',
      color: 'from-yellow-500 to-orange-500',
    },
    {
      title: 'wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations',
      authors: 'Baevski, A., et al.',
      year: '2020',
      venue: 'NeurIPS',
      relevance: 'Advanced speech representation learning for audio analysis',
      impact: 'Medium',
      color: 'from-orange-500 to-red-500',
    },
    {
      title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale (ViT)',
      authors: 'Dosovitskiy, A., et al.',
      year: '2021',
      venue: 'ICLR',
      relevance: 'Vision transformer architecture for image processing',
      impact: 'Medium',
      color: 'from-red-500 to-purple-500',
    },
    {
      title: 'Anticipative Video Transformer for Recognition and Forecasting',
      authors: 'Girdhar, R., et al.',
      year: '2021',
      venue: 'CVPR',
      relevance: 'Video understanding and temporal modeling for motion recognition',
      impact: 'Medium',
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const researchGaps = [
    'Limited integration of multiple modalities in a unified framework',
    'Dependence on external APIs for video analysis tasks',
    'Lack of privacy-preserving video intelligence platforms',
    'Insufficient real-time multimodal fusion capabilities',
    'Limited customization options for domain-specific applications',
  ];

  const methodology = [
    {
      phase: 'Literature Review',
      description: 'Comprehensive analysis of existing multimodal AI systems and video analysis frameworks',
      duration: '2 months',
      deliverables: ['Research Report', 'Technology Stack Selection', 'Architecture Design'],
    },
    {
      phase: 'Dataset Collection & Preparation',
      description: 'Gathering and preprocessing datasets for object detection, logo recognition, and audio analysis',
      duration: '2 months',
      deliverables: ['Curated Datasets', 'Annotation Guidelines', 'Data Preprocessing Pipeline'],
    },
    {
      phase: 'Model Development & Training',
      description: 'Developing and training custom models for each modality and fusion engine',
      duration: '4 months',
      deliverables: ['Trained Models', 'Performance Metrics', 'Model Documentation'],
    },
    {
      phase: 'System Integration & Testing',
      description: 'Integrating all modules and comprehensive system testing',
      duration: '2 months',
      deliverables: ['Integrated System', 'Test Results', 'Performance Benchmarks'],
    },
  ];

  return (
    <section id="research-literature" className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,_var(--tw-gradient-stops))] from-violet-500/5 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Research & <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Literature</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Comprehensive literature review and research methodology for Detectra AI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
              
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <h3 className="text-2xl font-bold text-white mb-6">Key Research Papers</h3>
                
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {researchPapers.map((paper, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                      className="p-6 bg-white/10 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 bg-gradient-to-br ${paper.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-white font-semibold mb-2 line-clamp-2">{paper.title}</h4>
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-cyan-400 text-sm">{paper.authors}</span>
                            <span className="text-gray-400 text-sm">{paper.year}</span>
                            <span className="text-gray-400 text-sm">{paper.venue}</span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{paper.relevance}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            paper.impact === 'High' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {paper.impact} Impact
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-600/10 rounded-3xl blur-xl" />
              
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <h3 className="text-2xl font-bold text-white mb-6">Research Gaps Identified</h3>
                
                <ul className="space-y-4">
                  {researchGaps.map((gap, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={isInView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-sm font-bold">!</span>
                      </div>
                      <span className="text-gray-300 leading-relaxed">{gap}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-600/10 rounded-3xl blur-xl" />
              
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <h3 className="text-2xl font-bold text-white mb-6">Research Methodology</h3>
                
                <div className="space-y-4">
                  {methodology.map((phase, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 1.0 + index * 0.1 }}
                      className="p-4 bg-white/10 rounded-xl border border-cyan-500/20"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-semibold">{phase.phase}</h4>
                        <span className="text-cyan-400 text-sm font-semibold">{phase.duration}</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{phase.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {phase.deliverables.map((deliverable, delIndex) => (
                          <span
                            key={delIndex}
                            className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs"
                          >
                            {deliverable}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
          
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-4">Research Impact Statement</h3>
              <Quote className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            </div>
            
            <blockquote className="text-xl text-gray-300 leading-relaxed text-center italic max-w-4xl mx-auto">
              "By consolidating multimodal analysis into a unified, privacy-preserving framework, Detectra AI aims to set a new benchmark in autonomous video intelligence platforms, addressing critical gaps in current video analysis systems while maintaining complete data privacy and system autonomy."
            </blockquote>
            
            <div className="mt-8 text-center">
              <span className="text-cyan-400 font-semibold">— Detectra AI Research Team</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
