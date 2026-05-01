import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          900: '#0f172a',
          950: '#020617',
        },
        accent: {
          cyan:   '#22d3ee',
          blue:   '#3b82f6',
          indigo: '#6366f1',
          violet: '#8b5cf6',
          green:  '#22c55e',
          amber:  '#f59e0b',
          red:    '#ef4444',
          orange: '#f97316',
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'glow-cyan':   '0 0 20px rgba(34, 211, 238, 0.25)',
        'glow-blue':   '0 0 20px rgba(59, 130, 246, 0.25)',
        'glow-green':  '0 0 20px rgba(34, 197, 94, 0.25)',
        'glow-red':    '0 0 20px rgba(239, 68, 68, 0.25)',
        'card':        '0 4px 24px rgba(0,0,0,0.18)',
        'card-hover':  '0 8px 40px rgba(0,0,0,0.28)',
        'panel':       '0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease-out both',
        'slide-up':     'slideUp 0.45s ease-out both',
        'slide-down':   'slideDown 0.35s ease-out both',
        'scale-in':     'scaleIn 0.3s ease-out both',
        'shimmer':      'shimmer 1.8s linear infinite',
        'pulse-slow':   'pulse 3s ease-in-out infinite',
        'bounce-slow':  'bounce 2s ease-in-out infinite',
        'spin-slow':    'spin 3s linear infinite',
        'glow-pulse':   'glowPulse 2.5s ease-in-out infinite',
        'scan-line':    'scanLine 2s linear infinite',
        'float':        'float 6s ease-in-out infinite',
        'progress':     'progressFill 1.2s ease-out forwards',
      },
      keyframes: {
        fadeIn:      { from: { opacity: '0' },                     to: { opacity: '1' } },
        slideUp:     { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown:   { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(34,211,238,0.2)' },
          '50%':      { boxShadow: '0 0 28px rgba(34,211,238,0.5)' },
        },
        scanLine: {
          '0%':   { top: '0%',   opacity: '0.8' },
          '50%':  { opacity: '0.4' },
          '100%': { top: '100%', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        progressFill: {
          from: { width: '0%' },
          to:   { width: 'var(--progress-width, 100%)' },
        },
      },
      backgroundImage: {
        'gradient-radial':       'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':        'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-slate':            "linear-gradient(rgba(148,163,184,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.04) 1px,transparent 1px)",
        'grid-dark':             "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
        'shimmer-gradient':      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config;
