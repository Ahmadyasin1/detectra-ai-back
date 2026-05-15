import { useRef, useCallback, useEffect } from 'react';
import { useFeatureFlag } from './featureFlags';

interface PerformanceMetrics {
  // Component mount time
  mountTimeMs: number;
  
  // Time to interactive
  timeToInteractiveMs: number;
  
  // Render count
  renderCount: number;
  
  // Memory usage (if available)
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
  
  // Custom marks
  marks: Record<string, number>;
}

interface PerformanceEntry {
  name: string;
  entryType: 'mark' | 'measure' | 'component';
  startTime: number;
  duration?: number;
  value?: number;
  metadata?: Record<string, unknown>;
}

type PerformanceListener = (metrics: PerformanceMetrics) => void;

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private entries: PerformanceEntry[] = [];
  private listeners: Set<PerformanceListener> = new Set();
  private enabled: boolean;
  private mountStart: number;
  private renderCount: number = 0;

  private constructor(enabled: boolean) {
    this.enabled = enabled;
    this.mountStart = performance.now();
    this.metrics = {
      mountTimeMs: 0,
      timeToInteractiveMs: 0,
      renderCount: 0,
      memoryUsage: this.getMemoryUsage(),
      marks: {},
    };

    // Mark app initialization
    if (this.enabled && performance.mark) {
      performance.mark('app-init');
    }
  }

  static getInstance(enabled: boolean = false): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor(enabled);
    }
    return PerformanceMonitor.instance;
  }

  private getMemoryUsage() {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const mem = (performance as Performance & { memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      }}).memory;
      if (mem) {
        return {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
      }
    }
    return null;
  }

  mark(name: string, metadata?: Record<string, unknown>) {
    if (!this.enabled) return;

    const time = performance.now();
    this.metrics.marks[name] = time;

    if (performance.mark) {
      performance.mark(name);
    }

    this.entries.push({
      name,
      entryType: 'mark',
      startTime: time,
      metadata,
    });

    this.notifyListeners();
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (!this.enabled) return;
    let duration: number | undefined;

    if (performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measures = performance.getEntriesByName(name);
        duration = measures[measures.length - 1]?.duration;
      } catch {
        // Fallback to manual calculation
        const start = this.metrics.marks[startMark];
        const end = this.metrics.marks[endMark || name];
        if (start && end) {
          duration = end - start;
        }
      }
    }

    if (duration === undefined) {
      const start = this.metrics.marks[startMark];
      const end = this.metrics.marks[endMark || name];
      if (start && end) {
        duration = end - start;
      }
    }

    if (duration !== undefined) {
      this.entries.push({
        name,
        entryType: 'measure',
        startTime: this.metrics.marks[startMark] || 0,
        duration,
      });
      this.notifyListeners();
    }
  }

  recordComponentMount(componentName: string) {
    if (!this.enabled) return;

    const time = performance.now();
    const mountTime = time - this.mountStart;
    
    this.metrics.mountTimeMs = mountTime;
    this.renderCount++;
    this.metrics.renderCount = this.renderCount;
    this.metrics.timeToInteractiveMs = Math.max(this.metrics.timeToInteractiveMs, mountTime);

    this.entries.push({
      name: componentName,
      entryType: 'component',
      startTime: time,
      duration: mountTime,
    });

    // Update memory
    this.metrics.memoryUsage = this.getMemoryUsage();

    if (performance.mark) {
      performance.mark(`${componentName}-mount`);
    }

    this.notifyListeners();
  }

  recordRender() {
    if (!this.enabled) return;
    
    this.renderCount++;
    this.metrics.renderCount = this.renderCount;
    this.metrics.memoryUsage = this.getMemoryUsage();

    this.notifyListeners();
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getEntries(): PerformanceEntry[] {
    return [...this.entries];
  }

  subscribe(listener: PerformanceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const metrics = this.getMetrics();
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (e) {
        console.warn('Performance listener error:', e);
      }
    });
  }

  reset() {
    this.entries = [];
    this.renderCount = 0;
    this.metrics = {
      mountTimeMs: 0,
      timeToInteractiveMs: 0,
      renderCount: 0,
      memoryUsage: this.getMemoryUsage(),
      marks: {},
    };
    this.mountStart = performance.now();
  }

  // Export performance data
  exportData() {
    return {
      metrics: this.getMetrics(),
      entries: this.getEntries(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
  }
}

// Initialize based on feature flag
const perfMonitor = PerformanceMonitor.getInstance(
  import.meta.env.VITE_FEATURE_PERF_MONITORING === 'true'
);

// React hook for using performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const enabled = useFeatureFlag('performanceMonitoring');
  const mountedRef = useRef(false);

  useEffect(() => {
    if (enabled && !mountedRef.current) {
      mountedRef.current = true;
      perfMonitor.recordComponentMount(componentName);
    }
  }, [enabled, componentName]);

  return {
    mark: useCallback((name: string, metadata?: Record<string, unknown>) => {
      if (enabled) {
        perfMonitor.mark(`${componentName}.${name}`, metadata);
      }
    }, [enabled, componentName]),
    measure: useCallback((name: string, startMark: string, endMark?: string) => {
      if (enabled) {
        perfMonitor.measure(`${componentName}.${name}`, startMark, endMark);
      }
    }, [enabled, componentName]),
    recordRender: useCallback(() => {
      if (enabled) {
        perfMonitor.recordRender();
      }
    }, [enabled]),
    metrics: perfMonitor.getMetrics(),
  };
}

// Hook for custom performance marks
export function usePerformanceMark(markName: string, deps?: unknown[]) {
  const enabled = useFeatureFlag('performanceMonitoring');
  const prevDepsRef = useRef(deps);

  useEffect(() => {
    if (enabled && deps && prevDepsRef.current !== deps) {
      perfMonitor.mark(markName, { depsChanged: true });
      prevDepsRef.current = deps;
    }
  }, [markName, deps, enabled]);
}

// Export the monitor for direct use
export { perfMonitor };
export type { PerformanceMetrics, PerformanceEntry };
