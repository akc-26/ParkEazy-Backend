import { useCallback, useEffect, useState } from 'react';
import { UserWebsiteApp } from '../apps/user-website/UserWebsiteApp';
import { HostPortalApp } from '../apps/host-portal/HostPortalApp';
import { AdminPanelApp } from '../apps/admin-panel/AdminPanelApp';

function normalizePath(path: string): string {
  if (!path || path === '/index.html') {
    return '/';
  }
  // Strip query string and hash for path matching
  const [cleanPath] = path.split(/[?#]/);
  const withoutTrailingSlashes = cleanPath.replace(/\/+$/, '');
  return withoutTrailingSlashes || '/';
}

function getFullUrlPath(path: string): string {
  if (!path || path === '/index.html') {
    return '/';
  }
  return path;
}

interface NotFoundPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

function NotFoundPage({
  currentPath,
  onNavigate,
}: NotFoundPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F4F8F7] px-4 py-12 text-center text-[#162A2D]">
      <p className="text-sm font-semibold uppercase tracking-wider text-[#087E8A]">
        ParkEazy Marketplace
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight">
        Page not found
      </h1>
      <p className="max-w-md text-slate-600 text-sm">
        The requested route{' '}
        <code className="break-all rounded bg-white px-2 py-1 font-mono font-medium border border-slate-200">
          {currentPath}
        </code>{' '}
        does not exist or may have been moved.
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="rounded-lg bg-[#087E8A] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#075762] focus:outline-none focus:ring-2 focus:ring-[#087E8A] focus:ring-offset-2"
        >
          Return to ParkEazy Homepage
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/search')}
          className="rounded-lg bg-white border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#087E8A] focus:ring-offset-2"
        >
          Search Spaces
        </button>
      </div>
    </main>
  );
}

interface AppProps {
  initialPath?: string;
}

export default function App({ initialPath }: AppProps = {}) {
  const [currentPath, setCurrentPath] = useState(() =>
    initialPath ||
    (typeof window !== 'undefined'
      ? getFullUrlPath(window.location.pathname + window.location.search)
      : '/')
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      setCurrentPath(getFullUrlPath(window.location.pathname + window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((path: string) => {
    const nextClean = getFullUrlPath(path);
    if (typeof window !== 'undefined') {
      const currentBrowserClean = getFullUrlPath(window.location.pathname + window.location.search);
      if (nextClean !== currentBrowserClean) {
        window.history.pushState({}, '', nextClean);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    setCurrentPath(nextClean);
  }, []);

  const normalized = normalizePath(currentPath);

  // Host Portal routes
  const isHostRoute =
    normalized === '/host' || normalized.startsWith('/host/');
  const isKnownHostRoute =
    isHostRoute && !normalized.startsWith('/host/api/');

  // Admin Panel routes
  const isAdminRoute =
    normalized === '/admin' || normalized.startsWith('/admin/');
  const isKnownAdminRoute =
    isAdminRoute && !normalized.startsWith('/admin/api/');

  // User Website routes:
  // - /
  // - /search
  // - /spaces/:id
  // - /booking/review
  // - /checkout
  // - /booking/confirmation/:id
  // - /bookings
  // - /profile
  // - /login
  // - /register
  const isSpacesRoute = /^\/spaces\/[^/]+$/.test(normalized);
  const isBookingConfirmRoute = /^\/booking\/confirmation\/[^/]+$/.test(normalized);

  const isKnownUserRoute =
    normalized === '/' ||
    normalized === '/search' ||
    normalized === '/booking/review' ||
    normalized === '/checkout' ||
    normalized === '/bookings' ||
    normalized === '/profile' ||
    normalized === '/login' ||
    normalized === '/register' ||
    isSpacesRoute ||
    isBookingConfirmRoute;

  if (isKnownHostRoute) {
    return (
      <HostPortalApp
        currentPath={normalized}
        onNavigate={navigate}
      />
    );
  }

  if (isKnownAdminRoute) {
    return (
      <AdminPanelApp
        currentPath={normalized}
        onNavigate={navigate}
      />
    );
  }

  if (isKnownUserRoute) {
    return (
      <UserWebsiteApp
        currentPath={currentPath}
        onNavigate={navigate}
      />
    );
  }

  // Any unmatched route intentionally returns NotFoundPage
  return (
    <NotFoundPage
      currentPath={currentPath}
      onNavigate={navigate}
    />
  );
}
