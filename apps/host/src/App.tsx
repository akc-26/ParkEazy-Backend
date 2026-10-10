import React from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { Button, Card, Badge, PortalBanner, MetricCard } from '@parkeazy/shared-ui';
import { WORKSPACE_PORTS } from '@parkeazy/config';

export function HostPortalContent({
  onNavigateToWebsite,
  onNavigateToAdmin,
}: {
  onNavigateToWebsite?: () => void;
  onNavigateToAdmin?: () => void;
} = {}) {
  const { tenant } = useBrand();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PortalBanner
        portal="host"
        port={WORKSPACE_PORTS.host}
        designRef="stitch-export/host_operations_dashboard_pe_hp_02_01"
      />

      {/* HOST HEADER */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: tenant.colors.primary }}
              >
                P
              </div>
              <span className="font-extrabold text-lg tracking-tight font-['Plus_Jakarta_Sans']">
                {tenant.displayName}{' '}
                <span className="text-[#006B5F] font-semibold text-sm">Host</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#E4E7EC]">
              <span className="text-xs font-semibold text-[#667085]">
                Facility: <strong className="text-[#101828]">Anna Nagar Plaza (Chennai)</strong>
              </span>
              <Badge variant="success" dot>
                Live Open
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#667085] hidden sm:inline">
              Host ID: <code className="text-[#101828] font-mono">#HST-8821</code>
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToWebsite}
              title="Return to Customer Marketplace (/)"
            >
              Marketplace
            </Button>
            <Button variant="primary" size="sm">
              + Add Space
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN HOST CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HOST OPERATIONAL CONTEXT BANNER */}
        <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full border border-[#0F766E]/20">
                HQ Operation Node
              </span>
              <span className="text-xs font-mono text-[#667085]">FACILITY ID: #FAC-0104</span>
              <Badge variant="brand" dot>
                18 of 24 Spaces Occupied (75%)
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight font-['Plus_Jakarta_Sans'] mt-1">
              Anna Nagar Plaza Parking — 100 Feet Rd
            </h1>
            <p className="text-xs sm:text-sm text-[#667085]">
              Real-time terminal sync active • Telemetry refresh rate: 15s • Chennai Urban Sector 4
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm">
              📹 View Live Gate Monitor
            </Button>
            <Button variant="primary" size="sm">
              ⚙️ Facility Settings
            </Button>
          </div>
        </div>

        {/* 4-COLUMN METRICS GRID (Grounded in pe_hp_02_01) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <MetricCard
            label="Today's Earnings"
            value="₹4,820.00"
            change="+14% vs ystd"
            isPositive={true}
            subtext="Automated ledger sync"
            icon="₹"
          />
          <MetricCard
            label="Active Occupancy"
            value="18 / 24"
            change="75% Cap"
            isPositive={true}
            subtext="6 bays available now"
            icon="🚗"
          />
          <MetricCard
            label="Today's Check-ins"
            value="42 Arrivals"
            change="+8 vs avg"
            isPositive={true}
            subtext="0 overstay violations"
            icon="⏱️"
          />
          <MetricCard
            label="Pending Payout"
            value="₹28,450.00"
            change="Next: Friday"
            isPositive={true}
            subtext="Direct bank transfer"
            icon="🏦"
          />
        </div>

        {/* HOST WORKSPACE SECTIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Section 1: Space & Inventory Management */}
          <Card padding="md" className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Inventory Management
                </span>
                <Badge variant="neutral">pe_hp_04_01</Badge>
              </div>
              <h3 className="text-lg font-bold text-[#101828] mb-1">
                Parking Bay & Slot Allocations
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Control dedicated slots, EV charging stations, 2-wheeler bays, and seasonal closure schedules.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E4E7EC]">
              <div className="text-xs text-[#667085] flex items-center justify-between">
                <span>Slots registered: <strong>24 Bays</strong></span>
                <span className="text-[#0F766E] font-semibold">Ready for Phase 2</span>
              </div>
            </div>
          </Card>

          {/* Section 2: Bookings & Gate Operations */}
          <Card padding="md" className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Arrivals & Departures
                </span>
                <Badge variant="neutral">pe_hw_04_04</Badge>
              </div>
              <h3 className="text-lg font-bold text-[#101828] mb-1">
                Gate Check-in Operations
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Verify driver QR tokens, inspect vehicle license plates, record arrival timestamps, and resolve conflicts.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E4E7EC]">
              <div className="text-xs text-[#667085] flex items-center justify-between">
                <span>Active scanner: <strong>Simulated</strong></span>
                <span className="text-[#0F766E] font-semibold">Ready for Phase 3</span>
              </div>
            </div>
          </Card>

          {/* Section 3: Financial Settlement & Payouts */}
          <Card padding="md" className="flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0F766E]">
                  Finance & Settlements
                </span>
                <Badge variant="neutral">pe_hw_05_04</Badge>
              </div>
              <h3 className="text-lg font-bold text-[#101828] mb-1">
                Payout Accounts & Statements
              </h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Platform commission breakdown, automated GST invoices, settlement schedules, and bank account settings.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#E4E7EC]">
              <div className="text-xs text-[#667085] flex items-center justify-between">
                <span>Settlement cycle: <strong>T+2 Weekly</strong></span>
                <span className="text-[#0F766E] font-semibold">Ready for Phase 4</span>
              </div>
            </div>
          </Card>
        </div>

        {/* PART 00 DISCLOSURE */}
        <div className="p-4 rounded-xl bg-[#EFF8FF] border border-[#BFDBFE]">
          <div className="flex items-start gap-3">
            <span className="text-[#1D4ED8] text-lg font-bold">ℹ️</span>
            <div className="text-xs text-[#1E40AF]">
              <p className="font-bold">Part 00 Scaffold Notice — Host Portal</p>
              <p className="mt-0.5 text-[#1D4ED8]">
                This starter screen establishes the host operational layout, metric cards, and facility telemetry presentation
                grounded in Stitch design reference <code>host_operations_dashboard_pe_hp_02_01</code>.
                Production bay writes, QR scanning hardware integration, and financial payout disbursements are deferred to subsequent phases.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Monorepo App: <code>apps/host</code></span>
            <span>•</span>
            <span>Design Ref: <code>pe_hp_02_01</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HostPortalApp() {
  return (
    <BrandProvider>
      <HostPortalContent />
    </BrandProvider>
  );
}
