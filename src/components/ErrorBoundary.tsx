import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 text-center">
          <div className="glass p-8 rounded-3xl max-w-md space-y-4">
            <h1 className="text-2xl font-bold text-accent">Something went wrong</h1>
            <p className="text-muted text-sm">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <pre className="text-[10px] bg-black/40 p-4 rounded-xl overflow-auto text-left text-red-400">
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-accent text-black font-bold py-3 rounded-xl"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
