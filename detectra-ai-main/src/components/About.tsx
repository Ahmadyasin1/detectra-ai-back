import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Target, Eye, Award } from 'lucide-react';

export default function About() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const values = [
    {
      icon: Target,
      title: 'Mission',
      description:
        'To develop a unified, privacy-preserving multimodal video intelligence platform that consolidates analysis capabilities into a single, API-free framework for autonomous video understanding.',
    },
    {
      icon: Eye,
      title: 'Vision',
      description:
        'A world where video intelligence systems provide comprehensive, contextual understanding through unified multimodal analysis, setting new benchmarks in autonomous video intelligence platforms.',
    },
    {
      icon: Award,
      title: 'Values',
      description:
        'Academic excellence, innovation, and integrity guide our FYP development. We believe in pushing boundaries while maintaining ethical AI practices and complete data privacy.',
    },
  ];

  return (
    <section id="about" className="py-20 sm:py-32 bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            About <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Detecra AI</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-4xl mx-auto leading-relaxed">
            Detectra AI is a comprehensive Final Year Project (FYP) developing a unified multimodal video intelligence platform 
            for autonomous video analysis. This cutting-edge venture under <span className="text-cyan-400 font-semibold">Nexariza AI</span>
            addresses critical gaps in current video analysis systems by providing a self-contained, API-free framework
            that processes visual, audio, and textual modalities in a unified manner for surveillance, sports analytics,
            and media monitoring applications.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              whileHover={{ y: -10 }}
              className="group"
            >
              <div className="relative p-8 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <value.icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-4">{value.title}</h3>
                  <p className="text-gray-300 leading-relaxed">{value.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
