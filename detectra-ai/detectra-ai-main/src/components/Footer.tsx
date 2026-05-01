import { motion } from 'framer-motion';
import { Mail, Github, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative bg-black text-gray-400 py-16 border-t border-white/10 overflow-hidden">
      {/* Soft Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 mb-6 group">
          <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center group-hover:border-cyan-500/50 transition-colors">
            <span className="text-white font-bold text-lg font-serif">D</span>
          </div>
          <span className="text-xl font-bold text-white tracking-wide">Detectra AI</span>
        </Link>
        
        {/* Minimal Navigation */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 mb-10 text-sm font-medium">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link to="/fyp-project" className="hover:text-white transition-colors">Research</Link>
          <Link to="/demo" className="hover:text-white transition-colors">Live Demo</Link>
          <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>

        {/* Socials */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[
            { icon: Mail, href: 'mailto:mianahmadyasin3@gmail.com' },
            { icon: Github, href: '#' },
            { icon: Twitter, href: '#' }
          ].map(({ icon: Icon, href }, idx) => (
            <motion.a
              key={idx}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              href={href}
              className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-cyan-400 transition-all"
            >
              <Icon className="w-4 h-4" />
            </motion.a>
          ))}
        </div>

        {/* Copyright */}
        <div className="text-xs text-gray-600 flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>&copy; {new Date().getFullYear()} Detectra AI. All rights reserved.</span>
          <span className="hidden sm:inline">&middot;</span>
          <span>BSAI Final Year Project &middot; Developed by Nexariza AI</span>
        </div>
      </div>
    </footer>
  );
}
