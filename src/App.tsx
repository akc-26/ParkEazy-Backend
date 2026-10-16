
import { useCallback, useEffect, useState } from 'react';
import { UserWebsiteApp } from '../apps/user-website/UserWebsiteApp';
import { HostPortalApp } from '../apps/host-portal/HostPortalApp';
import { AdminPanelApp } from '../apps/admin-panel/AdminPanelApp';

function normalizePath(path: string): string {
  if (!path || path === '/index.html') {
    return '/';
  }

  const withoutTrailingSlashes = path.replace(/\/+$/, '');
  return withoutTrailingSlashes || '/';
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
        ParkEazy
      </p>

      <h1 className="text-3xl font-extrabold">
        Page not found
      </h1>

      <p className="max-w-md text-slate-600">
        The page{' '}
        <code className="break-all rounded bg-white px-2 py-1">
          {currentPath}
        </code>{' '}
        does not exist or may have moved.
      </p>

      <button
        type="button"
        onClick={() => onNavigate('/')}
        className="rounded-lg bg-[#087E8A] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#075762] focus:outline-none focus:ring-2 focus:ring-[#087E8A] focus:ring-offset-2"
      >
        Return to ParkEazy
      </button>
    </main>
  );
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(() =>
    normalizePath(window.location.pathname)
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((path: string) => {
    const nextPath = normalizePath(path);
    const currentBrowserPath = normalizePath(window.location.pathname);

    if (nextPath !== currentBrowserPath) {
      window.history.pushState({}, '', nextPath);
    }

    setCurrentPath(nextPath);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const isHostRoute =
    currentPath === '/host' || currentPath.startsWith('/host/');

  const isAdminRoute =
    currentPath === '/admin' || currentPath.startsWith('/admin/');

  const isKnownUserRoute =
    currentPath === '/' ||
    currentPath === '/index.html';

  const isKnownHostRoute =
    isHostRoute &&
    !currentPath.startsWith('/host/api/');

  const isKnownAdminRoute =
    isAdminRoute &&
    !currentPath.startsWith('/admin/api/');

  if (isKnownHostRoute) {
    return (
      <HostPortalApp
        currentPath={currentPath}
        onNavigate={navigate}
      />
    );
  }

  if (isKnownAdminRoute) {
    return (
      <AdminPanelApp
        currentPath={currentPath}
        onNavigate={navigate}
      />
    );
  }

  if (isKnownUserRoute) {
    return <UserWebsiteApp onNavigate={navigate} />;
  }

  return (
    <NotFoundPage
      currentPath={currentPath}
      onNavigate={navigate}
    />
  );
}
