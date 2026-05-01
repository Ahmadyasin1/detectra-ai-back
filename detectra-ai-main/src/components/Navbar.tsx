import { useState, useEffect, useCallback } from 'react';
import { Menu, X, User, LogOut, LayoutDashboard, ChevronDown, Network, GitBranch, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled]         = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen]   = useState(false);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const location  = useLocation();
  const { user, profile, signOut } = useAuth();
  const navigate  = useNavigate();

  const handleScroll = useCallback(() => { setIsScrolled(window.scrollY > 20); }, []);

  useEffect(() => {
    let ticking = false;
    const throttled = () => {
      if (!ticking) {
        requestAnimationFrame(() => { handleScroll(); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener('scroll', throttled, { passive: true });
    return () => window.removeEventListener('scroll', throttled);
  }, [handleScroll]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (isUserMenuOpen && !(e.target as HTMLElement).closest('.user-menu-container'))
        setIsUserMenuOpen(false);
      if (isSystemMenuOpen && !(e.target as HTMLElement).closest('.system-menu-container'))
        setIsSystemMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isUserMenuOpen, isSystemMenuOpen]);

  const navItems = [
    { label: 'Home',        href: '/' },
    { label: 'FYP Project', href: '/fyp-project' },
    { label: 'Timeline',    href: '/timeline' },
    { label: 'Research',    href: '/research' },
    { label: 'Demo',        href: '/demo' },
    { label: 'Team',        href: '/team' },
    { label: 'Pricing',     href: '/pricing' },
    { label: 'Contact',     href: '/contact' },
  ];

  const systemItems = [
    { label: 'Architecture', href: '/architecture', icon: Network,   desc: '6-layer system design' },
    { label: 'AI Pipeline',  href: '/pipeline',     icon: GitBranch, desc: '9-stage inference pipeline' },
    { label: 'Capabilities', href: '/capabilities', icon: Target,    desc: 'Benchmarks & scope limits' },
  ];

  const isActive = (href: string) => location.pathname === href;

  const navClass = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled
      ? 'bg-gray-950/95 backdrop-blur-md border-b border-gray-800 shadow-[0_1px_30px_rgba(0,0,0,0.5)]'
      : 'bg-transparent'
  }`;

  return (
    <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} className={navClass}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/">
            <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <span className="text-white font-bold text-base">D</span>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-white font-bold text-lg tracking-tight">Detectra AI</span>
                <span className="text-gray-500 text-xs font-medium">by Nexariza AI</span>
              </div>
            </motion.div>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-0.5">
            {navItems.map(item => (
              <Link key={item.label} to={item.href}>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 relative group ${
                    isActive(item.href)
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {item.label}
                  <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-200 ${
                    isActive(item.href) ? 'w-5' : 'w-0 group-hover:w-5'
                  }`} />
                </motion.button>
              </Link>
            ))}

            {/* System dropdown */}
            <div className="relative system-menu-container">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setIsSystemMenuOpen(s => !s)}
                className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  ['/architecture', '/pipeline', '/capabilities'].some(p => location.pathname === p)
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                System
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSystemMenuOpen ? 'rotate-180' : ''}`} />
              </motion.button>
              <AnimatePresence>
                {isSystemMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 mt-1.5 w-56 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden z-50"
                  >
                    {systemItems.map(item => (
                      <Link key={item.label} to={item.href} onClick={() => setIsSystemMenuOpen(false)}>
                        <div className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-800 transition-colors ${
                          isActive(item.href) ? 'bg-cyan-500/10' : ''
                        }`}>
                          <item.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isActive(item.href) ? 'text-cyan-400' : 'text-gray-500'}`} />
                          <div>
                            <p className={`text-sm font-medium ${isActive(item.href) ? 'text-cyan-400' : 'text-gray-300'}`}>{item.label}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Desktop auth area */}
          <div className="hidden lg:flex items-center gap-2">
            {user && (
              <Link to="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive('/dashboard') || location.pathname.startsWith('/dashboard/')
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />Dashboard
                </motion.button>
              </Link>
            )}
            {user ? (
              <div className="relative user-menu-container">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setIsUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl border border-gray-700 transition-all text-sm"
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="max-w-[120px] truncate">{profile?.full_name || user.email?.split('@')[0] || 'Profile'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </motion.button>
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden z-50"
                    >
                      <Link to="/profile" onClick={() => setIsUserMenuOpen(false)}>
                        <div className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm">
                          <User className="w-4 h-4" />My Profile
                        </div>
                      </Link>
                      <Link to="/dashboard" onClick={() => setIsUserMenuOpen(false)}>
                        <div className="flex items-center gap-2 px-4 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm">
                          <LayoutDashboard className="w-4 h-4" />Dashboard
                        </div>
                      </Link>
                      <div className="border-t border-gray-800" />
                      <button
                        onClick={async () => { await signOut(); setIsUserMenuOpen(false); navigate('/'); }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm"
                      >
                        <LogOut className="w-4 h-4" />Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/signin">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-sm"
                >
                  Get Started Free
                </motion.button>
              </Link>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(v => !v)}
            className="lg:hidden text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-xl transition-all"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-gray-950/98 backdrop-blur-md border-b border-gray-800"
          >
            <div className="px-4 py-4 space-y-1">
              {navItems.map(item => (
                <Link key={item.label} to={item.href}>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm ${
                      isActive(item.href)
                        ? 'text-cyan-400 bg-cyan-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {item.label}
                  </button>
                </Link>
              ))}
              <div className="pt-1">
                <p className="px-3 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">System</p>
                {systemItems.map(item => (
                  <Link key={item.label} to={item.href}>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm ${
                        isActive(item.href)
                          ? 'text-cyan-400 bg-cyan-500/10'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />{item.label}
                    </button>
                  </Link>
                ))}
              </div>
              <div className="border-t border-gray-800 pt-2 mt-2 space-y-1">
                {user ? (
                  <>
                    <Link to="/dashboard">
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-cyan-400 hover:bg-cyan-500/10 transition-all text-sm font-medium"
                      >
                        Dashboard
                      </button>
                    </Link>
                    <Link to="/profile">
                      <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all text-sm"
                      >
                        My Profile
                      </button>
                    </Link>
                    <button
                      onClick={async () => { await signOut(); setIsMobileMenuOpen(false); navigate('/'); }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link to="/signin">
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-sm"
                    >
                      Get Started Free
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
