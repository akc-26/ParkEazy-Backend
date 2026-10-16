import React, { useState, useEffect } from 'react';
import { UserWebsiteApp } from '../apps/user-website/UserWebsiteApp';
import { HostPortalApp } from '../apps/host-portal/HostPortalApp';
import { AdminPanelApp } from '../apps/admin-panel/AdminPanelApp';
import { NotFoundPage } from './NotFoundPage';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (toPath: string) => {
    window.history.pushState({}, '', toPath);
    setCurrentPath(toPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route Dispatching Logic
  // 1. User Website: / or /index.html
  const isUserWebsite = currentPath === '/' || currentPath === '' || currentPath === '/index.html';

  // 2. Host Portal: /host, /host/, /host/*
  const isHostPortal = currentPath === '/host' || currentPath === '/host/' || currentPath.startsWith('/host/');

  // 3. Admin Panel: /admin, /admin/, /admin/*
  const isAdminPanel = currentPath === '/admin' || currentPath === '/admin/' || currentPath.startsWith('/admin/');

  if (isUserWebsite) {
    return <UserWebsiteApp onNavigate={navigate} />;
  }

  if (isHostPortal) {
    return <HostPortalApp currentPath={currentPath} onNavigate={navigate} />;
  }

  if (isAdminPanel) {
    return <AdminPanelApp currentPath={currentPath} onNavigate={navigate} />;
  }

  // 4. Unknown routes: Explicit 404 page
  return <NotFoundPage currentPath={currentPath} onNavigate={navigate} />;
}
