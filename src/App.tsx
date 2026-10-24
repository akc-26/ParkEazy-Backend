import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import CustomerApp from './customer/CustomerApp';
import HostApp from '../apps/host/src/App';
import AdminPanelApp from '../apps/admin/src/App';

interface PortalErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Keep a portal render failure from producing a completely blank preview.
 * Normal rendering and all existing portal UI remain unchanged.
 */
class PortalErrorBoundary extends Component<{ children: ReactNode }, PortalErrorBoundaryState> {
  state: PortalErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: unknown): PortalErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ParkEazy] Portal render failed:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const showDetails = import.meta.env.DEV;
      return (
        <main role="alert" className="min-h-screen bg-white p-6 text-slate-900">
          <section className="mx-auto max-w-2xl rounded-xl border border-slate-200 p-6 shadow-sm">
            <h1 className="text-xl font-semibold">ParkEazy could not load this page</h1>
            <p className="mt-2 text-sm text-slate-600">
              The page encountered an unexpected error. Refresh the preview. If it continues, check the browser console.
            </p>
            {showDetails && (
              <pre className="mt-4 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-red-700">
                {this.state.errorMessage}
              </pre>
            )}
            <button
              type="button"
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

/** Route each portal from the single same-origin Vite/Express entry point. */
function PortalDispatcher() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/admin' || path.startsWith('/admin/')) return <AdminPanelApp />;
  if (path === '/host' || path.startsWith('/host/')) return <HostApp />;
  return <CustomerApp />;
}

export default function App() {
  return (
    <PortalErrorBoundary>
      <PortalDispatcher />
    </PortalErrorBoundary>
  );
}
