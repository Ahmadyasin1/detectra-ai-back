import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-5rem)] pt-24 flex items-center justify-center px-4 bg-transparent relative">

      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(34,211,238,0.05),transparent_60%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative text-center max-w-md"
      >
        {/* Big 404 */}
        <div className="relative mb-6">
          <p className="text-[9rem] font-extrabold leading-none bg-gradient-to-br from-cyan-400/40 to-blue-500/40 bg-clip-text text-transparent select-none">
            404
          </p>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(34,211,238,0.12),transparent_70%)] blur-2xl pointer-events-none" />
        </div>

        {/* Logo mark */}
        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-cyan-500/20">
          <span className="text-white font-bold text-xl">D</span>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved. Head back to the home page to continue.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all"
            >
              <Home className="w-4 h-4" />
              Go Home
            </motion.div>
          </Link>
          <button onClick={() => window.history.back()}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-700 hover:text-white hover:border-gray-600 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </motion.div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
