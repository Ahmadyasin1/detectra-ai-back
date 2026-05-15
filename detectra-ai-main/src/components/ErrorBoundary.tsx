import { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

// Feature flag check for enhanced error recovery
const ENHANCED_ERROR_RECOVERY = import.meta.env.VITE_ENHANCED_ERROR_RECOVERY === 'true';

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error for diagnostics
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service if available
    if (ENHANCED_ERROR_RECOVERY && typeof window !== 'undefined') {
      this.reportError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state if resetKeys change
    if (
      this.state.hasError && 
      this.props.resetKeys && 
      JSON.stringify(prevProps.resetKeys) !== JSON.stringify(this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
      
      // Store in localStorage for recovery
      const errors = JSON.parse(localStorage.getItem('detecra-errors') || '[]');
      errors.push(errorData);
      localStorage.setItem('detecra-errors', JSON.stringify(errors.slice(-10))); // Keep last 10
      
      // Don't send in production to avoid exposing details
      if (import.meta.env.DEV) {
        console.log('Error report:', errorData);
      }
    } catch {
      // Silent fail - error reporting should not break the app
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default graceful degradation UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950">
          <div className="max-w-md w-full card-glass rounded-2xl p-8 text-center border border-white/10">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-6">
              We encountered an unexpected error. The application will continue to function,
              but some features may be unavailable.
            </p>
            
            {this.state.error && import.meta.env.DEV && (
              <details className="text-left bg-black/30 rounded-xl p-4 mb-6 text-xs text-red-400">
                <summary className="cursor-pointer mb-2">Error Details</summary>
                <p className="break-all">{this.state.error.message}</p>
                <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.reset}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl text-sm hover:bg-cyan-500/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 text-gray-300 border border-white/20 rounded-xl text-sm hover:bg-white/20 transition-colors"
              >
                Reload Page
              </button>
            </div>

            <p className="text-gray-600 text-xs mt-6">
              Error ID: {Date.now().toString(36)}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
