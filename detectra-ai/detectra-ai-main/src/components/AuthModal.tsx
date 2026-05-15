import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff, Github, User, UserPlus, CheckCircle, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  
  const { signIn, signUp, signInWithProvider, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Listen to custom events to open the modal programmatically
  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.mode === 'signup') {
        setMode('signup');
      } else {
        setMode('signin');
      }
      setIsOpen(true);
    };

    window.addEventListener('open-auth-modal', handleOpenModal);
    return () => window.removeEventListener('open-auth-modal', handleOpenModal);
  }, []);

  // Set the visited flag when closing the modal or successful auth
  const close = () => {
    localStorage.setItem('detectra_has_visited', 'true');
    setIsOpen(false);
    setError(null);
    setSuccess(false);
  };

  useEffect(() => {
    if (user && isOpen) {
      close();
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { 
      setError('Please enter a valid email address'); 
      return; 
    }

    setLoading(true);

    if (mode === 'signup') {
      if (fullName.trim().length < 2) { setError('Full name must be at least 2 characters'); setLoading(false); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
      if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }

      try {
        const { error } = await signUp(email.trim(), password, fullName.trim());
        if (error) {
          let msg = error.message || 'Failed to create account.';
          if (msg.includes('User already registered')) msg = 'An account with this email already exists.';
          setError(msg);
          setLoading(false);
        } else {
          setSuccess(true);
          setTimeout(() => {
            setMode('signin');
            setSuccess(false);
            setLoading(false);
            setPassword('');
            setConfirmPassword('');
          }, 2000);
        }
      } catch {
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    } else {
      // SignIn Mode
      try {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setError(error.message || 'Failed to sign in. Check your credentials.');
          setLoading(false);
        } else {
          close();
          const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/analyze';
          navigate(from, { replace: true });
        }
      } catch {
        setError('An unexpected error occurred.');
        setLoading(false);
      }
    }
  };

  const handleSocial = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    setError(null);
    try {
      const { error } = await signInWithProvider(provider);
      if (error) {
        setError(error.message || `Failed with ${provider}`);
        setSocialLoading(null);
      }
    } catch {
      setError(`Failed to sign in with ${provider}`);
      setSocialLoading(null);
    }
  };

  const pwMatch = mode === 'signup' && confirmPassword && password === confirmPassword;
  const pwMismatch = mode === 'signup' && confirmPassword && password !== confirmPassword;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-md max-h-[min(92vh,720px)] sm:my-auto overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl"
          >
            <div className="relative bg-[#0d1117] rounded-t-3xl sm:rounded-3xl shadow-[0_0_50px_rgba(34,211,238,0.15)] border border-white/10 p-5 sm:p-8 overflow-hidden pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              
              {/* Background ambient lighting */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[120px] sm:h-[150px] bg-gradient-to-b from-cyan-500/20 to-transparent pointer-events-none rounded-t-[100%]" />
              
              <button onClick={close} className="absolute right-5 top-5 p-1.5 rounded-full bg-white/10 text-gray-400 hover:text-white transition-colors z-10 border border-white/20/50">
                <X className="w-4 h-4" />
              </button>

              <div className="text-center mb-6 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/30">
                  <span className="text-white font-extrabold text-xl font-mono">D</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
                  {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-gray-400 text-xs">
                  {mode === 'signin' ? 'Sign in to use the video analyzer' : 'Join Detectra AI — free forever'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 relative z-10">
                <button type="button" onClick={() => handleSocial('google')} disabled={!!socialLoading || loading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-gray-700 border border-white/20 hover:border-gray-500 rounded-xl text-gray-300 hover:text-white text-xs font-semibold transition-all">
                  {socialLoading === 'google' 
                    ? <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
                  Google
                </button>
                <button type="button" onClick={() => handleSocial('github')} disabled={!!socialLoading || loading}
                  className="flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-gray-700 border border-white/20 hover:border-gray-500 rounded-xl text-gray-300 hover:text-white text-xs font-semibold transition-all">
                  {socialLoading === 'github' 
                    ? <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <Github className="w-3.5 h-3.5" />}
                  GitHub
                </button>
              </div>

              <div className="relative mb-5 z-10">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider"><span className="px-3 bg-[#0d1117] text-gray-600">or with email</span></div>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl relative z-10">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-xs">{error}</p>
                </div>
              )}

              {success && mode === 'signup' && (
                <div className="mb-4 flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl relative z-10">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-300 text-xs font-bold">Account created successfully!</p>
                    <p className="text-green-400/70 text-[10px] mt-0.5">Switching to sign in...</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                {mode === 'signup' && (
                  <div>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-colors group-focus-within:text-cyan-400" />
                      <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Full Name"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:bg-gray-800 transition-all text-sm font-medium" />
                    </div>
                  </div>
                )}

                <div>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-colors group-focus-within:text-cyan-400" />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Email address"
                      className="w-full pl-10 pr-4 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:bg-gray-800 transition-all text-sm font-medium" />
                  </div>
                </div>

                <div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-colors group-focus-within:text-cyan-400" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="Password"
                      className="w-full pl-10 pr-10 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:bg-gray-800 transition-all text-sm font-medium" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <div className="relative group">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-colors group-focus-within:text-cyan-400" />
                      <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Confirm Password"
                        className="w-full pl-10 pr-10 py-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:bg-gray-800 transition-all text-sm font-medium" />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {pwMatch && <p className="mt-1.5 text-[10px] text-green-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><Check className="w-3 h-3" />Passwords match</p>}
                    {pwMismatch && <p className="mt-1.5 text-[10px] text-red-400 uppercase tracking-wider font-bold flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />Passwords do not match</p>}
                  </div>
                )}

                <button type="submit" disabled={loading || success}
                  className="w-full py-3.5 mt-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-[#0d1117] rounded-xl font-bold tracking-wide shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
                  {loading 
                    ? <><Loader className="animate-spin w-4 h-4 mr-1" />Processing</> 
                    : <>{mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />} {mode === 'signin' ? 'Access Account' : 'Initialize Account'}</>}
                </button>
              </form>

              <div className="mt-6 text-center z-10 relative">
                <button type="button" className="text-gray-500 text-xs font-semibold hover:text-cyan-400 transition-colors"
                  onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}>
                  {mode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const Loader = ({ className }: { className: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
