import { useEffect } from 'react';

export default function PerformanceOptimizer() {
  useEffect(() => {
    // Preload critical resources
    const preloadCriticalResources = () => {
      const criticalImages = [
        '/usman-aamer.jpg',
        '/ahmad-yasin.jpg',
        '/eman-sarfraz.jpg',
        '/abdul-rehman.jpg',
      ];

      criticalImages.forEach((src) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
      });

      // Preload critical fonts
      const fontLink = document.createElement('link');
      fontLink.rel = 'preload';
      fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
      fontLink.as = 'style';
      document.head.appendChild(fontLink);
    };

    // Optimize animations for performance
    const optimizeAnimations = () => {
      // Reduce motion for users who prefer it
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.style.setProperty('--animation-duration', '0.01ms');
        document.documentElement.style.setProperty('--animation-iteration-count', '1');
      }

      // Optimize for low-end devices
      const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
      if (isLowEndDevice) {
        document.documentElement.classList.add('low-end-device');
      }
    };

    // Implement service worker for caching
    const registerServiceWorker = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(() => {})
          .catch(() => {});
      }
    };

    // Optimize scroll performance
    const optimizeScroll = () => {
      let ticking = false;
      
      const updateScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            ticking = false;
          });
          ticking = true;
        }
      };

      window.addEventListener('scroll', updateScroll, { passive: true });
    };

    // Optimize resize performance
    const optimizeResize = () => {
      let resizeTimeout: NodeJS.Timeout;
      
      const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          // Handle resize logic here
        }, 100);
      };

      window.addEventListener('resize', handleResize, { passive: true });
    };

    // Implement intersection observer for lazy loading
    const setupIntersectionObserver = () => {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              imageObserver.unobserve(img);
            }
          }
        });
      }, { rootMargin: '50px' });

      // Observe all lazy images
      const lazyImages = document.querySelectorAll('img[data-src]');
      lazyImages.forEach((img) => imageObserver.observe(img));
    };

    // Initialize all optimizations
    preloadCriticalResources();
    optimizeAnimations();
    registerServiceWorker();
    optimizeScroll();
    optimizeResize();
    setupIntersectionObserver();

    // Cleanup
    return () => {
      window.removeEventListener('scroll', () => {});
      window.removeEventListener('resize', () => {});
    };
  }, []);

  return null;
}