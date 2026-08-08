import React from 'react';
import { Card, Button } from './ui';
import { AlertOctagon, RefreshCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    // Clear storage settings if they're corrupt, or just reload page
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <Card className="max-w-md w-full p-8 text-center flex flex-col items-center">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-full mb-6">
              <AlertOctagon className="w-12 h-12" />
            </div>
            
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              An unexpected error occurred. Please click below to restart the application or return to home.
            </p>

            {this.state.error && (
              <div className="w-full text-left bg-slate-100 p-4 rounded-xl text-xs font-mono text-slate-700 max-h-40 overflow-y-auto mb-6">
                {this.state.error.toString()}
              </div>
            )}

            <Button onClick={this.handleReset} className="w-full flex items-center justify-center gap-2">
              <RefreshCcw className="w-4 h-4" />
              Reload Application
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
