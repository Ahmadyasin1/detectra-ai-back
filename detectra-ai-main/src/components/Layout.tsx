import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ParticleBackground from './ParticleBackground';
import CursorTrail from './CursorTrail';
import ScrollToTop from './ScrollToTop';
import PerformanceOptimizer from './PerformanceOptimizer';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-950">
      <PerformanceOptimizer />
      <ParticleBackground />
      <CursorTrail />
      <Navbar />
      <main className="relative z-10">
        <Outlet />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
