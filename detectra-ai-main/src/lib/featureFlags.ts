// Feature flag configuration for safe gradual rollout
// Use localStorage override for testing: localStorage.setItem('detecra-features', JSON.stringify({ enhancedErrorRecovery: true }))

import { useState, useEffect } from 'react';

interface FeatureFlags {
  // Enhanced error recovery with local error reporting
  enhancedErrorRecovery: boolean;
  
  // Performance monitoring (opt-in via env var)
  performanceMonitoring: boolean;
  
  // Offline caching for analysis results
  offlineCaching: boolean;
  
  // Enhanced retry logic with exponential backoff
  enhancedRetries: boolean;
  
  // Accessibility improvements
  accessibilityEnhancements: boolean;
  
  // AI assistant improvements
  aiAssistantV2: boolean;
  
  // Real-time anomaly streaming
  realtimeAnomalyStreaming: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enhancedErrorRecovery: import.meta.env.VITE_FEATURE_ERROR_RECOVERY === 'true',
  performanceMonitoring: import.meta.env.VITE_FEATURE_PERF_MONITORING === 'true',
  offlineCaching: import.meta.env.VITE_FEATURE_OFFLINE_CACHE === 'true',
  enhancedRetries: import.meta.env.VITE_FEATURE_ENHANCED_RETRIES !== 'false', // true by default
  accessibilityEnhancements: import.meta.env.VITE_FEATURE_A11Y === 'true',
  aiAssistantV2: false, // Disabled by default - requires opt-in
  realtimeAnomalyStreaming: false, // Disabled by default
};

class FeatureFlagManager {
  private flags: FeatureFlags;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.flags = this.loadFlags();
  }

  private loadFlags(): FeatureFlags {
    try {
      // 1. Check localStorage for overrides (useful for testing)
      const localStorageFlags = localStorage.getItem('detecra-features');
      if (localStorageFlags) {
        const parsed = JSON.parse(localStorageFlags);
        return { ...DEFAULT_FLAGS, ...parsed };
      }

      // 2. Check sessionStorage for temporary overrides
      const sessionFlags = sessionStorage.getItem('detecra-session-features');
      if (sessionFlags) {
        const parsed = JSON.parse(sessionFlags);
        return { ...DEFAULT_FLAGS, ...parsed };
      }

      return DEFAULT_FLAGS;
    } catch (e) {
      console.warn('Failed to load feature flags, using defaults', e);
      return DEFAULT_FLAGS;
    }
  }

  get<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
    return this.flags[key];
  }

  getAll(): FeatureFlags {
    return { ...this.flags };
  }

  set<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K], temporary: boolean = false): void {
    this.flags[key] = value;
    
    if (temporary) {
      // Store in sessionStorage for session persistence
      try {
        const sessionFlags = JSON.parse(sessionStorage.getItem('detecra-session-features') || '{}');
        sessionFlags[key] = value;
        sessionStorage.setItem('detecra-session-features', JSON.stringify(sessionFlags));
      } catch (e) {
        console.warn('Failed to save session feature flag', e);
      }
    } else {
      // Store in localStorage for persistent override
      try {
        const localFlags = JSON.parse(localStorage.getItem('detecra-features') || '{}');
        localFlags[key] = value;
        localStorage.setItem('detecra-features', JSON.stringify(localFlags));
      } catch (e) {
        console.warn('Failed to save feature flag', e);
      }
    }

    this.notifyListeners();
  }

  resetToDefaults(): void {
    this.flags = { ...DEFAULT_FLAGS };
    localStorage.removeItem('detecra-features');
    sessionStorage.removeItem('detecra-session-features');
    this.notifyListeners();
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => cb());
  }

  // Helper to check multiple flags
  check(...keys: Array<keyof FeatureFlags>): boolean {
    return keys.every(key => this.flags[key]);
  }

  // Helper for development mode
  isDev(): boolean {
    return import.meta.env.DEV;
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// React hook for using feature flags
export function useFeatureFlag<K extends keyof FeatureFlags>(key: K): boolean {
  const [enabled, setEnabled] = useState(() => featureFlags.get(key));

  useEffect(() => {
    const unsubscribe = featureFlags.subscribe(() => {
      setEnabled(featureFlags.get(key));
    });
    return unsubscribe;
  }, [key]);

  return enabled;
}

// React hook for using multiple feature flags
export function useFeatureFlags(...keys: Array<keyof FeatureFlags>): boolean {
  const [enabled, setEnabled] = useState(() => featureFlags.check(...keys));

  useEffect(() => {
    const unsubscribe = featureFlags.subscribe(() => {
      setEnabled(featureFlags.check(...keys));
    });
    return unsubscribe;
  }, [keys]);

  return enabled;
}

export type { FeatureFlags };
