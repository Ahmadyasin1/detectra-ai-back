import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Brain, Target, Award, Users, Clock, Eye, Zap } from 'lucide-react';

export default function Project() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const projectDetails = [
    {
      icon: Brain,
      title: 'Project Title',
      content: 'Detectra AI: Multimodal Video Intelligence Platform',
      color: 'from-cyan-500 to-blue-600',
    },
    {
      icon: Users,
      title: 'Team Members',
      content: 'ABDUL REHMAN, EMAN SARFRAZ, AHMAD YASIN',
      color: 'from-blue-600 to-violet-600',
    },
    {
      icon: Award,
      title: 'Supervisor',
      content: 'Dr. Usman Aamer, Director of FOIT, University of Central Punjab',
      color: 'from-violet-600 to-cyan-500',
    },
    {
      icon: Clock,
      title: 'Duration',
      content: '12 Months (August 2025 - July 2026)',
      color: 'from-cyan-500 to-emerald-500',
    },
  ];

  const objectives = [
    'Develop a unified web-based application for multimodal video analysis',
    'Implement modules for object detection, logo recognition, motion recognition, and audio transcription',
    'Design a transformer-based multimodal fusion engine',
    'Deliver an interactive dashboard for timeline-based insights',
    'Achieve a fully API-free, privacy-preserving architecture',
  ];

  const modules = [
    {
      icon: Eye,
      title: 'Object Detection & Logo Recognition',
      description: 'Advanced CNN-based models for real-time object detection and custom logo recognition',
      technologies: ['YOLO', 'DETR', 'OpenCV', 'Custom Logo Dataset'],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Brain,
      title: 'Motion/Action Recognition',
      description: 'Deep learning models for human activity and motion pattern recognition',
      technologies: ['3D CNN', 'LSTM', 'Transformer', 'Kinetics Dataset'],
      color: 'from-cyan-500 to-green-500',
    },
    {
      icon: Zap,
      title: 'Audio Analysis',
      description: 'Speech-to-text and environmental sound classification using state-of-the-art models',
      technologies: ['Whisper', 'wav2vec 2.0', 'AudioSet', 'Librosa'],
      color: 'from-green-500 to-yellow-500',
    },
    {
      icon: Target,
      title: 'Multimodal Fusion Engine',
      description: 'Transformer-based fusion engine for contextual alignment of all modalities',
      technologies: ['Transformer', 'Cross-Modal Attention', 'Temporal Alignment', 'PyTorch'],
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
              FYP <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Project</span>
            </h1>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              A comprehensive multimodal video intelligence platform for autonomous video analysis
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {projectDetails.map((detail, index) => (
              <motion.div
                key={detail.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 h-full text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${detail.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                      <detail.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-4">{detail.title}</h3>
                    <p className="text-gray-300 leading-relaxed">{detail.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Objectives Section */}
      <section className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Project <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Objectives</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Clear goals and deliverables for our multimodal video intelligence platform
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-6">
              {objectives.map((objective, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex items-start gap-4 p-6 bg-white/10 rounded-xl border border-cyan-500/20 hover:border-cyan-500/50 transition-all"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  </div>
                  <p className="text-gray-300 text-lg leading-relaxed">{objective}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section ref={ref} className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Core <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Modules</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Advanced AI modules for comprehensive video analysis
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modules.map((module, index) => (
              <motion.div
                key={module.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 h-full">
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`w-16 h-16 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg`}>
                        <module.icon className="w-8 h-8 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-3">{module.title}</h3>
                        <p className="text-gray-300 leading-relaxed mb-4">{module.description}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          {module.technologies.map((tech, techIndex) => (
                            <span
                              key={techIndex}
                              className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
