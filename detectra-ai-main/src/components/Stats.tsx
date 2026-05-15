import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { TrendingUp, Users, Award, Zap } from 'lucide-react';

export default function Stats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const stats = [
    {
      icon: TrendingUp,
      value: '99.7%',
      label: 'Detection Accuracy',
      description: 'Industry-leading precision in our AI models',
      color: 'from-cyan-400 to-blue-500',
    },
    {
      icon: Users,
      value: '50+',
      label: 'Research Collaborations',
      description: 'Partnerships with leading universities',
      color: 'from-blue-500 to-violet-500',
    },
    {
      icon: Award,
      value: '15+',
      label: 'Industry Awards',
      description: 'Recognition for innovation excellence',
      color: 'from-violet-500 to-cyan-400',
    },
    {
      icon: Zap,
      value: '&lt;10ms',
      label: 'Real-time Processing',
      description: 'Lightning-fast inference speeds',
      color: 'from-cyan-400 to-emerald-500',
    },
  ];

  return (
    <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Our <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Impact</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Driving innovation through measurable results and industry-leading performance
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.05 }}
              className="group"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent mb-2"
                  >
                    {stat.value}
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{stat.label}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{stat.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
