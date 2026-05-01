import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Brain, BarChart3, Upload } from 'lucide-react';
import Hero from '../components/Hero';
import { useAuth } from '../contexts/AuthContext';

const fadeUp = (delay = 0) => ({
  initial:     { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport:    { once: true, margin: '-80px' },
  transition:  { duration: 0.55, delay },
});

// ── Main export ───────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth();
  
  return (
    <div className="bg-black text-white">
      <Hero />
      
      {/* ─── Ultra Simple Feature Highlights ─── */}
      <section className="py-24 max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-center items-start">
        <motion.div {...fadeUp(0)} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Upload className="w-6 h-6 text-cyan-400" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-3">1. Upload Video</h3>
          <p className="text-gray-400 leading-relaxed text-sm">Drop raw surveillance footage instantly. Support for all major encodings and sizes.</p>
        </motion.div>
        
        <motion.div {...fadeUp(0.1)} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Brain className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-3">2. AI Processing</h3>
          <p className="text-gray-400 leading-relaxed text-sm">Six highly-specialized ML models analyze frames and audio simultaneously.</p>
        </motion.div>
        
        <motion.div {...fadeUp(0.2)} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-3">3. Final Report</h3>
          <p className="text-gray-400 leading-relaxed text-sm">Get precise insight into risks, transcripts, and anomalies via the digital ledger.</p>
        </motion.div>
      </section>

      {/* ─── Minimal CTA ─── */}
      <section className="py-32 relative text-center px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent pointer-events-none" />
        <motion.div {...fadeUp(0)} className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">Ready to secure the unseen?</h2>
          <p className="text-gray-400 text-lg mb-10">Start analyzing videos securely, locally, and effortlessly without GPU dependencies.</p>
          {user ? (
            <Link to="/dashboard">
              <button className="flex items-center gap-2 bg-white text-black px-10 py-4 rounded-full font-bold tracking-wide hover:scale-105 hover:bg-gray-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                Enter Application <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          ) : (
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signup' } }))} className="flex items-center gap-2 bg-white text-black px-10 py-4 rounded-full font-bold tracking-wide hover:scale-105 hover:bg-gray-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      </section>
    </div>
  );
}
