import React, { useState } from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { Button, Card, Badge, PortalBanner, Header } from '@parkeazy/shared-ui';
import { WORKSPACE_PORTS } from '@parkeazy/config';

export function CustomerWebsiteContent({ onNavigateToHost }: { onNavigateToHost?: () => void } = {}) {
  const { tenant } = useBrand();
  const [selectedVehicle, setSelectedVehicle] = useState<'car' | 'bike' | 'auto'>('car');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <PortalBanner
        portal="website"
        port={WORKSPACE_PORTS.website}
        designRef="stitch-export/user_website_landing_page_pe_uw_01_01"
      />

      <Header
        subtitle="Customer Marketplace"
        navLinks={[
          { label: 'Find Parking', active: true },
          { label: 'How It Works' },
          { label: 'Host a Space', onClick: onNavigateToHost },
          { label: 'Help' },
        ]}
        rightActions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={onNavigateToHost}
              title="Navigate to Host Operations Portal (/host/)"
            >
              Host Sign In
            </Button>
            <Button variant="primary" size="sm">
              Find Parking
            </Button>
          </div>
        }
      />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#E4E7EC] bg-gradient-to-b from-white to-[#F8FAFC]">
          <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
            {/* Live Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F7F4] border border-[#0F766E]/20 text-[#0F766E] text-xs font-semibold mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
              <span>Real-Time Metro Parking Network</span>
              <span className="text-[#0F766E]/50">•</span>
              <span className="text-[11px] font-mono">Chennai & Tier-1 Hubs</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#101828] tracking-tight font-['Plus_Jakarta_Sans'] max-w-3xl leading-tight">
              {tenant.tagline}
            </h1>

            <p className="mt-4 text-base sm:text-lg text-[#344054] max-w-2xl font-['Inter']">
              Reserve guaranteed, secure parking spaces across top commercial and residential hubs.
              Zero circling, transparent hourly rates.
            </p>

            {/* MINIMAL SEARCH DOCK SCAFFOLD (Grounded in pe_uw_01_01) */}
            <div className="w-full mt-10 p-4 sm:p-6 bg-white rounded-2xl shadow-[0_12px_24px_-4px_rgba(16,24,40,0.08),0_4px_8px_-2px_rgba(16,24,40,0.03)] border border-[#E4E7EC] text-left">
              {/* Vehicle Selection Chips */}
              <div className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-[#E4E7EC] gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#667085] uppercase tracking-wider mr-1">
                    Vehicle:
                  </span>
                  {(['car', 'bike', 'auto'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setSelectedVehicle(v)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer ${
                        selectedVehicle === v
                          ? 'bg-[#0F766E] text-white shadow-sm'
                          : 'bg-[#F1F3FF] text-[#344054] hover:bg-[#E9EDFF]'
                      }`}
                    >
                      {v === 'car' ? '🚗 Car' : v === 'bike' ? '🏍️ Bike' : '🛺 Auto'}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="brand" dot>
                    Live Telemetry Ready
                  </Badge>
                </div>
              </div>

              {/* Search Inputs Scaffold */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-1">
                    Destination Area
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Anna Nagar / T. Nagar (Chennai)"
                    className="w-full h-11 px-3 rounded-lg border border-[#E4E7EC] bg-[#F8FAFC] text-sm text-[#101828] font-medium"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-1">
                    Date & Arrival
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Today, 10:00 AM — 2 Hours"
                    className="w-full h-11 px-3 rounded-lg border border-[#E4E7EC] bg-[#F8FAFC] text-sm text-[#101828] font-medium"
                  />
                </div>

                <div className="flex flex-col justify-end pt-1 md:pt-5">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-md"
                    onClick={() => {}}
                  >
                    Search Spaces (Scaffold)
                  </Button>
                </div>
              </div>
            </div>

            {/* ARCHITECTURAL STATUS DISCLOSURE */}
            <div className="w-full mt-8 p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-left">
              <div className="flex items-start gap-3">
                <span className="text-[#15803D] text-lg font-bold">ℹ️</span>
                <div className="text-xs text-[#166534]">
                  <p className="font-bold">Part 00 Scaffold Notice — Customer Website</p>
                  <p className="mt-0.5 text-[#15803D]">
                    This starter screen establishes the workspace foundation, styling tokens, and layout hierarchy
                    grounded in the authoritative Stitch design reference (<code>user_website_landing_page_pe_uw_01_01</code>).
                    Production map viewport, live space inventory, checkouts, and payment gateways are intentionally deferred.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS & CAPABILITIES PREVIEW */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Planned Marketplace Capabilities
            </h2>
            <p className="text-sm text-[#667085] mt-1">
              Architecture verified against 111 exported Stitch design screens
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card padding="md">
              <div className="w-10 h-10 rounded-lg bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center font-bold text-lg mb-3">
                📍
              </div>
              <h3 className="text-base font-bold text-[#101828]">Guaranteed Booking</h3>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                Direct bay reservations with QR gate access and real-time navigation guidance.
              </p>
              <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#667085]">
                <span>Status:</span>
                <Badge variant="neutral">Phase 2 Planned</Badge>
              </div>
            </Card>

            <Card padding="md">
              <div className="w-10 h-10 rounded-lg bg-[#FEF6E7] text-[#9A6700] flex items-center justify-center font-bold text-lg mb-3">
                ⚡
              </div>
              <h3 className="text-base font-bold text-[#101828]">EV & Smart Amenities</h3>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                Filter by fast EV charging, covered parking, CCTV surveillance, and disabled access.
              </p>
              <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#667085]">
                <span>Status:</span>
                <Badge variant="neutral">Phase 2 Planned</Badge>
              </div>
            </Card>

            <Card padding="md">
              <div className="w-10 h-10 rounded-lg bg-[#EFF8FF] text-[#175CD3] flex items-center justify-center font-bold text-lg mb-3">
                🛡️
              </div>
              <h3 className="text-base font-bold text-[#101828]">Verified Hosts</h3>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                All commercial and residential facility partners undergo strict physical verification.
              </p>
              <div className="mt-4 pt-3 border-t border-[#E4E7EC] flex items-center justify-between text-xs text-[#667085]">
                <span>Status:</span>
                <Badge variant="neutral">Phase 1 Planned</Badge>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <footer className="w-full bg-[#101828] text-[#94A3B8] py-8 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Monorepo App: <code>apps/website</code></span>
            <span>•</span>
            <span>Design Reference: <code>pe_uw_01_01</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function CustomerWebsiteApp() {
  return (
    <BrandProvider>
      <CustomerWebsiteContent />
    </BrandProvider>
  );
}
