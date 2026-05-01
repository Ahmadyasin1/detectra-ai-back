"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { User, Lock, Save, Loader2, Eye, EyeOff, LogOut, Shield } from "lucide-react";
import { authApi } from "@/lib/api";
import { logout } from "@/lib/auth";
import type { User as UserType } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    authApi.me()
      .then((u) => { setUser(u); setFullName(u.full_name); })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setSavingProfile(true);
    try {
      const updated = await authApi.updateMe({ full_name: fullName.trim() });
      setUser(updated);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSavingPassword(true);
    try {
      await authApi.updateMe({ password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed successfully");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await logout();
    toast.success("Signed out");
    router.push("/");
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <User className="w-5 h-5 text-brand-400" />
          Profile
        </h2>

        {user && (
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-border">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
              {user.full_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold text-lg">{user.full_name}</p>
              <p className="text-slate-400 text-sm">{user.email}</p>
              <div className="flex items-center gap-1 mt-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs">Verified account</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="input"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="input opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile || !fullName.trim() || fullName === user?.full_name}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Password */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand-400" />
          Change Password
        </h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input pr-11"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="flex gap-1 mt-2">
                {[8, 12, 16].map((len) => (
                  <div
                    key={len}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      newPassword.length >= len ? "bg-emerald-500" : "bg-surface-border"
                    }`}
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">Minimum 8 characters</p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword || newPassword.length < 8}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {savingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card p-6 border-red-500/20">
        <h2 className="text-lg font-semibold text-white mb-4">Account Actions</h2>
        <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/10">
          <div>
            <p className="text-sm font-medium text-slate-200">Sign out of Detectra AI</p>
            <p className="text-xs text-slate-500 mt-0.5">You will be redirected to the landing page</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
