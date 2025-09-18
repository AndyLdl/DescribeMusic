/**
 * Global Error Boundary Component
 * Catches errors in React components and displays friendly error messages
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so next render will show error UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error information
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // Can send error reports to monitoring service here
        // e.g.: Sentry, LogRocket, etc.
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    };

    render() {
        if (this.state.hasError) {
            // If custom fallback is provided, use it
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
                    <div className="glass-pane max-w-md w-full p-8 text-center">
                        {/* Error icon */}
                        <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>

                        {/* Error title */}
                        <h2 className="text-xl font-bold text-white mb-4">
                            Something went wrong
                        </h2>

                        {/* Error description */}
                        <p className="text-slate-300 mb-6">
                            The application encountered an unexpected error. Please try refreshing the page or try again later.
                        </p>

                        {/* Error details (development) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-sm text-slate-400 cursor-pointer mb-2">
                                    Error Details (Development Mode)
                                </summary>
                                <div className="bg-black/20 rounded-lg p-4 text-xs text-slate-300 font-mono">
                                    <div className="mb-2">
                                        <strong>Error Message:</strong> {this.state.error.message}
                                    </div>
                                    <div className="mb-2">
                                        <strong>Error Stack:</strong>
                                        <pre className="mt-1 whitespace-pre-wrap">
                                            {this.state.error.stack}
                                        </pre>
                                    </div>
                                    {this.state.errorInfo && (
                                        <div>
                                            <strong>Component Stack:</strong>
                                            <pre className="mt-1 whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}

                        {/* Action buttons */}
                        <div className="space-y-3">
                            <button
                                onClick={this.handleRetry}
                                className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
                            >
                                Retry
                            </button>

                            <button
                                onClick={() => window.location.reload()}
                                className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                            >
                                Refresh Page
                            </button>

                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full px-6 py-3 text-slate-400 hover:text-white transition-colors"
                            >
                                Go to Homepage
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}