import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ParticleBackground from './ParticleBackground';
import CursorTrail from './CursorTrail';
import ScrollToTop from './ScrollToTop';
import PerformanceOptimizer from './PerformanceOptimizer';
import AuthModal from './AuthModal';

export default function Layout() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <PerformanceOptimizer />
      <ParticleBackground />
      {/* Site-wide ambient glow — matches Home / Hero treatment */}
      <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[min(110vw,56rem)] h-[min(48vh,28rem)] bg-cyan-500/[0.16] blur-[120px] rounded-full opacity-90" />
        <div className="absolute bottom-[-18%] left-1/2 -translate-x-1/2 w-[min(95vw,48rem)] h-[min(42vh,24rem)] bg-blue-600/[0.12] blur-[120px] rounded-full opacity-90" />
      </div>
      <CursorTrail />
      <AuthModal />
      <Navbar />
      <main className="relative z-10 min-w-0 w-full">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
