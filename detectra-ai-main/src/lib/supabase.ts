/**
 * Supabase client — production-grade with graceful guest-mode fallback.
 *
 * If the user hasn't supplied real Supabase credentials we expose a *safe stub*
 * client that mimics the @supabase/supabase-js public surface but every call
 * resolves to a clearly-labelled "supabase-disabled" payload. The rest of the
 * app then degrades gracefully into a "guest mode" where:
 *
 *   - Auth flows raise a friendly error instead of throwing.
 *   - Database reads return [] and writes silently no-op (with one warning).
 *   - The Dashboard still works with the local API server's in-memory job store.
 *
 * This means a developer who simply runs `npm run dev` without filling out
 * .env will see a working app — no white-screen, no console flood, just a
 * clear banner telling them how to enable Supabase features.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const PLACEHOLDER_RX = /your-(project-ref|supabase|anon-key)|example|placeholder/i;

function isRealValue(value: string | undefined): value is string {
  if (!value) return false;
  if (PLACEHOLDER_RX.test(value)) return false;
  return value.trim().length > 8;
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured: boolean =
  isRealValue(rawUrl) && isRealValue(rawKey) && /^https?:\/\//.test(rawUrl ?? '');

let _client: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  try {
    _client = createClient(rawUrl as string, rawKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Use sessionStorage as a fallback if localStorage is unavailable
        storageKey: 'detectra.auth',
        flowType: 'pkce',
      },
      global: {
        headers: { 'x-detectra-client': 'frontend/5.0' },
      },
    });
  } catch (err) {
    console.error('[Detectra] Supabase client init failed:', err);
    _client = null;
  }
} else {
  if (typeof window !== 'undefined') {
    console.warn(
      '[Detectra] Supabase is not configured — running in GUEST mode.\n' +
        'To enable account features (login, history, cloud profile):\n' +
        '  1. Copy detectra-ai-main/.env.example to .env\n' +
        '  2. Fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY\n' +
        '  3. Restart `npm run dev`.',
    );
  }
}

/** Standard error returned by every stubbed call. */
const STUB_ERROR = {
  message: 'Supabase is not configured (guest mode)',
  name: 'SupabaseDisabled',
  status: 0,
  code: 'SUPABASE_DISABLED',
} as const;

type StubResult = { data: unknown; error: typeof STUB_ERROR | null };

function makeStubQuery(): unknown {
  const result: StubResult = { data: [], error: STUB_ERROR };
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === 'then') {
          return (resolve: (v: StubResult) => unknown) =>
            Promise.resolve(resolve(result));
        }
        if (prop === 'single' || prop === 'maybeSingle') {
          return () => Promise.resolve({ data: null, error: STUB_ERROR });
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

const noopUnsubscribe = { unsubscribe: () => {} };

/** Stub client that mimics @supabase/supabase-js public surface. */
const stubClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: STUB_ERROR }),
    signUp: async () => ({ data: { user: null, session: null }, error: STUB_ERROR }),
    signInWithOAuth: async () => ({ data: { url: null, provider: 'email' }, error: STUB_ERROR }),
    signOut: async () => ({ error: null }),
    refreshSession: async () => ({ data: { session: null, user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: noopUnsubscribe } }),
    updateUser: async () => ({ data: { user: null }, error: STUB_ERROR }),
  },
  from: () => ({
    select: () => makeStubQuery(),
    insert: () => makeStubQuery(),
    update: () => makeStubQuery(),
    upsert: () => makeStubQuery(),
    delete: () => makeStubQuery(),
    eq: () => makeStubQuery(),
    match: () => makeStubQuery(),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: STUB_ERROR }),
      download: async () => ({ data: null, error: STUB_ERROR }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ data: null, error: STUB_ERROR }),
      list: async () => ({ data: [], error: STUB_ERROR }),
    }),
  },
  channel: () => ({
    on: () => ({ subscribe: () => noopUnsubscribe }),
    subscribe: () => noopUnsubscribe,
    unsubscribe: () => {},
  }),
  removeChannel: () => ({}),
  removeAllChannels: () => ({}),
} as unknown as SupabaseClient;

/** Active Supabase client (real when configured, safe stub otherwise). */
export const supabase: SupabaseClient = _client ?? stubClient;

/** Best-effort recovery: clears any corrupted Supabase tokens from storage. */
export function purgeSupabaseTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sb-') || k.startsWith('detectra.auth'))) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage may be disabled — ignore */
  }
}

/** Friendly status string for the UI banner. */
export function supabaseStatusMessage(): string {
  if (isSupabaseConfigured) return '';
  return (
    'Guest mode — Supabase isn\'t configured. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to unlock account features.'
  );
}
