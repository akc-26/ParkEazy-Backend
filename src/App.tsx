import React, { useState, useEffect } from 'react';
import { CustomerWebsiteContent } from '../apps/website/src/App';
import { HostPortalContent } from '../apps/host/src/App';
import { AdminPanelContent } from '../apps/admin/src/App';
import { BrandProvider, useBrand } from '@parkeazy/branding';
import { HealthApiClient } from '@parkeazy/api-client';
import { HealthCheckResponse } from '@parkeazy/shared-types';
import { WORKSPACE_PORTS } from '@parkeazy/config';
import { Badge, Button, Card } from '@parkeazy/shared-ui';

type ActiveView = 'website' | 'host' | 'admin' | 'workspace' | 'diagnostics';

function getInitialView(): ActiveView {
  if (typeof window === 'undefined') return 'website';
  const path = window.location.pathname;
  if (path === '/host' || path.startsWith('/host/')) return 'host';
  if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
  if (path === '/overview' || path.startsWith('/overview/')) {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'diagnostics' ? 'diagnostics' : 'workspace';
  }
  if (path === '/diagnostics' || path.startsWith('/diagnostics/')) return 'diagnostics';
  return 'website';
}

function RootAppContent() {
  const { tenant } = useBrand();
  const [activeView, setActiveView] = useState<ActiveView>(getInitialView);
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const navigateTo = (view: ActiveView, targetPath?: string) => {
    let path = targetPath;
    if (!path) {
      switch (view) {
        case 'website':
          path = '/';
          break;
        case 'host':
          path = '/host/';
          break;
        case 'admin':
          path = '/admin/';
          break;
        case 'workspace':
          path = '/overview';
          break;
        case 'diagnostics':
          path = '/overview?tab=diagnostics';
          break;
      }
    }

    if (typeof window !== 'undefined') {
      const fullCurrent = window.location.pathname + window.location.search;
      if (fullCurrent !== path) {
        window.history.pushState({ view }, '', path);
      }
    }
    setActiveView(view);
  };

  useEffect(() => {
    const handlePopState = () => {
      const resolved = getInitialView();
      setActiveView(resolved);
    };

    window.addEventListener('popstate', handlePopState);

    // Normalize paths without trailing slash for sub-apps
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/host') {
        window.history.replaceState({ view: 'host' }, '', '/host/' + window.location.search);
      } else if (window.location.pathname === '/admin') {
        window.history.replaceState({ view: 'admin' }, '', '/admin/' + window.location.search);
      }
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleFetchHealth = async () => {
    setHealthLoading(true);
    try {
      const healthClient = new HealthApiClient();
      const res = await healthClient.checkHealth();
      setHealthStatus(res);
    } catch {
      const healthClient = new HealthApiClient();
      const fallback = healthClient.getOfflineHealthSnapshot();
      setHealthStatus(fallback);
    } finally {
      setHealthLoading(false);
    }
  };

  // 1. Customer Website view (Pristine, no dev chrome)
  if (activeView === 'website') {
    return <CustomerWebsiteContent onNavigateToHost={() => navigateTo('host', '/host/')} />;
  }

  // 2. Host Portal view (Pristine, no dev chrome)
  if (activeView === 'host') {
    return (
      <HostPortalContent
        onNavigateToWebsite={() => navigateTo('website', '/')}
        onNavigateToAdmin={() => navigateTo('admin', '/admin/')}
      />
    );
  }

  // 3. Admin Panel view (Pristine, no dev chrome)
  if (activeView === 'admin') {
    return (
      <AdminPanelContent
        onNavigateToWebsite={() => navigateTo('website', '/')}
        onNavigateToHost={() => navigateTo('host', '/host/')}
      />
    );
  }

  // 4. Monorepo Overview / Diagnostics view (only when explicitly requested at /overview or /diagnostics)
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <nav className="sticky top-0 z-50 bg-[#101828] text-white border-b border-[#1E293B] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('workspace')}
              className="flex items-center gap-2.5 focus:outline-none text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center font-black text-white text-base">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-white text-base font-['Plus_Jakarta_Sans']">
                  ParkEazy
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2DD4BF]">
                  Architectural Workspace
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center bg-[#1E293B] p-1 rounded-xl text-xs font-semibold gap-1">
            <button
              onClick={() => navigateTo('website', '/')}
              className="px-3 py-1.5 rounded-lg text-[#94A3B8] hover:text-white transition-all cursor-pointer"
            >
              Website (/)
            </button>
            <button
              onClick={() => navigateTo('host', '/host/')}
              className="px-3 py-1.5 rounded-lg text-[#94A3B8] hover:text-white transition-all cursor-pointer"
            >
              Host Portal (/host/)
            </button>
            <button
              onClick={() => navigateTo('admin', '/admin/')}
              className="px-3 py-1.5 rounded-lg text-[#94A3B8] hover:text-white transition-all cursor-pointer"
            >
              Admin Panel (/admin/)
            </button>
            <button
              onClick={() => navigateTo('workspace', '/overview')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'workspace' ? 'bg-[#0F766E] text-white' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => navigateTo('diagnostics', '/overview?tab=diagnostics')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'diagnostics' ? 'bg-[#0F766E] text-white' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              API Diagnostics
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm mb-8">
          <h1 className="text-3xl font-extrabold text-[#101828] font-['Plus_Jakarta_Sans']">
            ParkEazy Monorepo Architecture Overview
          </h1>
          <p className="mt-2 text-sm text-[#344054]">
            Unified white-label parking infrastructure hosting Customer Marketplace, Host Operations Workspace, and Admin Console.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigateTo('website', '/')}>
              Launch Customer Marketplace (/)
            </Button>
            <Button variant="secondary" onClick={() => navigateTo('host', '/host/')}>
              Launch Host Portal (/host/)
            </Button>
            <Button variant="secondary" onClick={() => navigateTo('admin', '/admin/')}>
              Launch Admin Panel (/admin/)
            </Button>
            <Button variant="outline" onClick={handleFetchHealth}>
              {healthLoading ? 'Checking Health...' : 'Check NestJS API Health'}
            </Button>
          </div>

          {healthStatus && (
            <div className="mt-6 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-mono">
              <div className="font-bold text-[#141B2C] mb-1">API Health Response:</div>
              <pre>{JSON.stringify(healthStatus, null, 2)}</pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrandProvider>
      <RootAppContent />
    </BrandProvider>
  );
}
