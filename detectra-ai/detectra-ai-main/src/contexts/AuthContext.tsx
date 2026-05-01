import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signInWithProvider: (provider: 'google' | 'github' | 'facebook' | 'twitter') => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        // Do not block the app while profile loads
        setLoading(false);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        }
      })
      .catch((error) => {
        console.error('Exception getting session:', error);
        if (mounted) {
          setLoading(false);
        }
      });

    // Listen for auth changes (including OAuth callbacks)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        // Handle different auth events
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          // App should be interactive even if profile is still fetching
          setLoading(false);
          if (session?.user) {
            await fetchUserProfile(session.user.id);

            // Only redirect via window.location.href for OAuth providers.
            // Email/password logins use React Router navigate() in SignIn.tsx,
            // which avoids a full-page reload and the race condition it causes.
            if (event === 'SIGNED_IN') {
              const savedPath = sessionStorage.getItem('oauth_redirect_path');
              const savedOrigin = sessionStorage.getItem('oauth_origin');
              const provider = session?.user?.app_metadata?.provider;
              const isOAuth = provider && provider !== 'email';

              // Always clean up the saved paths
              sessionStorage.removeItem('oauth_redirect_path');
              sessionStorage.removeItem('oauth_origin');

              if (isOAuth && savedPath) {
                const redirectUrl = savedOrigin
                  ? `${savedOrigin}${savedPath}`
                  : `${window.location.origin}${savedPath}`;

                if (window.location.hostname !== 'localhost' && redirectUrl.includes('localhost')) {
                  window.location.href = `${window.location.origin}${savedPath}`;
                } else {
                  setTimeout(() => {
                    window.location.href = redirectUrl;
                  }, 100);
                }
              }
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          // Clear OAuth redirect path on sign out
          sessionStorage.removeItem('oauth_redirect_path');
        } else {
          // Handle other events (SIGNED_UP, USER_UPDATED, etc.)
          setSession(session);
          setUser(session?.user ?? null);
          // Do not block the app while profile loads
          setLoading(false);
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          } else {
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      // First, try to fetch existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - we'll create profile if it doesn't exist
        // Other errors are logged but we still try to create profile
        console.warn('Error fetching profile:', error.message);
      }

      if (data) {
        setProfile(data);
        setLoading(false);
        return;
      }

      // Profile doesn't exist, create it
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        // Extract name from user metadata (for social auth)
        const fullName = userData.user.user_metadata?.full_name || 
                        userData.user.user_metadata?.name ||
                        userData.user.user_metadata?.preferred_username ||
                        userData.user.email?.split('@')[0] || 
                        null;
        
        // Extract avatar from social auth
        const avatarUrl = userData.user.user_metadata?.avatar_url || 
                         userData.user.user_metadata?.picture ||
                         null;
        
        // Extract GitHub username if available
        const githubUsername = userData.user.user_metadata?.user_name ||
                              userData.user.user_metadata?.preferred_username ||
                              null;
        // Retry logic for profile creation
        let retries = 3;
        let created = false;

        while (retries > 0 && !created) {
          try {
            const { data: newProfile, error: createError } = await supabase
              .from('user_profiles')
              .insert({
                id: userId,
                email: userData.user.email || null,
                full_name: fullName,
                avatar_url: avatarUrl,
                github_username: githubUsername,
              })
              .select()
              .single();

            if (createError) {
              // If it's a duplicate key error, try to fetch instead
              if (createError.code === '23505') {
                // Profile was created by another process, fetch it
                const { data: fetchedProfile } = await supabase
                  .from('user_profiles')
                  .select('*')
                  .eq('id', userId)
                  .single();
                
                if (fetchedProfile) {
                  setProfile(fetchedProfile);
                  created = true;
                }
              } else {
                retries--;
                if (retries > 0) {
                  // Wait before retry
                  await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                  console.error('Failed to create profile after retries:', createError);
                }
              }
            } else if (newProfile) {
              setProfile(newProfile);
              created = true;
            }
          } catch (err) {
            retries--;
            if (retries === 0) {
              console.error('Exception creating profile:', err);
            } else {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error };
      }

      // If user is created successfully, try to create profile
      if (data.user) {
        // Wait a moment for auth to be fully processed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Try to create profile - this might fail if email confirmation is required
        // In that case, profile will be created on first sign-in
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              email: email,
              full_name: fullName,
            });
          
          if (profileError) {
            // Log but don't fail - profile will be created on sign-in
            console.warn('Profile creation deferred (will be created on sign-in):', profileError.message);
          }
        } catch (err) {
          console.warn('Profile creation deferred (will be created on sign-in):', err);
        }
      }

      return { error: null };
    } catch (err: unknown) {
      console.error('Sign up error:', err);
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'An unexpected error occurred during sign up. Please try again.' 
        } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Provide user-friendly error messages
        let userMessage = error.message;
        
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please verify your email address before signing in. Check your inbox for a confirmation email.';
        } else if (error.message.includes('Too many requests')) {
          userMessage = 'Too many login attempts. Please wait a moment and try again.';
        }

        return { 
          error: { 
            ...error, 
            message: userMessage 
          } 
        };
      }

      // Ensure profile exists after successful sign-in
      if (data.user) {
        // Profile will be fetched/created by fetchUserProfile in onAuthStateChange
        // This is handled automatically by the auth state listener
      }

      return { error: null };
    } catch (err: unknown) {
      console.error('Sign in error:', err);
      return { 
        error: { 
          message: err instanceof Error ? err.message : 'An unexpected error occurred during sign in. Please try again.' 
        } 
      };
    }
  };

  const signInWithProvider = async (provider: 'google' | 'github' | 'facebook' | 'twitter') => {
    try {
      // Get the current path to redirect back after OAuth
      // Use the saved location state or default to /demo
      const savedPath = sessionStorage.getItem('oauth_redirect_path');
      const redirectPath = savedPath || 
        (window.location.pathname === '/signin' || window.location.pathname === '/signup' 
          ? '/demo' 
          : window.location.pathname);

      // Build the redirect URL - ensure it works in both dev and production
      // Never use localhost in production - always use the actual origin
      let redirectUrl = `${window.location.origin}${redirectPath}`;
      
      // Safety check: If we're in production (not localhost), ensure we're not using localhost
      if (window.location.hostname !== 'localhost' && redirectUrl.includes('localhost')) {
        redirectUrl = `${window.location.origin}${redirectPath}`;
      }
      
      // Store the redirect path for use after OAuth callback
      if (!savedPath) {
        sessionStorage.setItem('oauth_redirect_path', redirectPath);
      }
      
      // Also store the full origin to prevent localhost issues
      sessionStorage.setItem('oauth_origin', window.location.origin);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        sessionStorage.removeItem('oauth_redirect_path');
        
        // Provide user-friendly error messages
        let userMessage = error.message;
        if (error.message?.includes('popup_closed_by_user')) {
          userMessage = 'Sign-in was cancelled. Please try again.';
        } else if (error.message?.includes('OAuth provider not enabled')) {
          userMessage = `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not configured. Please contact support.`;
        } else if (error.message?.includes('redirect_uri_mismatch')) {
          userMessage = 'OAuth configuration error. Please contact support.';
        }
        
        return { 
          error: { 
            ...error,
            message: userMessage
          } 
        };
      }

      // OAuth redirects away, so we don't need to handle success here
      // The redirect will happen automatically
      // Profile will be created automatically when user returns via onAuthStateChange
      return { error: null };
    } catch (err: unknown) {
      console.error('Social auth error:', err);
      sessionStorage.removeItem('oauth_redirect_path');
      return { 
        error: { 
          message: err instanceof Error ? err.message : `Failed to sign in with ${provider}. Please try again.` 
        } 
      };
    }
  };

  const signOut = async () => {
    // 1. Kick off backend signout, but do not await (prevents hanging if offline)
    Promise.race([
      supabase.auth.signOut(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))
    ]).catch(err => console.warn('Supabase signout failed or timed out:', err));

    // 2. Guarantee local React state is cleared
    setSession(null);
    setUser(null);
    setProfile(null);

    // 3. Purge LocalStorage and SessionStorage tokens comprehensively
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }

    // 4. Hard redirect to home to flush memory and guarantees routing out of protected zones
    window.location.href = '/';
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: { message: 'No user logged in' } };

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signUp,
        signIn,
        signInWithProvider,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

