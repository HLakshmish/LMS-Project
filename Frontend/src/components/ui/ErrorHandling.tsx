import React, { useState, useEffect } from 'react';
import ErrorAlert from './ErrorAlert';
import SuccessAlert from './SuccessAlert';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h2 className="text-lg font-medium text-red-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-700 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  // Add global error event listener
  useEffect(() => {
    const handleGlobalError = (event: CustomEvent<{ message: string }>) => {
      setGlobalError(event.detail.message);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setGlobalError(null);
      }, 5000);
    };

    const handleGlobalSuccess = (event: CustomEvent<{ message: string }>) => {
      setGlobalSuccess(event.detail.message);
      
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setGlobalSuccess(null);
      }, 5000);
    };

    window.addEventListener('app:error' as any, handleGlobalError as EventListener);
    window.addEventListener('app:success' as any, handleGlobalSuccess as EventListener);

    return () => {
      window.removeEventListener('app:error' as any, handleGlobalError as EventListener);
      window.removeEventListener('app:success' as any, handleGlobalSuccess as EventListener);
    };
  }, []);

  return (
    <ErrorBoundary>
      {globalError && (
        <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
          <ErrorAlert 
            message={globalError} 
            onClose={() => setGlobalError(null)} 
          />
        </div>
      )}
      
      {globalSuccess && (
        <div className="fixed top-4 right-4 z-50 w-96 max-w-full">
          <SuccessAlert 
            message={globalSuccess} 
            onClose={() => setGlobalSuccess(null)} 
          />
        </div>
      )}
      
      {children}
    </ErrorBoundary>
  );
};

// Helper functions to trigger global notifications
export const showGlobalError = (message: string): void => {
  window.dispatchEvent(new CustomEvent('app:error', { detail: { message } }));
};

export const showGlobalSuccess = (message: string): void => {
  window.dispatchEvent(new CustomEvent('app:success', { detail: { message } }));
};

export { ErrorBoundary, GlobalErrorHandler };
