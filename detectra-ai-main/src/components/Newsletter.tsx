import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function Newsletter() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    
    // Simulate API call
    setTimeout(() => {
      if (email.includes('@')) {
        setStatus('success');
        setMessage('Thank you for subscribing! You\'ll receive our latest updates soon.');
        setEmail('');
      } else {
        setStatus('error');
        setMessage('Please enter a valid email address.');
      }
    }, 1000);
  };

  return (
    <section className="py-20 sm:py-32 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-3xl blur-xl" />
            
            <div className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20">
              <motion.div
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8"
              >
                <Mail className="w-10 h-10 text-white" />
              </motion.div>
              
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
                Stay <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Updated</span>
              </h2>
              
              <p className="text-gray-300 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
                Get the latest insights, research breakthroughs, and product updates from Detecra AI delivered to your inbox.
              </p>
              
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-6 py-4 bg-white/10 border border-cyan-500/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                      required
                    />
                  </div>
                  
                  <motion.button
                    type="submit"
                    disabled={status === 'loading'}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Subscribe
                      </>
                    )}
                  </motion.button>
                </div>
                
                {message && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 flex items-center justify-center gap-2 ${
                      status === 'success' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {status === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm">{message}</span>
                  </motion.div>
                )}
              </form>
              
              <p className="text-gray-400 text-sm mt-6">
                Join 10,000+ researchers and industry professionals. Unsubscribe anytime.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
