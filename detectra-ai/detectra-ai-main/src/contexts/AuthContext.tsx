/**
 * AuthContext — production-grade Supabase auth with guest-mode fallback.
 *
 * Stability features:
 *   - Skips Supabase entirely when not configured (no loading hang, no errors).
 *   - Recovers from corrupted session tokens automatically.
 *   - Refreshes the session on window focus and when going back online,
 *     so a user who left the tab open overnight isn't silently logged out
 *     until their next API call.
 *   - `signOut()` clears React state first, then revokes the server session
 *     in the background, then *navigates* (without a full reload) so the
 *     React tree stays mounted.
 *   - Profile creation is idempotent and retries on transient failures.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, purgeSupabaseTokens } from '../lib/supabase';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  github_username: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthError {
  message: string;
}

interface AuthResponse {
  error: AuthError | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  /** True when the user is using the app without Supabase configured. */
  isGuest: boolean;
  /** True when Supabase is properly configured (env vars present). */
  isSupabaseEnabled: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signInWithProvider: (
    provider: 'google' | 'github' | 'facebook' | 'twitter',
  ) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<AuthResponse>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_ERROR: AuthError = {
  message:
    'Account features are disabled — Supabase is not configured. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart.',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const mountedRef = useRef(true);
  const profileLoadingFor = useRef<string | null>(null);

  // ── Profile management ──────────────────────────────────────────────────
  const fetchOrCreateProfile = useCallback(async (userId: string): Promise<void> => {
    if (!isSupabaseConfigured) return;
    // Prevent concurrent loads for the same user
    if (profileLoadingFor.current === userId) return;
    profileLoadingFor.current = userId;

    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (existing && !fetchErr) {
        if (mountedRef.current) setProfile(existing as UserProfile);
        return;
      }
      // PGRST116 = "not found" — create the profile
      if (fetchErr && fetchErr.code !== 'PGRST116') {
        console.warn('[Auth] fetchProfile error:', fetchErr.message);
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const u = userData.user;
      const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
      const fullName =
        meta.full_name || meta.name || meta.preferred_username || u.email?.split('@')[0] || null;
      const avatarUrl = meta.avatar_url || meta.picture || null;
      const githubUsername = meta.user_name || meta.preferred_username || null;

      // Retry with backoff in case the auth row hasn't fully propagated yet
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data: created, error: insertErr } = await supabase
          .from('user_profiles')
          .upsert(
            {
              id: userId,
              email: u.email ?? null,
              full_name: fullName,
              avatar_url: avatarUrl,
              github_username: githubUsername,
            },
            { onConflict: 'id' },
          )
          .select()
          .single();

        if (created && !insertErr) {
          if (mountedRef.current) setProfile(created as UserProfile);
          return;
        }
        if (insertErr && insertErr.code !== '23505') {
          console.warn(
            `[Auth] profile upsert attempt ${attempt + 1}/3 failed:`,
            insertErr.message,
          );
        }
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    } catch (err) {
      console.warn('[Auth] fetchOrCreateProfile threw:', err);
    } finally {
      profileLoadingFor.current = null;
    }
  }, []);

  // ── Bootstrap + auth state listener ─────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;

    // Initial session probe
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('[Auth] getSession error:', error.message);
          purgeSupabaseTokens();
          setLoading(false);
          return;
        }
        const sess = data?.session ?? null;
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);
        if (sess?.user) fetchOrCreateProfile(sess.user.id);
      })
      .catch((err) => {
        console.error('[Auth] getSession threw:', err);
        if (!cancelled) {
          purgeSupabaseTokens();
          setLoading(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((event, sess) => {
      if (!mountedRef.current) return;
      try {
        setSession(sess);
        setUser(sess?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && sess?.user) {
          fetchOrCreateProfile(sess.user.id);
          // OAuth-only redirect (email/password is handled by SignIn.tsx)
          const provider = sess.user.app_metadata?.provider;
          if (provider && provider !== 'email') {
            const savedPath = sessionStorage.getItem('oauth_redirect_path');
            sessionStorage.removeItem('oauth_redirect_path');
            sessionStorage.removeItem('oauth_origin');
            if (savedPath && savedPath !== window.location.pathname) {
              setTimeout(() => {
                window.location.href = `${window.location.origin}${savedPath}`;
              }, 80);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          sessionStorage.removeItem('oauth_redirect_path');
        } else if (event === 'TOKEN_REFRESHED' && sess?.user) {
          // Token refreshed silently — nothing to do besides keeping state in sync
        } else if (event === 'USER_UPDATED' && sess?.user) {
          fetchOrCreateProfile(sess.user.id);
        }
      } catch (err) {
        console.error('[Auth] state change handler threw:', err);
      }
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      data.subscription.unsubscribe();
    };
  }, [fetchOrCreateProfile]);

  // ── Focus / online: refresh session so long-idle tabs stay logged in ────
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const refresh = () => {
      // Fire-and-forget — keep React state in sync via onAuthStateChange
      supabase.auth
        .refreshSession()
        .catch((err) => console.warn('[Auth] refreshSession failed:', err?.message ?? err));
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const onOnline = () => refresh();

    window.addEventListener('focus', refresh);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // ── Auth actions ────────────────────────────────────────────────────────
  const signUp = useCallback<AuthContextType['signUp']>(async (email, password, fullName) => {
    if (!isSupabaseConfigured) return { error: GUEST_ERROR };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/signin`,
        },
      });
      if (error) return { error };
      if (data.user) {
        // Best-effort profile creation; safe to fail if email confirmation is required
        await supabase
          .from('user_profiles')
          .insert({ id: data.user.id, email, full_name: fullName })
          .then(({ error: pe }) => {
            if (pe && pe.code !== '23505') {
              console.warn('[Auth] post-signup profile insert deferred:', pe.message);
            }
          });
      }
      return { error: null };
    } catch (err: unknown) {
      console.error('[Auth] signUp threw:', err);
      return {
        error: {
          message: err instanceof Error ? err.message : 'Sign up failed. Please try again.',
        },
      };
    }
  }, []);

  const signIn = useCallback<AuthContextType['signIn']>(async (email, password) => {
    if (!isSupabaseConfigured) return { error: GUEST_ERROR };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) return { error: null };
      let message = error.message;
      if (/Invalid login credentials/i.test(message)) {
        message = 'Invalid email or password. Please try again.';
      } else if (/Email not confirmed/i.test(message)) {
        message = 'Please verify your email address. Check your inbox for a confirmation link.';
      } else if (/Too many requests/i.test(message)) {
        message = 'Too many login attempts. Please wait a moment and try again.';
      }
      return { error: { ...error, message } };
    } catch (err: unknown) {
      console.error('[Auth] signIn threw:', err);
      return {
        error: {
          message: err instanceof Error ? err.message : 'Sign in failed. Please try again.',
        },
      };
    }
  }, []);

  const signInWithProvider = useCallback<AuthContextType['signInWithProvider']>(
    async (provider) => {
      if (!isSupabaseConfigured) return { error: GUEST_ERROR };
      try {
        const savedPath = sessionStorage.getItem('oauth_redirect_path');
        const candidatePath =
          savedPath ||
          (['/signin', '/signup'].includes(window.location.pathname)
            ? '/analyze'
            : window.location.pathname);
        const redirectUrl = `${window.location.origin}${candidatePath}`;
        if (!savedPath) sessionStorage.setItem('oauth_redirect_path', candidatePath);
        sessionStorage.setItem('oauth_origin', window.location.origin);

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
            queryParams:
              provider === 'google'
                ? { access_type: 'offline', prompt: 'consent' }
                : undefined,
          },
        });
        if (error) {
          sessionStorage.removeItem('oauth_redirect_path');
          let message = error.message;
          if (/popup_closed_by_user/i.test(message)) message = 'Sign-in was cancelled.';
          else if (/OAuth provider not enabled/i.test(message)) {
            message = `${provider} sign-in is not configured in Supabase.`;
          } else if (/redirect_uri_mismatch/i.test(message)) {
            message = 'OAuth configuration error — redirect URL mismatch.';
          }
          return { error: { ...error, message } };
        }
        return { error: null };
      } catch (err: unknown) {
        sessionStorage.removeItem('oauth_redirect_path');
        console.error('[Auth] signInWithProvider threw:', err);
        return {
          error: {
            message:
              err instanceof Error ? err.message : `Failed to sign in with ${provider}.`,
          },
        };
      }
    },
    [],
  );

  const signOut = useCallback<AuthContextType['signOut']>(async () => {
    // 1. Clear React state first so the UI updates immediately
    setSession(null);
    setUser(null);
    setProfile(null);

    // 2. Revoke server session in the background with a hard 1.5s budget
    if (isSupabaseConfigured) {
      Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ]).catch((err) =>
        console.warn('[Auth] server signOut timed out or failed:', err?.message ?? err),
      );
    }

    // 3. Best-effort token cleanup
    purgeSupabaseTokens();
    sessionStorage.removeItem('oauth_redirect_path');
    sessionStorage.removeItem('oauth_origin');
  }, []);

  const updateProfile = useCallback<AuthContextType['updateProfile']>(
    async (updates) => {
      if (!isSupabaseConfigured) return { error: GUEST_ERROR };
      if (!user) return { error: { message: 'No user logged in' } };

      const merged = {
        id: user.id,
        email: user.email ?? profile?.email ?? null,
        full_name: updates.full_name !== undefined ? updates.full_name : profile?.full_name ?? null,
        github_username:
          updates.github_username !== undefined
            ? updates.github_username
            : profile?.github_username ?? null,
        avatar_url:
          updates.avatar_url !== undefined ? updates.avatar_url : profile?.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(merged, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[Auth] updateProfile:', error.message, error.code, error.details);
        return {
          error: {
            message:
              error.code === '42501'
                ? 'Permission denied — check Row Level Security policies for user_profiles.'
                : error.message || 'Failed to save profile',
          },
        };
      }
      if (data) setProfile(data as UserProfile);
      return { error: null };
    },
    [user, profile],
  );

  const refreshSession = useCallback<AuthContextType['refreshSession']>(async () => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.refreshSession();
    } catch (err) {
      console.warn('[Auth] manual refreshSession failed:', err);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      loading,
      isGuest: !isSupabaseConfigured,
      isSupabaseEnabled: isSupabaseConfigured,
      signUp,
      signIn,
      signInWithProvider,
      signOut,
      updateProfile,
      refreshSession,
    }),
    [
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signInWithProvider,
      signOut,
      updateProfile,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
