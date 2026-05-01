import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Hero() {
  const { user } = useAuth();

  return (
    <section className="relative min-h-[90vh] bg-black text-white flex flex-col items-center justify-center overflow-hidden pt-32 pb-16 px-6">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-5xl mx-auto w-full z-10 text-center flex flex-col items-center">
        
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-8"
        >
          <span className="px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-cyan-300 text-[11px] font-semibold tracking-widest uppercase shadow-2xl">
            Detectra AI V4.1
          </span>
        </motion.div>

        {/* Headlines */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6"
        >
          See everything.<br />
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 text-transparent bg-clip-text">
            Miss nothing.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="max-w-2xl text-gray-400 text-lg md:text-xl font-medium mb-10 leading-relaxed"
        >
          Upload surveillance footage and instantly track threats, analyze audio anomalies, and gain complete intelligence through state-of-the-art multimodal AI.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-20"
        >
          {user ? (
            <Link to="/dashboard">
              <button className="flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:scale-105 hover:bg-gray-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                Open Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          ) : (
            <button onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { mode: 'signup' } }))} className="flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-full font-bold text-sm tracking-wide hover:scale-105 hover:bg-gray-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <Link to="/demo">
            <button className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-8 py-3.5 rounded-full font-semibold text-sm tracking-wide hover:bg-white/10 transition-all backdrop-blur-md">
              <Play className="w-4 h-4 fill-white shrink-0" />
              Watch Demo
            </button>
          </Link>
        </motion.div>

        {/* Cinematic Demo Video Container */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl aspect-video rounded-3xl p-[1px] bg-gradient-to-b from-white/10 to-white/0 shadow-[0_0_80px_rgba(0,0,0,0.8)] filter drop-shadow-[0_20px_50px_rgba(6,182,212,0.15)] group"
        >
          <div className="absolute inset-0 bg-black rounded-3xl overflow-hidden z-0">
            {/* 
              This video src can be replaced with the actual product screencast. 
              Currently pointing to a lightweight abstract tech placeholder video.
            */}
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-1000"
              src="https://cdn.pixabay.com/video/2023/10/22/185799-876110300_large.mp4"
            >
              Your browser does not support the video tag.
            </video>
            
            {/* Top glassmorphic bar indicating a software window frame */}
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/60 to-transparent flex items-center px-4 gap-2 z-10 backdrop-blur-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
              <div className="mx-auto text-[10px] font-mono text-cyan-400 font-semibold tracking-widest uppercase opacity-70">
                Detectra Engine Active
              </div>
            </div>
            
            {/* Bottom glowing reflection inside the container */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cyan-500/20 to-transparent opacity-60 z-10 pointer-events-none mix-blend-screen" />
          </div>
        </motion.div>

      </div>
    </section>
  );
}
