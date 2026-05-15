import { useEffect, useState, useRef } from 'react';

// Skip link component for keyboard navigation
export function SkipToContent() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip to main content with Alt+S
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const main = document.getElementById('main-content');
        main?.focus();
      }
      // Skip to navigation with Alt+N
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const nav = document.getElementById('main-nav');
        nav?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, containerRef]);
}

// Auto-announce status changes for screen readers
export function useLiveAnnouncer() {
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!announcement) return;

    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = announcement;

    document.body.appendChild(announcer);

    const timer = setTimeout(() => {
      document.body.removeChild(announcer);
      setAnnouncement('');
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (document.body.contains(announcer)) {
        document.body.removeChild(announcer);
      }
    };
  }, [announcement]);

  return (message: string) => {
    setAnnouncement(message);
  };
}

// Keyboard shortcut manager
export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (options.ctrl === undefined || e.ctrlKey === options.ctrl) &&
        (options.shift === undefined || e.shiftKey === options.shift) &&
        (options.alt === undefined || e.altKey === options.alt) &&
        (options.meta === undefined || e.metaKey === options.meta)
      ) {
        e.preventDefault();
        callback(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, options]);
}

// Focus restoration after component unmount
export function useFocusRestoration() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    return () => {
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
    };
  }, []);
}

// High contrast mode detection
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(query.matches);

    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return isHighContrast;
}

// Reduced motion detection
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(query.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}
