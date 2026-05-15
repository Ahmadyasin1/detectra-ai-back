import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, DollarSign, Users, Shield, Zap, Target, BarChart3, Globe } from 'lucide-react';
import PageHero from '../components/PageHero';

export default function BusinessCase() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const marketOpportunity = [
    {
      icon: BarChart3,
      title: 'Market Size',
      value: '$12.5B',
      description: 'Global video analytics market by 2026',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: TrendingUp,
      title: 'Growth Rate',
      value: '24.8%',
      description: 'Annual growth rate in video analytics',
      color: 'from-cyan-500 to-green-500',
    },
    {
      icon: Users,
      title: 'Target Users',
      value: '500K+',
      description: 'Potential users across industries',
      color: 'from-green-500 to-yellow-500',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      value: '50+',
      description: 'Countries with surveillance needs',
      color: 'from-yellow-500 to-orange-500',
    },
  ];

  const targetMarkets = [
    {
      industry: 'Surveillance & Security',
      marketSize: '$4.2B',
      useCase: 'Real-time threat detection and monitoring',
      opportunity: 'High',
      color: 'from-red-500 to-orange-500',
    },
    {
      industry: 'Sports Analytics',
      marketSize: '$1.8B',
      useCase: 'Performance analysis and player tracking',
      opportunity: 'Medium',
      color: 'from-orange-500 to-yellow-500',
    },
    {
      industry: 'Media Monitoring',
      marketSize: '$2.1B',
      useCase: 'Content analysis and brand monitoring',
      opportunity: 'High',
      color: 'from-yellow-500 to-green-500',
    },
    {
      industry: 'Smart Cities',
      marketSize: '$4.4B',
      useCase: 'Traffic management and urban planning',
      opportunity: 'High',
      color: 'from-green-500 to-cyan-500',
    },
  ];

  const competitiveAdvantages = [
    {
      icon: Shield,
      title: 'Privacy-First Architecture',
      description: 'Complete API-free, self-contained system ensuring data privacy',
      benefit: 'Regulatory compliance and user trust',
    },
    {
      icon: Zap,
      title: 'Real-Time Multimodal Fusion',
      description: 'Advanced transformer-based fusion for contextual understanding',
      benefit: 'Superior accuracy and insights',
    },
    {
      icon: Target,
      title: 'Customizable Modules',
      description: 'Modular architecture allowing industry-specific customization',
      benefit: 'Flexible deployment across sectors',
    },
    {
      icon: DollarSign,
      title: 'Cost-Effective Solution',
      description: 'No ongoing API costs or external dependencies',
      benefit: 'Lower total cost of ownership',
    },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <PageHero
        badge="Market opportunity"
        badgeIcon={TrendingUp}
        title="Business"
        titleAccent="Case"
        description="Comprehensive business case for Detectra AI investment and market opportunity."
      >
        <div className="w-full max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {marketOpportunity.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300 text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent mb-2">
                      {item.value}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-gray-300 text-sm">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </PageHero>

      {/* Target Markets Section */}
      <section className="py-20 sm:py-32 bg-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Target <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Markets</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Key industries and market opportunities for Detectra AI
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {targetMarkets.map((market, index) => (
              <motion.div
                key={market.industry}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white">{market.industry}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        market.opportunity === 'High' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {market.opportunity}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-300 text-sm">Market Size</span>
                      <span className="text-cyan-400 font-semibold">{market.marketSize}</span>
                    </div>
                    
                    <p className="text-gray-300 leading-relaxed">{market.useCase}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Advantages Section */}
      <section ref={ref} className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
              Competitive <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Advantages</span>
            </h2>
            <p className="text-gray-300 text-xl max-w-3xl mx-auto">
              Key differentiators that set Detectra AI apart from competitors
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {competitiveAdvantages.map((advantage, index) => (
              <motion.div
                key={advantage.title}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 hover:border-cyan-500/50 transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <advantage.icon className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-3">{advantage.title}</h3>
                        <p className="text-gray-300 text-sm mb-3 leading-relaxed">{advantage.description}</p>
                        <span className="text-cyan-400 text-xs font-semibold">{advantage.benefit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-950 to-gray-900 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Invest</span>?
            </h2>
            <p className="text-gray-300 text-xl mb-8 max-w-2xl mx-auto">
              Join us in revolutionizing video intelligence with Detectra AI
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/contact">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition-all cursor-pointer"
                >
                  Get in Touch
                </motion.div>
              </Link>

              <Link to="/fyp-project">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-transparent border-2 border-cyan-500 text-cyan-400 rounded-full font-semibold text-lg hover:bg-cyan-500/10 hover:shadow-xl hover:shadow-cyan-500/30 transition-all cursor-pointer"
                >
                  Learn More
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
