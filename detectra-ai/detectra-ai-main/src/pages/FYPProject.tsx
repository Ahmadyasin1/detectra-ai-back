import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Brain, Target, Award, Users, Clock, Eye, Zap, Shield, CheckCircle } from 'lucide-react';
import PageHero from '../components/PageHero';

export default function FYPProject() {
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
      content: 'Phases 1-2: Dr. Usman Aamer (Director FOIT, UCP) · Phases 3-4: Dr. Yasin Nasir (UCP)',
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

  const completenessCriteria = [
    { criteria: 'Object Detection & Logo Recognition Module', weightage: 20 },
    { criteria: 'Motion/Action Recognition Module', weightage: 15 },
    { criteria: 'Audio Analysis (Environmental + Speech-to-Text)', weightage: 15 },
    { criteria: 'Multimodal Fusion Engine (Transformer-based)', weightage: 25 },
    { criteria: 'Interactive Dashboard (Timeline Reports & Analytics)', weightage: 15 },
    { criteria: 'Final Integration, Testing & Documentation', weightage: 10 },
  ];

  const functionalRequirements = [
    { id: 'UC-1', name: 'Analyze Video & Generate Report', description: 'Core pipeline execution for multimodal video analysis' },
    { id: 'UC-2', name: 'Configure Analysis Modalities', description: 'User customization of analysis modules' },
    { id: 'UC-3', name: 'View Timeline Report', description: 'Visualization and insights dashboard' },
  ];

  const nonFunctionalRequirements = [
    {
      category: 'Performance',
      requirements: [
        'Achieve ≥85% accuracy across all detection and fusion modules on validation datasets',
        'Process a 1-minute HD video within ≤15 minutes on CPU-only hardware (no GPU required)',
        'CPU-optimised inference via INT8-quantised ONNX models for accessible deployment'
      ]
    },
    {
      category: 'Security',
      requirements: [
        'Ensure strict compliance with data privacy regulations',
        'Implement user authentication and role-based access control',
        'Privacy-preserving architecture with no external API dependencies'
      ]
    },
    {
      category: 'Portability',
      requirements: [
        'Deployable on local servers or cloud environments without external API dependencies',
        'Backend must support containerization via Docker for reproducibility',
        'Cross-platform compatibility (Linux/Windows/macOS)'
      ]
    },
    {
      category: 'Reliability',
      requirements: [
        'Maintain high accuracy for all modalities',
        'Robust performance with degraded video/audio quality',
        'Extensible framework for future modality integration'
      ]
    },
  ];

  const modules = [
    {
      icon: Eye,
      title: 'Object & Person Detection',
      description: 'YOLOv8s-seg detects 80+ COCO object classes with segmentation masks. ByteTrack assigns persistent IDs to track every individual across frames.',
      technologies: ['YOLOv8s-seg', 'ByteTrack', 'OpenCV', 'COCO-80'],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Brain,
      title: 'Pose & Action Recognition',
      description: 'YOLOv8n-pose extracts 17-keypoint skeletons per person. An ActionBuffer classifies activities over sliding temporal windows using VideoMAE.',
      technologies: ['YOLOv8n-pose', 'VideoMAE', 'ActionBuffer', 'UCF-101'],
      color: 'from-cyan-500 to-green-500',
    },
    {
      icon: Zap,
      title: 'Audio Analysis',
      description: 'Whisper-small transcribes speech with timestamps and language detection. YAMNet + Librosa MFCC classifies 521 environmental sound categories.',
      technologies: ['Whisper-small', 'YAMNet', 'Librosa MFCC', 'AudioSet'],
      color: 'from-green-500 to-yellow-500',
    },
    {
      icon: Target,
      title: 'Cross-Modal Fusion Engine',
      description: 'A custom Cross-Modal Transformer attends over visual and audio feature streams simultaneously to resolve context that single-modality models miss.',
      technologies: ['Cross-Modal Transformer', 'Multi-Head Attention', 'Temporal Alignment', 'PyTorch'],
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Final Year Project · UCP"
        badgeIcon={Brain}
        title="FYP"
        titleAccent="Project"
        description="A comprehensive multimodal video intelligence platform for autonomous video analysis."
      >
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
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
                    <p className="text-gray-300 leading-relaxed text-sm">{detail.content}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </PageHero>

      {/* Abstract Section */}
      <section className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Project <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Abstract</span>
            </h2>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
              
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  Detectra AI is a unified web application designed for multimodal video analysis, which extracts synchronized insights from raw video data. Unlike current systems that rely heavily on third-party APIs, Detectra AI offers an end-to-end pipeline that performs object detection, logo recognition, motion/activity recognition, and audio transcription (environmental sounds and speech).
                </p>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  The system uses a transformer-based fusion engine to synchronize outputs from all modalities into a timeline-based dashboard. The project's significance lies in creating a self-contained, API-free video intelligence framework to address limitations in contextuality, privacy, and scalability of existing tools.
                </p>
                <p className="text-gray-300 text-lg leading-relaxed">
                  <span className="text-cyan-400 font-semibold">By consolidating multimodal analysis into a unified, privacy-preserving framework, Detectra AI aims to set a new benchmark in autonomous video intelligence platforms.</span>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Objectives Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
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

      {/* Completeness Criteria Section */}
      <section ref={ref} className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Completeness <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Criteria</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Project success metrics and evaluation criteria
            </p>
          </motion.div>

          <div className="max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
              
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-cyan-500/20">
                        <th className="px-6 py-4 text-left text-cyan-400 font-semibold">S.No</th>
                        <th className="px-6 py-4 text-left text-cyan-400 font-semibold">Criteria</th>
                        <th className="px-6 py-4 text-left text-cyan-400 font-semibold">Weightage (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completenessCriteria.map((item, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, x: -30 }}
                          animate={isInView ? { opacity: 1, x: 0 } : {}}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="border-b border-white/20/50 hover:bg-cyan-500/5 transition-colors"
                        >
                          <td className="px-6 py-4 text-white font-semibold">{index + 1}</td>
                          <td className="px-6 py-4 text-gray-300">{item.criteria}</td>
                          <td className="px-6 py-4 text-cyan-400 font-semibold">{item.weightage}%</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Functional Requirements Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Functional <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Requirements</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Core system functionalities and use cases
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {functionalRequirements.map((req, index) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{req.id}</span>
                      </div>
                      <h3 className="text-xl font-bold text-white">{req.name}</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{req.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Non-Functional Requirements Section */}
      <section className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Non-Functional <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Requirements</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              System quality attributes and performance benchmarks
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {nonFunctionalRequirements.map((category, index) => (
              <motion.div
                key={category.category}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 h-full">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                      <Shield className="w-6 h-6 text-cyan-400" />
                      {category.category}
                    </h3>
                    <ul className="space-y-3">
                      {category.requirements.map((req, reqIndex) => (
                        <li key={reqIndex} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-300 text-sm leading-relaxed">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Modules Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,_var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
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
                animate={{ opacity: 1, y: 0 }}
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
