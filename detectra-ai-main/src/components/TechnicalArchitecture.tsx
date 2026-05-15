import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Cpu, Eye, Ear, Brain, Database, Globe } from 'lucide-react';

export default function TechnicalArchitecture() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const modules = [
    {
      icon: Eye,
      title: 'Object Detection & Logo Recognition',
      description: 'Advanced CNN-based models for real-time object detection and custom logo recognition',
      technologies: ['YOLO', 'DETR', 'OpenCV', 'Custom Logo Dataset'],
      color: 'from-blue-500 to-cyan-500',
      status: 'Planned',
    },
    {
      icon: Brain,
      title: 'Motion/Action Recognition',
      description: 'Deep learning models for human activity and motion pattern recognition',
      technologies: ['3D CNN', 'LSTM', 'Transformer', 'Kinetics Dataset'],
      color: 'from-cyan-500 to-green-500',
      status: 'Planned',
    },
    {
      icon: Ear,
      title: 'Audio Analysis',
      description: 'Speech-to-text and environmental sound classification using state-of-the-art models',
      technologies: ['Whisper', 'wav2vec 2.0', 'AudioSet', 'Librosa'],
      color: 'from-green-500 to-yellow-500',
      status: 'Planned',
    },
    {
      icon: Cpu,
      title: 'Multimodal Fusion Engine',
      description: 'Transformer-based fusion engine for contextual alignment of all modalities',
      technologies: ['Transformer', 'Cross-Modal Attention', 'Temporal Alignment', 'PyTorch'],
      color: 'from-yellow-500 to-orange-500',
      status: 'Planned',
    },
    {
      icon: Globe,
      title: 'Interactive Dashboard',
      description: 'Web-based dashboard for timeline visualization and analytics',
      technologies: ['React', 'Next.js', 'D3.js', 'WebSocket'],
      color: 'from-orange-500 to-red-500',
      status: 'Planned',
    },
    {
      icon: Database,
      title: 'Data Management',
      description: 'Efficient storage and retrieval of video metadata and analysis results',
      technologies: ['PostgreSQL', 'Redis', 'Supabase', 'File Storage'],
      color: 'from-red-500 to-purple-500',
      status: 'Planned',
    },
  ];

  const requirements = [
    {
      category: 'Functional Requirements',
      items: [
        'UC-1: Analyze Video & Generate Report',
        'UC-2: Configure Analysis Modalities',
        'UC-3: View Timeline Report',
        'UC-4: Export Analysis Results',
        'UC-5: Manage User Preferences',
      ],
    },
    {
      category: 'Non-Functional Requirements',
      items: [
        'Performance: Process 1-minute HD video within 60 seconds',
        'Accuracy: Achieve ≥85% accuracy across all modules',
        'Security: Privacy-preserving, API-free architecture',
        'Scalability: Support large-scale datasets with GPU acceleration',
        'Reliability: Maintain high accuracy with degraded quality inputs',
      ],
    },
  ];

  return (
    <section id="technical-architecture" className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Technical <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Architecture</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Comprehensive system architecture for multimodal video intelligence platform
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {modules.map((module, index) => (
            <motion.div
              key={module.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.05 }}
              className="group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 h-full">
                  <div className={`w-16 h-16 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <module.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4 text-center">{module.title}</h3>
                  <p className="text-gray-300 leading-relaxed mb-4 text-center text-sm">{module.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {module.technologies.map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        className="inline-block px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs mr-2 mb-2"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex justify-center">
                    <span className="px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-yellow-400 text-sm font-semibold">
                      {module.status}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {requirements.map((req, index) => (
            <motion.div
              key={req.category}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
              
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <h3 className="text-2xl font-bold text-white mb-6">{req.category}</h3>
                <ul className="space-y-4">
                  {req.items.map((item, itemIndex) => (
                    <motion.li
                      key={itemIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.8 + itemIndex * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                      <span className="text-gray-300 leading-relaxed">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
