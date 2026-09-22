import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d1117] text-[#f0f6fc] flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-8 shadow-2xl">
            <div className="w-14 h-14 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center justify-center mx-auto mb-5 text-red-400">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-gray-400 mb-6">
              The application encountered an unexpected error during initialization.
            </p>

            {this.state.error && (
              <div className="bg-[#090d13] border border-red-900/40 rounded-lg p-3.5 mb-6 text-left overflow-x-auto max-h-40 text-xs text-red-300 font-mono">
                <div className="font-semibold text-red-400 mb-1">{this.state.error.name}: {this.state.error.message}</div>
                {this.state.error.stack && (
                  <div className="text-gray-500 whitespace-pre text-[10px]">{this.state.error.stack.split('\n').slice(0, 4).join('\n')}</div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Reload Application
              </button>
              <button
                onClick={this.handleClearStorageAndReload}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700"
              >
                Reset Local Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
