import { motion } from 'framer-motion';
import { Github, Linkedin, Mail, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Home',          to: '/' },
  { label: 'FYP Project',   to: '/fyp-project' },
  { label: 'Timeline',      to: '/timeline' },
  { label: 'Research',      to: '/research' },
  { label: 'Team',          to: '/team' },
  { label: 'Business Case', to: '/business-case' },
];

const PLATFORM_LINKS = [
  { label: 'Live Demo',    to: '/demo' },
  { label: 'Dashboard',    to: '/dashboard' },
  { label: 'Pricing',      to: '/pricing' },
  { label: 'Architecture', to: '/architecture' },
  { label: 'AI Pipeline',  to: '/pipeline' },
  { label: 'Sign In',      to: '/signin' },
  { label: 'Sign Up',      to: '/signup' },
  { label: 'Contact',      to: '/contact' },
];

export default function Footer() {
  return (
    <footer className="relative bg-gray-900 border-t border-gray-800">
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-10">

          {/* ── Brand ── */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              <div>
                <p className="text-white font-bold text-lg leading-none">Detectra AI</p>
                <p className="text-cyan-400 text-xs mt-0.5">by Nexariza AI</p>
              </div>
            </div>

            <p className="text-gray-500 text-sm leading-relaxed max-w-sm mb-5">
              A multimodal video intelligence platform that fuses visual, audio, and speech
              understanding into a single analysis pipeline — built as an FYP at the
              University of Central Punjab under Dr. Usman Aamer.
            </p>

            <div className="flex items-center gap-1.5 mb-5">
              <Shield className="w-3.5 h-3.5 text-cyan-500" />
              <span className="text-gray-600 text-xs">No GPU required · CPU-optimised inference</span>
            </div>

            <div className="flex gap-3">
              {[
                { icon: Github,   href: 'https://github.com',                  label: 'GitHub'   },
                { icon: Linkedin, href: 'https://linkedin.com',                label: 'LinkedIn' },
                { icon: Mail,     href: 'mailto:mianahmadyasin3@gmail.com',    label: 'Email'    },
              ].map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  href={href}
                  target={href.startsWith('http') ? '_blank' : undefined}
                  rel="noreferrer"
                  aria-label={label}
                  className="p-2.5 bg-gray-800 border border-gray-700 rounded-xl hover:border-cyan-500/40 hover:bg-gray-700 transition-all"
                >
                  <Icon className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* ── Navigation ── */}
          <div className="md:col-span-3">
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase">Navigation</h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-gray-500 hover:text-cyan-400 transition-colors text-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Platform ── */}
          <div className="md:col-span-4">
            <h4 className="text-white font-semibold text-sm mb-4 tracking-wide uppercase">Platform</h4>
            <ul className="space-y-2.5 mb-6">
              {PLATFORM_LINKS.map(({ label, to }) => (
                <li key={label}>
                  <Link
                    to={to}
                    className="text-gray-500 hover:text-cyan-400 transition-colors text-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="p-4 bg-gray-800/60 border border-gray-700 rounded-xl">
              <p className="text-xs text-gray-600 mb-1">Supervised by</p>
              <p className="text-white text-sm font-medium">Dr. Usman Aamer</p>
              <p className="text-gray-500 text-xs">Director FOIT · University of Central Punjab</p>
            </div>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm">
            © 2026 Detectra AI · Built by{' '}
            <a href="https://ucp.edu.pk" target="_blank" rel="noreferrer" className="text-cyan-500 hover:text-cyan-400 transition-colors">
              Nexariza AI
            </a>
          </p>
          <span className="text-gray-700 text-xs">BSAI Final Year Project · 2025–2026 · University of Central Punjab</span>
        </div>
      </div>
    </footer>
  );
}
