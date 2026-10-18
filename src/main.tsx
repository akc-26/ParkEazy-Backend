import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * Prevent an uncaught React rendering error from leaving the application as a
 * blank white page. The fallback is deliberately local and does not hide the
 * original error from the console.
 */
class RootErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ParkEazy] Unhandled UI rendering error:', error, info.componentStack);
  }

  private reload = () => window.location.reload();

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f4f8f7', color: '#162a2d', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <section role="alert" style={{ width: 'min(100%, 520px)', padding: 28, background: '#fff', border: '1px solid #d9e5e2', borderRadius: 16, boxShadow: '0 12px 36px rgba(22,42,45,.08)' }}>
            <p style={{ margin: '0 0 8px', color: '#087e8a', fontWeight: 700 }}>PARKEAZY</p>
            <h1 style={{ margin: '0 0 12px', fontSize: 24 }}>We couldn’t load this page</h1>
            <p style={{ margin: '0 0 20px', lineHeight: 1.6, color: '#526466' }}>
              The page encountered an unexpected error. Your data has not been intentionally changed. Reload to try again.
            </p>
            <button type="button" onClick={this.reload} style={{ border: 0, borderRadius: 8, padding: '11px 16px', background: '#087e8a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Reload ParkEazy
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('ParkEazy startup failed: required #root element was not found in index.html.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
