import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Brain, Scan, Cpu, Zap } from 'lucide-react';

export default function Technology() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const technologies = [
    {
      icon: Brain,
      title: 'Detection Models',
      description: 'Advanced neural networks trained for precise object detection and classification',
      features: ['Deep Learning', 'Computer Vision', 'Real-time Processing'],
    },
    {
      icon: Scan,
      title: 'Predictive Systems',
      description: 'AI-powered analytics that predict patterns and anomalies before they occur',
      features: ['Pattern Recognition', 'Anomaly Detection', 'Forecasting'],
    },
    {
      icon: Cpu,
      title: 'Automation Tools',
      description: 'Intelligent automation solutions that streamline complex workflows',
      features: ['Smart Workflows', 'Process Optimization', 'Integration APIs'],
    },
    {
      icon: Zap,
      title: 'Edge Computing',
      description: 'Lightning-fast inference at the edge with optimized AI models',
      features: ['Low Latency', 'On-Device AI', 'Privacy-First'],
    },
  ];

  const timeline = [
    { year: '2023', event: 'Founded as Nexariza AI initiative' },
    { year: '2024', event: 'First detection model deployed' },
    { year: '2025', event: 'Expanding to multiple industries' },
    { year: 'Future', event: 'Global AI detection leader' },
  ];

  return (
    <section id="technology" className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Our <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Technology</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Cutting-edge AI solutions designed to transform detection and recognition
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {technologies.map((tech, index) => (
            <motion.div
              key={tech.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              whileHover={{ y: -10, rotateY: 5 }}
              className="group"
            >
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    <tech.icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{tech.title}</h3>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">{tech.description}</p>

                  <div className="space-y-2">
                    {tech.features.map((feature) => (
                      <div key={feature} className="flex items-center text-cyan-400 text-sm">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mr-2" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="relative"
        >
          <h3 className="text-2xl sm:text-3xl font-bold text-white text-center mb-12">
            Our Journey
          </h3>

          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-cyan-500 to-blue-600" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.8, delay: 0.8 + index * 0.2 }}
                  className={`flex items-center ${
                    index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                  }`}
                >
                  <div className={`w-5/12 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                    <div className="inline-block p-4 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/30">
                      <h4 className="text-xl font-bold text-cyan-400 mb-2">{item.year}</h4>
                      <p className="text-gray-300">{item.event}</p>
                    </div>
                  </div>

                  <div className="w-2/12 flex justify-center">
                    <div className="w-4 h-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/50" />
                  </div>

                  <div className="w-5/12" />
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
