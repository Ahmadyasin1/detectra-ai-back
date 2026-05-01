import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import SEO from './components/SEO.tsx';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <HelmetProvider>
        <ErrorBoundary>
          <AuthProvider>
            <SEO />
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: white; font-family: system-ui;">
        <div style="text-align: center; padding: 2rem;">
          <h1 style="font-size: 2rem; margin-bottom: 1rem;">Application Error</h1>
          <p style="color: #94a3b8; margin-bottom: 2rem;">Failed to initialize the application. Please check the console for details.</p>
          <button onclick="window.location.reload()" style="padding: 0.75rem 1.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
