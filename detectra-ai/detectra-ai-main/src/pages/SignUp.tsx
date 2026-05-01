import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Lock, User, UserPlus, AlertCircle, CheckCircle,
  Eye, EyeOff, Check, Github,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/SEO';

export default function SignUp() {
  const [fullName, setFullName]                   = useState('');
  const [email, setEmail]                         = useState('');
  const [password, setPassword]                   = useState('');
  const [confirmPassword, setConfirmPassword]     = useState('');
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirm, setShowConfirm]             = useState(false);
  const [error, setError]                         = useState<string | null>(null);
  const [success, setSuccess]                     = useState(false);
  const [loading, setLoading]                     = useState(false);
  const [socialLoading, setSocialLoading]         = useState<string | null>(null);
  const { signUp, signInWithProvider }            = useAuth();
  const navigate                                  = useNavigate();
  const location                                  = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (from && from !== '/signup') sessionStorage.setItem('oauth_redirect_path', from);
  }, [from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address'); return; }
    if (fullName.trim().length < 2) { setError('Full name must be at least 2 characters'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const { error } = await signUp(email.trim(), password, fullName.trim());
      if (error) {
        let msg = error.message || 'Failed to create account.';
        if (msg.includes('User already registered')) msg = 'An account with this email already exists. Please sign in.';
        else if (msg.includes('Password')) msg = 'Password does not meet requirements. Please choose a stronger password.';
        setError(msg);
        setLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/signin', { state: { from: { pathname: from } } }), 2000);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    setError(null);
    const { error } = await signInWithProvider(provider);
    if (error) {
      setError(error.message || `Failed to sign up with ${provider}`);
      setSocialLoading(null);
    }
  };

  const pwMatch = confirmPassword && password === confirmPassword;
  const pwMismatch = confirmPassword && password !== confirmPassword;

  return (
    <>
      <SEO title="Sign Up — Detectra AI" description="Create a Detectra AI account to access the full multimodal video analysis pipeline." />
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-transparent">

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(34,211,238,0.06)_0%,transparent_60%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-md"
        >
          <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-8">

            {/* Header */}
            <div className="text-center mb-7">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/25">
                <span className="text-white font-bold text-2xl">D</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
              <p className="text-gray-500 text-sm">Join Detectra AI — free forever</p>
            </div>

            {/* Social auth */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocial('google')}
                disabled={!!socialLoading || loading}
                className="flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-gray-700 border border-white/20 hover:border-gray-600 rounded-xl text-gray-300 hover:text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {socialLoading === 'google'
                  ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                }
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSocial('github')}
                disabled={!!socialLoading || loading}
                className="flex items-center justify-center gap-2 py-2.5 bg-white/10 hover:bg-gray-700 border border-white/20 hover:border-gray-600 rounded-xl text-gray-300 hover:text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {socialLoading === 'github'
                  ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  : <Github className="w-4 h-4" />
                }
                GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white/5 backdrop-blur-md text-gray-600">or continue with email</span>
              </div>
            </div>

            {/* Alerts */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-2.5 p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-300 text-sm font-semibold">Account created!</p>
                  <p className="text-green-400/70 text-xs mt-0.5">Redirecting to sign in…</p>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors text-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && password.length < 6 && (
                  <p className="mt-1 text-xs text-gray-600">Must be at least 6 characters</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors text-sm"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwMatch && (
                  <p className="mt-1 text-xs text-green-500 flex items-center gap-1"><Check className="w-3 h-3" />Passwords match</p>
                )}
                {pwMismatch && (
                  <p className="mt-1 text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Passwords do not match</p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={loading || success}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating account…</>
                  : <><UserPlus className="w-4 h-4" />Create Account</>
                }
              </motion.button>
            </form>

            {/* Footer */}
            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/signin"
                state={{ from: location.state }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-gray-700">
            Final Year Project · University of Central Punjab · BSAI 2025–2026
          </p>
        </motion.div>
      </div>
    </>
  );
}
