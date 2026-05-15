import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Calendar, Edit2, Save, X, LogOut, UserCircle,
  Github, LayoutDashboard, CheckCircle, Activity, AlertTriangle,
  Film, Shield, Clock, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserVideoUploads, videoUrlToJobId, type VideoUpload } from '../lib/supabaseDb';
import SEO from '../components/SEO';

export default function Profile() {
  const { user, profile, loading: authLoading, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing]       = useState(false);
  const [fullName, setFullName]         = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [avatarUrl, setAvatarUrl]       = useState('');
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);
  const [uploads, setUploads]           = useState<VideoUpload[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/signin');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setGithubUsername(profile.github_username || '');
      setAvatarUrl(profile.avatar_url || '');
      setAvatarBroken(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    setUploadsLoading(true);
    getUserVideoUploads(user.id)
      .then(setUploads)
      .catch(() => {})
      .finally(() => setUploadsLoading(false));
  }, [user]);

  const handleSave = async () => {
    setError(null); setSuccess(false); setSaving(true);
    const { error } = await updateProfile({
      full_name: fullName.trim() || null,
      github_username: githubUsername.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });
    if (error) setError(error.message || 'Failed to update profile');
    else { setSuccess(true); setIsEditing(false); setTimeout(() => setSuccess(false), 4000); }
    setSaving(false);
  };

  const handleCancel = () => {
    if (profile) { 
      setFullName(profile.full_name || ''); 
      setGithubUsername(profile.github_username || ''); 
      setAvatarUrl(profile.avatar_url || '');
    }
    setIsEditing(false); setError(null);
  };

  const handleSignOut = async () => { await signOut(); navigate('/'); };

  if (authLoading) return (
    <div className="min-h-screen pt-24 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return null;

  const displayName  = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';
  const memberSince  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const stats = [
    { label: 'Total',       value: uploads.length,                                           icon: Film,          color: 'text-cyan-400',  bg: 'bg-cyan-500/10',  border: 'border-cyan-500/20'  },
    { label: 'Completed',   value: uploads.filter(u => u.status === 'completed').length,      icon: CheckCircle,   color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { label: 'Processing',  value: uploads.filter(u => u.status === 'processing').length,     icon: Activity,      color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/20'  },
    { label: 'Failed',      value: uploads.filter(u => u.status === 'failed').length,         icon: AlertTriangle, color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20'   },
  ];

  return (
    <>
      <SEO title="Profile — Detectra AI" description="Manage your Detectra AI profile and account settings." />
      <div className="min-h-screen pt-24 relative overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ── Header card ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="card-glass p-6 sm:p-8 mb-6">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
                  {profile?.avatar_url && !avatarBroken ? (
                    <img
                      src={profile.avatar_url}
                      alt={displayName}
                      className="w-16 h-16 rounded-2xl object-cover"
                      onError={() => setAvatarBroken(true)}
                    />
                  ) : (
                    <UserCircle className="w-9 h-9 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{displayName}</h1>
                  <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-3.5 h-3.5" />{displayEmail}
                  </p>
                  <p className="text-gray-600 text-xs flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3" />Member since {memberSince}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/analyze">
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm font-medium hover:bg-cyan-500/25 transition-colors">
                    <LayoutDashboard className="w-4 h-4" />Analyzer
                  </motion.div>
                </Link>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors">
                  <LogOut className="w-4 h-4" />Sign Out
                </motion.button>
              </div>
            </div>

            {/* Status pills */}
            <div className="flex flex-wrap gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded-xl text-xs font-medium">
                <Shield className="w-3.5 h-3.5" />FYP Researcher
              </span>
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                user.email_confirmed_at
                  ? 'bg-green-500/10 text-green-400 border-green-500/25'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25'
              }`}>
                <CheckCircle className="w-3.5 h-3.5" />
                {user.email_confirmed_at ? 'Email Verified' : 'Email Pending'}
              </span>
            </div>
          </motion.div>

          {/* ── Profile info ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="card-glass p-6 sm:p-8 mb-6">

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />Profile Information
              </h2>
              {!isEditing ? (
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 text-gray-300 border border-white/20 rounded-xl text-sm hover:bg-gray-700 hover:text-white transition-all">
                  <Edit2 className="w-3.5 h-3.5" />Edit
                </motion.button>
              ) : (
                <div className="flex gap-2">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/15 text-green-400 border border-green-500/30 rounded-xl text-sm hover:bg-green-500/25 transition-colors disabled:opacity-50">
                    <Save className="w-3.5 h-3.5" />{saving ? 'Saving…' : 'Save'}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-gray-400 border border-white/20 rounded-xl text-sm hover:bg-gray-700 transition-colors">
                    <X className="w-3.5 h-3.5" />Cancel
                  </motion.button>
                </div>
              )}
            </div>

            {/* Feedback */}
            {success && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-sm">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />Profile updated successfully!
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
              </motion.div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Full Name */}
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider">Full Name</label>
                {isEditing ? (
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors text-sm"
                    placeholder="Your full name" />
                ) : (
                  <div className="px-4 py-2.5 bg-white/10 rounded-xl text-gray-300 text-sm border border-white/10">
                    {profile?.full_name || <span className="text-gray-600 italic">Not set</span>}
                  </div>
                )}
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3 h-3" />Email
                </label>
                <div className="px-4 py-2.5 bg-white/10 rounded-xl text-gray-500 text-sm border border-white/10 flex items-center justify-between">
                  {displayEmail}
                  <span className="text-gray-700 text-xs">Read-only</span>
                </div>
              </div>

              {/* GitHub */}
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Github className="w-3 h-3" />GitHub Username
                </label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input type="text" value={githubUsername} onChange={e => setGithubUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors text-sm"
                      placeholder="github-username" />
                    <button
                      type="button"
                      onClick={() => setGithubUsername('')}
                      className="px-3 py-2.5 bg-white/10 text-gray-400 border border-white/20 rounded-xl text-xs hover:bg-white/15 hover:text-white transition-colors"
                      title="Clear GitHub username"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 bg-white/10 rounded-xl text-gray-300 text-sm border border-white/10 truncate">
                    {profile?.github_username || <span className="text-gray-600 italic">Not set</span>}
                  </div>
                )}
              </div>

              {/* Avatar URL */}
              <div className="sm:col-span-2">
                <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  Avatar Image URL
                </label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <input type="url" value={avatarUrl} onChange={e => { setAvatarUrl(e.target.value); setAvatarBroken(false); }}
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 transition-colors text-sm"
                      placeholder="https://example.com/avatar.png" />
                    <button
                      type="button"
                      onClick={() => { setAvatarUrl(''); setAvatarBroken(false); }}
                      className="px-3 py-2.5 bg-white/10 text-gray-400 border border-white/20 rounded-xl text-xs hover:bg-white/15 hover:text-white transition-colors"
                      title="Remove avatar URL"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-2.5 bg-white/10 rounded-xl text-gray-300 text-sm border border-white/10 truncate">
                    {profile?.avatar_url || <span className="text-gray-600 italic">Not set</span>}
                  </div>
                )}
              </div>

              {/* Member Since */}
              <div>
                <label className="block text-gray-500 text-xs font-medium mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />Member Since
                </label>
                <div className="px-4 py-2.5 bg-white/10 rounded-xl text-gray-500 text-sm border border-white/10">
                  {memberSince}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Analysis stats ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="card-glass p-6 sm:p-8">

            <h2 className="text-white font-semibold flex items-center gap-2 mb-5">
              <Film className="w-4 h-4 text-cyan-400" />Analysis Activity
            </h2>

            {uploadsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {stats.map(({ label, value, icon: Icon, color, bg, border }) => (
                  <div key={label} className={`${bg} rounded-xl border ${border} p-4`}>
                    <Icon className={`w-4 h-4 ${color} mb-2`} />
                    <p className={`text-2xl font-bold ${color} tabular-nums`}>{value}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {uploads.length === 0 && !uploadsLoading && (
              <p className="text-gray-600 text-sm text-center py-6">
                No videos analyzed yet.{' '}
                <Link to="/analyze" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                  Upload your first video →
                </Link>
              </p>
            )}

            {uploads.length > 0 && (
              <>
                <div className="rounded-xl border border-white/10 overflow-hidden mb-4">
                  <div className="px-4 py-2 bg-white/5 border-b border-white/10 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Saved in your account (Supabase)
                  </div>
                  <ul className="divide-y divide-white/10 max-h-64 overflow-y-auto">
                    {uploads.map(u => {
                      const jid = videoUrlToJobId(u.video_url);
                      if (!jid) return null;
                      const target = u.status === 'completed'
                        ? `/analyze/results/${jid}`
                        : `/analyze/progress/${jid}`;
                      return (
                        <li key={u.id}>
                          <Link
                            to={target}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-sm"
                          >
                            <div className="min-w-0 text-left">
                              <p className="text-white font-medium truncate">{u.title}</p>
                              <p className="text-gray-600 text-xs font-mono truncate">{jid}</p>
                            </div>
                            <span className={`flex-shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                              u.status === 'completed' ? 'text-green-400 border-green-500/30 bg-green-500/10' :
                              u.status === 'failed' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                              'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
                            }`}>
                              {u.status}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/analyze" className="flex-1">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-cyan-500/15 to-blue-600/10 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm font-medium hover:from-cyan-500/25 hover:to-blue-600/20 transition-all w-full">
                      <LayoutDashboard className="w-4 h-4" />Open full analyzer
                    </motion.div>
                  </Link>
                </div>
              </>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}
