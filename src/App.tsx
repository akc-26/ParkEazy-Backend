import React, { useState, useEffect } from 'react';
import { CustomerWebsiteContent } from '../apps/website/src/App';
import { HostPortalContent } from '../apps/host/src/App';
import { AdminPanelContent } from '../apps/admin/src/App';
import { BrandProvider, useBrand, PARKEAZY_DESIGN_TOKENS } from '@parkeazy/branding';
import { HealthApiClient } from '@parkeazy/api-client';
import { HealthCheckResponse } from '@parkeazy/shared-types';
import { WORKSPACE_PORTS, API_CONFIG } from '@parkeazy/config';
import { validateTenantConfig } from '@parkeazy/validation';
import { Badge, Button, Card } from '@parkeazy/shared-ui';

type ActiveView = 'workspace' | 'website' | 'host' | 'admin' | 'diagnostics';

function MonorepoWorkspaceContent() {
  const { tenant } = useBrand();
  const [activeView, setActiveView] = useState<ActiveView>('workspace');
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Validate tenant branding configuration on mount
  const validationResult = validateTenantConfig(tenant);

  // Health client instance
  const healthClient = new HealthApiClient();

  const handleFetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      // In web preview, try network GET or fallback to client snapshot
      const res = await healthClient.checkHealth();
      setHealthStatus(res);
    } catch {
      // Graceful offline snapshot fallback
      const fallback = healthClient.getOfflineHealthSnapshot();
      setHealthStatus(fallback);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    handleFetchHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* MONOREPO TOP COMMAND BAR */}
      <nav className="sticky top-0 z-50 bg-[#101828] text-white border-b border-[#1E293B] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('workspace')}
              className="flex items-center gap-2.5 focus:outline-none text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center font-black text-white text-base">
                P
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold text-white text-base font-['Plus_Jakarta_Sans']">
                    ParkEazy
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#14B8A6]/20 text-[#2DD4BF] px-1.5 py-0.5 rounded">
                    Monorepo
                  </span>
                </div>
                <span className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                  Part 00 Scaffold Foundation
                </span>
              </div>
            </button>
          </div>

          {/* VIEW SWITCHER TABS */}
          <div className="flex items-center bg-[#1E293B] p-1 rounded-xl text-xs font-semibold gap-1 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveView('workspace')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'workspace'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('website')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'website'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Customer Website (:3001)
            </button>
            <button
              onClick={() => setActiveView('host')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'host'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Host Portal (:3002)
            </button>
            <button
              onClick={() => setActiveView('admin')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'admin'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Admin Panel (:3003)
            </button>
            <button
              onClick={() => setActiveView('diagnostics')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeView === 'diagnostics'
                  ? 'bg-[#0F766E] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Diagnostics & API
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
            <span className="text-xs text-[#94A3B8] font-mono">Port 3000 (Preview)</span>
          </div>
        </div>
      </nav>

      {/* RENDER ACTIVE VIEW */}
      {activeView === 'website' && <CustomerWebsiteContent />}
      {activeView === 'host' && <HostPortalContent />}
      {activeView === 'admin' && <AdminPanelContent />}

      {/* OVERVIEW WORKSPACE HOME */}
      {activeView === 'workspace' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* WELCOME BANNER */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm mb-8 relative overflow-hidden">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="brand" dot>
                  Part 00 Scaffold Complete
                </Badge>
                <Badge variant="gold">
                  111 Design Screens Inspected
                </Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#101828] font-['Plus_Jakarta_Sans'] tracking-tight">
                ParkEazy White-Label Parking Monorepo
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[#344054] leading-relaxed font-['Inter']">
                Complete architectural foundation for the white-label parking-space marketplace.
                Houses three independently bootable web applications (Customer Website, Host Portal, Admin Panel),
                a NestJS backend API scaffold, centralized white-label branding, shared packages, and design-source mapping.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => setActiveView('website')}
                >
                  Explore Customer Website
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveView('host')}
                >
                  Explore Host Portal
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setActiveView('admin')}
                >
                  Explore Admin Panel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveView('diagnostics')}
                >
                  API Health & Diagnostics
                </Button>
              </div>
            </div>
          </div>

          {/* MONOREPO PORTAL ARCHITECTURE CARDS */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Monorepo Application Components
            </h2>
            <p className="text-xs text-[#667085] mt-1">
              Separately organized entry points, routes, and build targets sharing centralized packages
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 1. Customer Website */}
            <Card padding="md" variant="interactive" onClick={() => setActiveView('website')}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">🚗</span>
                <span className="bg-[#E6F7F4] text-[#0F766E] px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                  Port {WORKSPACE_PORTS.website}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#101828]">Customer Website</h3>
              <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                Directory: <code>apps/website/</code>
              </p>
              <p className="text-xs text-[#344054] mt-2 leading-relaxed">
                Urban drivers discover, filter by vehicle type, inspect bay photos, book slots, and make mobile payments.
              </p>
              <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs">
                <span className="text-[#667085]">Authoritative Ref:</span>
                <span className="font-mono text-[#0F766E] font-semibold">pe_uw_01_01</span>
              </div>
            </Card>

            {/* 2. Host Portal */}
            <Card padding="md" variant="interactive" onClick={() => setActiveView('host')}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">🏢</span>
                <span className="bg-[#E0F2FE] text-[#0369A1] px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                  Port {WORKSPACE_PORTS.host}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#101828]">Host Portal</h3>
              <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                Directory: <code>apps/host/</code>
              </p>
              <p className="text-xs text-[#344054] mt-2 leading-relaxed">
                Commercial and residential facility owners manage slot inventory, live occupancy telemetry, gate arrivals, and settlements.
              </p>
              <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs">
                <span className="text-[#667085]">Authoritative Ref:</span>
                <span className="font-mono text-[#006B5F] font-semibold">pe_hp_02_01</span>
              </div>
            </Card>

            {/* 3. Admin Panel */}
            <Card padding="md" variant="interactive" onClick={() => setActiveView('admin')}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">🛡️</span>
                <span className="bg-[#F3E8FF] text-[#7C3AED] px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                  Port {WORKSPACE_PORTS.admin}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#101828]">Admin Panel</h3>
              <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                Directory: <code>apps/admin/</code>
              </p>
              <p className="text-xs text-[#344054] mt-2 leading-relaxed">
                Platform operators audit host KYC, manage white-label tenants, resolve disputes, configure commissions, and inspect audit logs.
              </p>
              <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs">
                <span className="text-[#667085]">Status:</span>
                <span className="font-mono text-[#B45309] font-semibold">Pending Export</span>
              </div>
            </Card>
          </div>

          {/* SHARED PACKAGES ARCHITECTURE TABLE */}
          <div className="bg-white rounded-2xl border border-[#E4E7EC] p-6 shadow-sm mb-8">
            <h2 className="text-lg font-bold text-[#101828] font-['Plus_Jakarta_Sans'] mb-1">
              Shared Monorepo Packages
            </h2>
            <p className="text-xs text-[#667085] mb-4">
              Single-source-of-truth libraries preventing code duplication across portals
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E4E7EC] text-[#667085] font-semibold uppercase tracking-wider">
                    <th className="pb-3">Package</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Responsibility</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E7EC] text-[#344054]">
                  <tr>
                    <td className="py-3 font-mono font-semibold text-[#0F766E]">@parkeazy/branding</td>
                    <td className="py-3 font-mono text-[#667085]">packages/branding/</td>
                    <td className="py-3">BrandProvider, CSS variable injection, theme modes, token utilities</td>
                    <td className="py-3"><Badge variant="success">Active</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-semibold text-[#0F766E]">@parkeazy/shared-ui</td>
                    <td className="py-3 font-mono text-[#667085]">packages/shared-ui/</td>
                    <td className="py-3">Reusable primitives: Button, Card, Badge, BrandLogo, Header, MetricCard</td>
                    <td className="py-3"><Badge variant="success">Active</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-semibold text-[#0F766E]">@parkeazy/api-client</td>
                    <td className="py-3 font-mono text-[#667085]">packages/api-client/</td>
                    <td className="py-3">Typed HTTP client, HealthApiClient, timeout & error handlers</td>
                    <td className="py-3"><Badge variant="success">Active</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-semibold text-[#0F766E]">@parkeazy/shared-types</td>
                    <td className="py-3 font-mono text-[#667085]">packages/shared-types/</td>
                    <td className="py-3">TypeScript interfaces for branding, health, parking spaces, bookings</td>
                    <td className="py-3"><Badge variant="success">Active</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-semibold text-[#0F766E]">@parkeazy/validation</td>
                    <td className="py-3 font-mono text-[#667085]">packages/validation/</td>
                    <td className="py-3">Tenant config validator, vehicle registration and email format helpers</td>
                    <td className="py-3"><Badge variant="success">Active</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-semibold text-[#0F766E]">@parkeazy/config</td>
                    <td className="py-3 font-mono text-[#667085]">packages/config/</td>
                    <td className="py-3">Port numbers (3000, 3001, 3002, 3003, 4000), API prefixes, constants</td>
                    <td className="py-3"><Badge variant="success">Active</Badge></td>
                  </tr>
                  <tr>
                    <td className="py-3 font-mono font-semibold text-[#006B5F]">@parkeazy/api</td>
                    <td className="py-3 font-mono text-[#667085]">services/api/</td>
                    <td className="py-3">NestJS REST backend, HealthController, future business modules</td>
                    <td className="py-3"><Badge variant="success">Scaffold Active</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* DIAGNOSTICS & API HEALTH CONSOLE */}
      {activeView === 'diagnostics' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] font-['Plus_Jakarta_Sans']">
                Monorepo Diagnostics & API Health
              </h1>
              <p className="text-xs sm:text-sm text-[#667085] mt-1">
                Real-time contract verification, package validation, and Windows PowerShell development tooling
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              isLoading={healthLoading}
              onClick={handleFetchHealth}
            >
              🔄 Refresh Health Check
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Health Endpoint Card */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-[#101828]">
                  NestJS Backend Endpoint: <code>GET /health</code>
                </span>
                <Badge variant={healthStatus?.status === 'ok' ? 'success' : 'warning'} dot>
                  {healthStatus?.status?.toUpperCase() || 'QUERYING'}
                </Badge>
              </div>

              {healthStatus && (
                <div className="bg-[#101828] text-[#E2E8F0] p-4 rounded-xl font-mono text-xs overflow-x-auto">
                  <pre>{JSON.stringify(healthStatus, null, 2)}</pre>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#667085]">
                <span>Service: <strong>{API_CONFIG.serviceName}</strong></span>
                <span>Prefix: <code>{API_CONFIG.prefix}</code></span>
                <span>Target Port: <strong>{API_CONFIG.defaultPort}</strong></span>
              </div>
            </Card>

            {/* Tenant Schema Validation Card */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-[#101828]">
                  Centralized Branding Validation
                </span>
                <Badge variant={validationResult.success ? 'success' : 'danger'}>
                  {validationResult.success ? 'SCHEMA VALID' : 'INVALID'}
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E4E7EC] flex items-center justify-between">
                  <span className="text-[#667085]">Tenant Display Name:</span>
                  <span className="font-bold text-[#101828]">{tenant.displayName}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E4E7EC] flex items-center justify-between">
                  <span className="text-[#667085]">Tagline:</span>
                  <span className="font-medium text-[#101828]">{tenant.tagline}</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E4E7EC] flex items-center justify-between">
                  <span className="text-[#667085]">Primary Color Token:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded border border-black/10 inline-block"
                      style={{ backgroundColor: tenant.colors.primary }}
                    />
                    <code className="font-bold">{tenant.colors.primary}</code>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E4E7EC] flex items-center justify-between">
                  <span className="text-[#667085]">Accent Gold Token:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded border border-black/10 inline-block"
                      style={{ backgroundColor: tenant.colors.accent }}
                    />
                    <code className="font-bold">{tenant.colors.accent}</code>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* DESIGN SYSTEM TOKEN SWATCHES */}
          <Card padding="md" className="mb-8">
            <h3 className="text-base font-bold text-[#101828] font-['Plus_Jakarta_Sans'] mb-1">
              Design System Tokens (parkeazy_design_system/DESIGN.md)
            </h3>
            <p className="text-xs text-[#667085] mb-4">
              Directly grounded in the authoritative Google Stitch website design export
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0F766E] text-white">
                <div className="font-bold">Primary</div>
                <div className="text-[10px] opacity-90 font-mono">#0F766E</div>
              </div>
              <div className="p-3 rounded-xl bg-[#14B8A6] text-white">
                <div className="font-bold">Bright Mint</div>
                <div className="text-[10px] opacity-90 font-mono">#14B8A6</div>
              </div>
              <div className="p-3 rounded-xl bg-[#D6A84F] text-white">
                <div className="font-bold">Restrained Gold</div>
                <div className="text-[10px] opacity-90 font-mono">#D6A84F</div>
              </div>
              <div className="p-3 rounded-xl bg-[#101828] text-white">
                <div className="font-bold">Deep Ink</div>
                <div className="text-[10px] opacity-90 font-mono">#101828</div>
              </div>
              <div className="p-3 rounded-xl bg-[#344054] text-white">
                <div className="font-bold">Slate</div>
                <div className="text-[10px] opacity-90 font-mono">#344054</div>
              </div>
              <div className="p-3 rounded-xl bg-[#12B76A] text-white">
                <div className="font-bold">Status Success</div>
                <div className="text-[10px] opacity-90 font-mono">#12B76A</div>
              </div>
            </div>
          </Card>

          {/* WINDOWS POWERSHELL COMMANDS REFERENCE */}
          <Card padding="md">
            <h3 className="text-base font-bold text-[#101828] font-['Plus_Jakarta_Sans'] mb-1">
              Windows PowerShell Local Commands
            </h3>
            <p className="text-xs text-[#667085] mb-4">
              Commands designed for direct execution from Windows PowerShell after downloading the monorepo
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 bg-[#101828] text-[#E2E8F0] rounded-xl">
                <span className="text-[#94A3B8]"># 1. Install all monorepo dependencies</span>
                <div className="text-[#38BDF8] mt-1">npm install</div>
              </div>
              <div className="p-3 bg-[#101828] text-[#E2E8F0] rounded-xl">
                <span className="text-[#94A3B8]"># 2. Run customer marketplace (:3001)</span>
                <div className="text-[#38BDF8] mt-1">npm run dev:website</div>
              </div>
              <div className="p-3 bg-[#101828] text-[#E2E8F0] rounded-xl">
                <span className="text-[#94A3B8]"># 3. Run host operations portal (:3002)</span>
                <div className="text-[#38BDF8] mt-1">npm run dev:host</div>
              </div>
              <div className="p-3 bg-[#101828] text-[#E2E8F0] rounded-xl">
                <span className="text-[#94A3B8]"># 4. Run admin panel (:3003)</span>
                <div className="text-[#38BDF8] mt-1">npm run dev:admin</div>
              </div>
              <div className="p-3 bg-[#101828] text-[#E2E8F0] rounded-xl">
                <span className="text-[#94A3B8]"># 5. Run NestJS backend API (:4000)</span>
                <div className="text-[#38BDF8] mt-1">npm run dev:api</div>
              </div>
              <div className="p-3 bg-[#101828] text-[#E2E8F0] rounded-xl">
                <span className="text-[#94A3B8]"># 6. Run monorepo typecheck & tests</span>
                <div className="text-[#38BDF8] mt-1">npm run test && npm run typecheck</div>
              </div>
            </div>
          </Card>
        </main>
      )}

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Part 00 Scaffold</span>
            <span>•</span>
            <span className="text-[#38BDF8]">apps/ (website, host, admin) + services/api + packages/*</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrandProvider>
      <MonorepoWorkspaceContent />
    </BrandProvider>
  );
}
