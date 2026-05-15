import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Calendar, Clock, CheckCircle, PlayCircle, PauseCircle, ExternalLink } from 'lucide-react';

export default function ProjectTimeline() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [showGanttChart, setShowGanttChart] = useState(false);

  const phases = [
    {
      id: 1,
      title: 'Phase 1: Project Proposal & SRS Documentation',
      duration: 'Aug - Oct 2025',
      status: 'In Progress',
      progress: 90,
      tasks: [
        'Proposal Preparation & Approval',
        'Requirement Elicitation & Feasibility Study',
        'SRS Document Development',
      ],
      color: 'from-blue-500 to-cyan-500',
      icon: CheckCircle,
    },
    {
      id: 2,
      title: 'Phase 2: System Design & Dataset Preparation',
      duration: 'Nov 2025 - Jan 2026',
      status: 'Planned',
      progress: 0,
      tasks: [
        'Literature Review & Dataset Collection',
        'Data Cleaning & Annotation',
        'Architecture & Model Design',
      ],
      color: 'from-cyan-500 to-green-500',
      icon: PlayCircle,
    },
    {
      id: 3,
      title: 'Phase 3: Implementation & Integration',
      duration: 'Feb - Apr 2026',
      status: 'Planned',
      progress: 0,
      tasks: [
        'Object Detection & Logo Recognition Module',
        'Motion/Action Recognition Module',
        'Audio Analysis (Speech + Environmental)',
        'Multimodal Fusion Engine',
      ],
      color: 'from-green-500 to-yellow-500',
      icon: PauseCircle,
    },
    {
      id: 4,
      title: 'Phase 4: Testing, Evaluation & Deployment',
      duration: 'May - Jul 2026',
      status: 'Planned',
      progress: 0,
      tasks: [
        'Web Dashboard Development',
        'System Testing & Optimization',
        'Documentation & Final Deployment',
        'Presentation & Viva Preparation',
      ],
      color: 'from-yellow-500 to-orange-500',
      icon: PauseCircle,
    },
  ];

  const milestones = [
    { date: 'Oct 2025', event: 'SRS Documentation Complete', status: 'completed' },
    { date: 'Jan 2026', event: 'Dataset Preparation Complete', status: 'planned' },
    { date: 'Apr 2026', event: 'Core Modules Implementation Complete', status: 'planned' },
    { date: 'Jul 2026', event: 'Final System Deployment & Presentation', status: 'planned' },
  ];

  return (
    <section id="project-timeline" className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Project <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Timeline</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto mb-8">
            12-month comprehensive development timeline with detailed milestones and deliverables
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowGanttChart(!showGanttChart)}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all flex items-center gap-3 mx-auto"
          >
            <Calendar className="w-6 h-6" />
            {showGanttChart ? 'Hide' : 'View'} Detailed Gantt Chart
            <ExternalLink className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {showGanttChart && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
              <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
                <iframe
                  src="/gantt-chart.html"
                  className="w-full h-[800px] rounded-2xl border-0"
                  title="Detectra AI Gantt Chart"
                />
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <div className="space-y-8">
            {phases.map((phase, index) => (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
                
                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${phase.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <phase.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{phase.title}</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <span className="text-cyan-400 font-semibold">{phase.duration}</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          phase.status === 'In Progress' 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {phase.status}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-300 text-sm">Progress</span>
                          <span className="text-cyan-400 font-semibold">{phase.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={isInView ? { width: `${phase.progress}%` } : {}}
                            transition={{ duration: 1, delay: 0.5 + index * 0.1 }}
                            className="h-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-2">
                    {phase.tasks.map((task, taskIndex) => (
                      <li key={taskIndex} className="flex items-center gap-3 text-gray-300">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0" />
                        <span className="text-sm">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
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
                <h3 className="text-2xl font-bold text-white mb-6">Key Milestones</h3>
                
                <div className="space-y-6">
                  {milestones.map((milestone, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      className="flex items-center gap-4 p-4 bg-white/10 rounded-xl border border-cyan-500/20"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        milestone.status === 'completed' 
                          ? 'bg-green-500/20 border border-green-500/30' 
                          : 'bg-gray-500/20 border border-gray-500/30'
                      }`}>
                        {milestone.status === 'completed' ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <Clock className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="text-cyan-400 font-semibold mb-1">{milestone.date}</div>
                        <div className="text-gray-300">{milestone.event}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
                <h3 className="text-2xl font-bold text-white mb-6">Project Statistics</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white/10 rounded-xl border border-cyan-500/20">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">12</div>
                    <div className="text-gray-300 text-sm">Months Duration</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 rounded-xl border border-cyan-500/20">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">4</div>
                    <div className="text-gray-300 text-sm">Major Phases</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 rounded-xl border border-cyan-500/20">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">15</div>
                    <div className="text-gray-300 text-sm">Key Tasks</div>
                  </div>
                  <div className="text-center p-4 bg-white/10 rounded-xl border border-cyan-500/20">
                    <div className="text-3xl font-bold text-cyan-400 mb-2">90%</div>
                    <div className="text-gray-300 text-sm">Phase 1 Complete</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
