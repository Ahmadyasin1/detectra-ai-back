import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Brain, Target, Award, Users, Clock, BookOpen } from 'lucide-react';

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
    {
      icon: Target,
      title: 'Project Type',
      content: 'Final Year Project (FYP) - Software Engineering',
      color: 'from-emerald-500 to-blue-500',
    },
    {
      icon: BookOpen,
      title: 'Academic Level',
      content: 'Bachelor of Science in Software Engineering',
      color: 'from-blue-500 to-purple-500',
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
    { criterion: 'Object Detection & Logo Recognition Module', weightage: '20%' },
    { criterion: 'Motion/Action Recognition Module', weightage: '15%' },
    { criterion: 'Audio Analysis (Environmental + Speech-to-Text)', weightage: '15%' },
    { criterion: 'Multimodal Fusion Engine (Transformer-based)', weightage: '25%' },
    { criterion: 'Interactive Dashboard (Timeline Reports & Analytics)', weightage: '15%' },
    { criterion: 'Final Integration, Testing & Documentation', weightage: '10%' },
  ];

  return (
    <section id="fyp-project" className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            FYP <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Project</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-4xl mx-auto">
            A comprehensive multimodal video intelligence platform for autonomous video analysis
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {projectDetails.map((detail, index) => (
            <motion.div
              key={detail.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.05 }}
              className="group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 h-full">
                  <div className={`w-16 h-16 bg-gradient-to-br ${detail.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <detail.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4 text-center">{detail.title}</h3>
                  <p className="text-gray-300 leading-relaxed text-center">{detail.content}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
            
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
              <h3 className="text-2xl font-bold text-white mb-6">Project Objectives</h3>
              <ul className="space-y-4">
                {objectives.map((objective, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">{index + 1}</span>
                    </div>
                    <span className="text-gray-300 leading-relaxed">{objective}</span>
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
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-600/10 rounded-3xl blur-xl" />
            
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
              <h3 className="text-2xl font-bold text-white mb-6">Completeness Criteria</h3>
              <div className="space-y-4">
                {completenessCriteria.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 1.0 + index * 0.1 }}
                    className="flex justify-between items-center p-4 bg-white/10 rounded-xl border border-cyan-500/20"
                  >
                    <span className="text-gray-300 text-sm">{item.criterion}</span>
                    <span className="text-cyan-400 font-bold">{item.weightage}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
