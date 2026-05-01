import { useEffect } from 'react';

export default function Analytics() {
  useEffect(() => {
    // Track page views and user interactions
    const trackPageView = () => {
      // In a real implementation, you would send this to your analytics service
      console.log('Page view tracked:', window.location.pathname);
    };

    const trackEvent = (eventName: string, properties?: Record<string, any>) => {
      // In a real implementation, you would send this to your analytics service
      console.log('Event tracked:', eventName, properties);
    };

    // Track page view on mount
    trackPageView();

    // Track scroll depth
    let maxScroll = 0;
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
          trackEvent('scroll_depth', { percentage: maxScroll });
        }
      }
    };

    // Track section views
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionName = entry.target.id || entry.target.className;
          trackEvent('section_view', { section: sectionName });
        }
      });
    };

    // Set up observers
    const scrollObserver = new IntersectionObserver(handleIntersection, {
      threshold: 0.5,
    });

    // Observe all sections
    const sections = document.querySelectorAll('section[id]');
    sections.forEach((section) => scrollObserver.observe(section));

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);

    // Track button clicks
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const buttonText = target.textContent || target.closest('button')?.textContent;
        trackEvent('button_click', { button: buttonText });
      }
    };

    document.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
      scrollObserver.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything
}
