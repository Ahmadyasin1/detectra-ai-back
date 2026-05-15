import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, User, Factory, Activity } from 'lucide-react';

export default function Projects() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const projects = [
    {
      icon: User,
      title: 'Face Detection System',
      description: 'Real-time facial recognition with advanced liveness detection for secure authentication and access control.',
      tech: ['CNN', 'OpenCV', 'TensorFlow', 'Anti-Spoofing'],
      gradient: 'from-cyan-500 to-blue-600',
    },
    {
      icon: Factory,
      title: 'Industrial Defect Detector',
      description: 'Automated quality control system that identifies manufacturing defects with 99.7% accuracy in real-time.',
      tech: ['YOLO', 'Edge AI', 'PyTorch', 'Computer Vision'],
      gradient: 'from-blue-600 to-violet-600',
    },
    {
      icon: Activity,
      title: 'Medical Image Classifier',
      description: 'AI-powered diagnostic assistant for analyzing medical images and detecting anomalies with clinical precision.',
      tech: ['ResNet', 'Transfer Learning', 'DICOM', 'FDA Compliant'],
      gradient: 'from-violet-600 to-cyan-500',
    },
  ];

  return (
    <section id="projects" className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Our <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Solutions</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Discover how we're transforming industries with intelligent detection systems
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="group"
            >
              <motion.div
                whileHover={{ y: -15, rotateY: 5 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="relative h-full"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 h-full flex flex-col">
                  <div className={`w-16 h-16 bg-gradient-to-br ${project.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <project.icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4">{project.title}</h3>
                  <p className="text-gray-300 leading-relaxed mb-6 flex-grow">{project.description}</p>

                  <div className="space-y-3 mb-6">
                    <p className="text-sm text-cyan-400 font-semibold">Technologies Used:</p>
                    <div className="flex flex-wrap gap-2">
                      {project.tech.map((tech) => (
                        <span
                          key={tech}
                          className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ x: 5 }}
                    className="flex items-center text-cyan-400 font-semibold group-hover:text-cyan-300 transition-colors"
                  >
                    Learn More
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="text-center mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all"
          >
            View All Projects
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
