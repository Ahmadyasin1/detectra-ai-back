import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Backend API target — falls back to localhost:8000 for local development
  const apiTarget = env.VITE_API_URL || 'http://localhost:8000';
  const wsTarget  = apiTarget.replace(/^https?/, 'ws');

  return {
    plugins: [react()],

    optimizeDeps: {
      exclude: ['lucide-react'],
    },

    build: {
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:    ['react', 'react-dom'],
            router:    ['react-router-dom'],
            animation: ['framer-motion'],
            icons:     ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      reportCompressedSize: false,
    },

    // ── Dev server ──────────────────────────────────────────────────────────────
    server: {
      port: 5173,
      hmr: { overlay: false },
      proxy: {
        '/api': {
          target:       apiTarget,
          changeOrigin: true,
          secure:       false,
        },
        '/health': {
          target:       apiTarget,
          changeOrigin: true,
          secure:       false,
        },
        '/ws': {
          target: wsTarget,
          ws:     true,
        },
      },
    },

    // ── Preview server (npm run preview) ────────────────────────────────────────
    preview: {
      port: 4173,
      strictPort: true,
      proxy: {
        '/api': {
          target:       apiTarget,
          changeOrigin: true,
          secure:       false,
        },
        '/health': {
          target:       apiTarget,
          changeOrigin: true,
          secure:       false,
        },
        '/ws': {
          target: wsTarget,
          ws:     true,
        },
      },
    },

    base: '/',
  };
});
