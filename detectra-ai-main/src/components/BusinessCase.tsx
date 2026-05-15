import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { TrendingUp, DollarSign, Users, Shield, Zap, Target, BarChart3, Globe } from 'lucide-react';

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

  const businessModel = [
    {
      tier: 'Starter',
      price: '$99/month',
      features: ['Basic video analysis', 'Standard dashboard', 'Email support'],
      target: 'Small businesses',
    },
    {
      tier: 'Professional',
      price: '$299/month',
      features: ['Advanced analytics', 'Custom dashboards', 'Priority support', 'API access'],
      target: 'Medium enterprises',
    },
    {
      tier: 'Enterprise',
      price: 'Custom',
      features: ['Full customization', 'On-premise deployment', '24/7 support', 'Training'],
      target: 'Large organizations',
    },
  ];

  const revenueProjections = [
    { year: '2026', revenue: '$50K', users: '100' },
    { year: '2027', revenue: '$250K', users: '500' },
    { year: '2028', revenue: '$750K', users: '1,500' },
    { year: '2029', revenue: '$2M', users: '5,000' },
    { year: '2030', revenue: '$5M', users: '10,000' },
  ];

  return (
    <section id="business-case" className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Business <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Case</span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 mx-auto mb-8" />
          <p className="text-gray-300 text-lg sm:text-xl max-w-3xl mx-auto">
            Comprehensive business case for Detectra AI investment and market opportunity
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {marketOpportunity.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-3xl blur-xl" />
            
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
              <h3 className="text-2xl font-bold text-white mb-6">Target Markets</h3>
              
              <div className="space-y-6">
                {targetMarkets.map((market, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                    className="p-6 bg-white/10 rounded-xl border border-cyan-500/20"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-white font-semibold">{market.industry}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        market.opportunity === 'High' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {market.opportunity}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-300 text-sm">Market Size</span>
                      <span className="text-cyan-400 font-semibold">{market.marketSize}</span>
                    </div>
                    
                    <p className="text-gray-300 text-sm">{market.useCase}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-600/10 rounded-3xl blur-xl" />
            
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
              <h3 className="text-2xl font-bold text-white mb-6">Competitive Advantages</h3>
              
              <div className="space-y-6">
                {competitiveAdvantages.map((advantage, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                    className="flex items-start gap-4 p-4 bg-white/10 rounded-xl border border-cyan-500/20"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <advantage.icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-white font-semibold mb-2">{advantage.title}</h4>
                      <p className="text-gray-300 text-sm mb-2">{advantage.description}</p>
                      <span className="text-cyan-400 text-xs font-semibold">{advantage.benefit}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-cyan-600/10 rounded-3xl blur-xl" />
            
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
              <h3 className="text-2xl font-bold text-white mb-6">Business Model</h3>
              
              <div className="space-y-6">
                {businessModel.map((tier, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 1.0 + index * 0.1 }}
                    className="p-6 bg-white/10 rounded-xl border border-cyan-500/20"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-white font-semibold text-lg">{tier.tier}</h4>
                      <span className="text-cyan-400 font-bold text-xl">{tier.price}</span>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-4">{tier.target}</p>
                    
                    <ul className="space-y-2">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-3 text-gray-300 text-sm">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 1.0 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-3xl blur-xl" />
            
            <div className="relative p-8 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
              <h3 className="text-2xl font-bold text-white mb-6">Revenue Projections</h3>
              
              <div className="space-y-4">
                {revenueProjections.map((projection, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 1.2 + index * 0.1 }}
                    className="flex justify-between items-center p-4 bg-white/10 rounded-xl border border-cyan-500/20"
                  >
                    <span className="text-white font-semibold">{projection.year}</span>
                    <div className="flex gap-8">
                      <span className="text-cyan-400 font-semibold">{projection.revenue}</span>
                      <span className="text-gray-300">{projection.users} users</span>
                    </div>
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
