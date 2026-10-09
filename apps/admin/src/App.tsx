import React from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { Button, Card, Badge, PortalBanner } from '@parkeazy/shared-ui';
import { WORKSPACE_PORTS } from '@parkeazy/config';

export function AdminPanelContent() {
  const { tenant } = useBrand();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PortalBanner
        portal="admin"
        port={WORKSPACE_PORTS.admin}
        designRef="[Design Source Gap: Admin screens pending export in ParkEazy-Web-Design]"
      />

      {/* ADMIN HEADER */}
      <header className="sticky top-0 z-40 bg-[#101828] text-white border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: tenant.colors.primary }}
              >
                P
              </div>
              <span className="font-extrabold text-lg tracking-tight font-['Plus_Jakarta_Sans'] text-white">
                {tenant.displayName}{' '}
                <span className="text-[#38BDF8] font-semibold text-sm">Platform Admin</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#334155]">
              <span className="text-xs text-[#94A3B8]">
                Environment: <strong className="text-white">Monorepo Staging</strong>
              </span>
              <Badge variant="gold">
                Superadmin Scope
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#94A3B8] font-mono hidden sm:inline">
              Role: System Auditor
            </span>
            <Button variant="secondary" size="sm" className="bg-[#1E293B] text-white border-[#334155] hover:bg-[#334155]">
              Audit Logs
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN ADMIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* DESIGN SOURCE AUDIT DISCLOSURE */}
        <div className="mb-8 p-6 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-left shadow-sm">
          <div className="flex items-start gap-4">
            <span className="text-2xl">⚠️</span>
            <div className="text-xs sm:text-sm text-[#92400E]">
              <h2 className="font-bold text-base text-[#78350F]">
                Design Source Status: Admin Screens Pending in Authoritative Repository
              </h2>
              <p className="mt-1 leading-relaxed">
                As required by <strong>Section 2.1 Rule 13</strong> and <strong>Section 7</strong>:
                The authoritative design repository (<code>https://github.com/akc-26/ParkEazy-Web-Design</code>) contains
                111 exported screens categorized for the Customer Website (<code>pe_uw_*</code>) and Host Portal (<code>pe_hw_*</code> / <code>pe_hp_*</code>).
                Dedicated screens for the Admin Panel (e.g. <code>pe_aw_*</code>) were not found in the repository export.
              </p>
              <p className="mt-2 text-[#78350F] font-semibold">
                To prevent unapproved UI drift, this screen serves as a clean, compliant architectural foundation
                documenting the planned governance modules without inventing synthetic mockup widgets.
              </p>
            </div>
          </div>
        </div>

        {/* ADMIN RESPONSIBILITIES OVERVIEW */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] font-['Plus_Jakarta_Sans'] tracking-tight">
            Platform Governance & Administration
          </h1>
          <p className="text-sm text-[#667085] mt-1">
            Planned core administration modules for the ParkEazy marketplace ecosystem.
          </p>
        </div>

        {/* 6 CORE RESPONSIBILITIES CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🏢</span>
              <Badge variant="neutral">Governance</Badge>
            </div>
            <h3 className="text-base font-bold text-[#101828]">Multi-Tenant Management</h3>
            <p className="text-xs text-[#667085] mt-2 leading-relaxed">
              Configure white-label branding, localized currencies, custom domain bindings, and regional pricing tiers.
            </p>
            <div className="mt-4 pt-3 border-t border-[#E4E7EC] text-xs text-[#0F766E] font-semibold">
              Planned Phase: Part 01
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🛡️</span>
              <Badge variant="neutral">Compliance</Badge>
            </div>
            <h3 className="text-base font-bold text-[#101828]">Host KYC & Facility Verification</h3>
            <p className="text-xs text-[#667085] mt-2 leading-relaxed">
              Review ownership documents, fire safety compliance, physical bay audits, and automated background checks.
            </p>
            <div className="mt-4 pt-3 border-t border-[#E4E7EC] text-xs text-[#0F766E] font-semibold">
              Planned Phase: Part 02
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">💰</span>
              <Badge variant="neutral">Finance</Badge>
            </div>
            <h3 className="text-base font-bold text-[#101828]">Commission Ledger & Fee Rules</h3>
            <p className="text-xs text-[#667085] mt-2 leading-relaxed">
              Configure platform service fees (10-15%), GST compliance, automated tax invoice generation, and escrow releases.
            </p>
            <div className="mt-4 pt-3 border-t border-[#E4E7EC] text-xs text-[#0F766E] font-semibold">
              Planned Phase: Part 04
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">⚖️</span>
              <Badge variant="neutral">Operations</Badge>
            </div>
            <h3 className="text-base font-bold text-[#101828]">Dispute & Overstay Arbitrage</h3>
            <p className="text-xs text-[#667085] mt-2 leading-relaxed">
              Investigate driver chargebacks, gate overstay penalties, damaged vehicle claims, and automated refund approvals.
            </p>
            <div className="mt-4 pt-3 border-t border-[#E4E7EC] text-xs text-[#0F766E] font-semibold">
              Planned Phase: Part 03
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">📊</span>
              <Badge variant="neutral">Analytics</Badge>
            </div>
            <h3 className="text-base font-bold text-[#101828]">City-Wide Telemetry & Heatmaps</h3>
            <p className="text-xs text-[#667085] mt-2 leading-relaxed">
              Monitor real-time metro parking demand, peak surge patterns, gate throughput rates, and vacancy alerts.
            </p>
            <div className="mt-4 pt-3 border-t border-[#E4E7EC] text-xs text-[#0F766E] font-semibold">
              Planned Phase: Part 05
            </div>
          </Card>

          <Card padding="md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">🔐</span>
              <Badge variant="neutral">Security</Badge>
            </div>
            <h3 className="text-base font-bold text-[#101828]">RBAC & Audit Trails</h3>
            <p className="text-xs text-[#667085] mt-2 leading-relaxed">
              Granular access control, session invalidation, automated security alerting, and immutable audit logs.
            </p>
            <div className="mt-4 pt-3 border-t border-[#E4E7EC] text-xs text-[#0F766E] font-semibold">
              Planned Phase: Part 01
            </div>
          </Card>
        </div>
      </main>

      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Superadmin Console.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Monorepo App: <code>apps/admin</code></span>
            <span>•</span>
            <span>Design Ref: <code>Pending Export</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function AdminPanelApp() {
  return (
    <BrandProvider>
      <AdminPanelContent />
    </BrandProvider>
  );
}
