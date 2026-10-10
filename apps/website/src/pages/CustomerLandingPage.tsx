import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function CustomerLandingPage({ currentUser, onNavigate, onLogout }: Props) {
  const { tenant } = useBrand();
  const [selectedVehicle, setSelectedVehicle] = useState<'car' | 'bike' | 'auto'>('car');
  const [searchLocation, setSearchLocation] = useState('Anna Nagar / T. Nagar (Chennai)');
  const [searchDuration, setSearchDuration] = useState('Today, 10:00 AM — 2 Hours');

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E4E7EC] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2.5 cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold font-['Plus_Jakarta_Sans'] shadow-xs">
                P
              </div>
              <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl text-[#101828] tracking-tight">
                {tenant.displayName}
              </span>
            </button>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#344054]">
              <a href="#search" className="text-[#0F766E] font-semibold">
                Find Parking
              </a>
              <a href="#how-it-works" className="hover:text-[#101828] transition-colors">
                How It Works
              </a>
              <button
                onClick={() => onNavigate('/host/')}
                className="hover:text-[#0F766E] transition-colors cursor-pointer"
              >
                Host a Space
              </button>
              <button
                onClick={() => onNavigate('/auth/error')}
                className="text-xs text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
              >
                Security & Error Guide
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-[#E6F7F4] border border-[#0F766E]/20 px-3 py-1.5 rounded-full text-xs">
                <span className="w-2 h-2 rounded-full bg-[#12B76A]" />
                <span className="font-bold text-[#0F766E]">
                  {currentUser.fullName || currentUser.email}
                </span>
                <span className="text-[#667085]">•</span>
                <span className="capitalize font-mono text-[#0F766E]">
                  {currentUser.roles[0] || 'Customer'}
                </span>
                <button
                  onClick={onLogout}
                  className="ml-2 text-[11px] font-bold text-[#D92D20] hover:underline cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('/login')}
                  className="px-3.5 py-2 text-xs font-semibold text-[#344054] hover:text-[#101828] hover:bg-[#F1F3FF] rounded-lg transition-colors cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('/signup')}
                  className="px-4 py-2 text-xs font-semibold bg-[#0F766E] hover:bg-[#005c55] text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1">
        <section
          id="search"
          className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-[#E4E7EC] bg-gradient-to-b from-white to-[#F8FAFC]"
        >
          <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
            {/* Live Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E6F7F4] border border-[#0F766E]/20 text-[#0F766E] text-xs font-semibold mb-6 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
              <span>Real-Time Metro Parking Network</span>
              <span className="text-[#0F766E]/50">•</span>
              <span className="text-[11px] font-mono">Chennai & Tier-1 Hubs</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#101828] tracking-tight font-['Plus_Jakarta_Sans'] max-w-3xl leading-tight">
              {tenant.tagline || 'Guaranteed Parking Across Prime Metropolitan Hubs'}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-[#344054] max-w-2xl font-['Inter']">
              Reserve guaranteed, secure parking spaces across top commercial and residential hubs.
              Zero circling, transparent hourly rates.
            </p>

            {/* SEARCH DOCK */}
            <div className="w-full mt-10 p-5 sm:p-7 bg-white rounded-2xl shadow-[0_12px_24px_-4px_rgba(16,24,40,0.08),0_4px_8px_-2px_rgba(16,24,40,0.03)] border border-[#E4E7EC] text-left">
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
                          ? 'bg-[#0F766E] text-white shadow-xs'
                          : 'bg-[#F1F3FF] text-[#344054] hover:bg-[#E9EDFF]'
                      }`}
                    >
                      {v === 'car' ? '🚗 Car / SUV' : v === 'bike' ? '🏍️ Two-Wheeler' : '🛺 Auto / EV'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#0F766E] bg-[#E6F7F4] px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                  <span>Real-time availability locked</span>
                </div>
              </div>

              {/* Search Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-1">
                    Destination Area
                  </label>
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-[#E4E7EC] bg-[#F8FAFC] text-sm text-[#101828] font-medium focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-semibold text-[#667085] uppercase tracking-wider mb-1">
                    Date & Arrival
                  </label>
                  <input
                    type="text"
                    value={searchDuration}
                    onChange={(e) => setSearchDuration(e.target.value)}
                    className="w-full h-11 px-3 rounded-lg border border-[#E4E7EC] bg-[#F8FAFC] text-sm text-[#101828] font-medium focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={() => {
                      if (!currentUser) onNavigate('/login');
                      else onNavigate('/auth/success');
                    }}
                    className="w-full h-11 bg-[#0F766E] hover:bg-[#005c55] text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Search Reserved Bays</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED HUBS GRID */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-[#101828] font-['Plus_Jakarta_Sans'] tracking-tight">
                Featured Verified Parking Hubs
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                24/7 CCTV surveillance, automated boom barriers, and guaranteed reservations
              </p>
            </div>
            <span className="text-xs font-bold text-[#0F766E] bg-[#E6F7F4] px-3 py-1 rounded-full">
              Live Network
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                id: 'fac-104',
                name: 'Anna Nagar Plaza Parking',
                area: '100 Feet Rd, Anna Nagar West, Chennai',
                rate: '₹30 / hr',
                bays: '18 bays available',
                features: ['Covered Stalls', 'EV Charging', 'ANPR Gate'],
              },
              {
                id: 'fac-105',
                name: 'T. Nagar Commercial Terminal',
                area: 'South Usman Rd, T. Nagar, Chennai',
                rate: '₹40 / hr',
                bays: '12 bays available',
                features: ['Valet Option', 'Security Guards', 'FastTag'],
              },
              {
                id: 'fac-106',
                name: 'OMR Tech Corridor Hub',
                area: 'Thoraipakkam, Rajiv Gandhi Salai, Chennai',
                rate: '₹25 / hr',
                bays: '24 bays available',
                features: ['24/7 Open', 'SUV Clearance', 'RFID Entry'],
              },
            ].map((hub) => (
              <div
                key={hub.id}
                className="bg-white rounded-xl border border-[#E4E7EC] p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[#0F766E] uppercase tracking-wider bg-[#E6F7F4] px-2 py-0.5 rounded">
                      Verified Node
                    </span>
                    <span className="text-sm font-extrabold text-[#101828]">{hub.rate}</span>
                  </div>
                  <h3 className="font-bold text-base text-[#101828] mb-1 font-['Plus_Jakarta_Sans']">
                    {hub.name}
                  </h3>
                  <p className="text-xs text-[#667085] mb-4">{hub.area}</p>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {hub.features.map((feat) => (
                      <span
                        key={feat}
                        className="text-[11px] bg-[#F1F3FF] text-[#344054] px-2 py-0.5 rounded"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-3 border-t border-[#E4E7EC] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#12B76A] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />
                    {hub.bays}
                  </span>
                  <button
                    onClick={() => {
                      if (!currentUser) onNavigate('/login');
                      else onNavigate('/auth/success');
                    }}
                    className="text-xs font-bold text-[#0F766E] hover:underline cursor-pointer"
                  >
                    Reserve Now →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TRUST BANNER */}
        <section id="how-it-works" className="bg-[#101828] text-white py-14 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px] text-[#14B8A6]">search</span>
              </div>
              <h4 className="font-bold text-base font-['Plus_Jakarta_Sans']">1. Search & Lock</h4>
              <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                Choose your hub and reserve your slot. Your spot is held with an arrival grace window.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px] text-[#14B8A6]">qr_code_scanner</span>
              </div>
              <h4 className="font-bold text-base font-['Plus_Jakarta_Sans']">2. Seamless QR Clearance</h4>
              <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                Scan your gate pass or let automated ANPR license plate cameras lift the boom barrier.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[24px] text-[#14B8A6]">verified_user</span>
              </div>
              <h4 className="font-bold text-base font-['Plus_Jakarta_Sans']">3. Park & Arrive Peaceful</h4>
              <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                Park in your assigned bay. Transparent digital receipt dispatched upon departure.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-8 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies Pvt. Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <button onClick={() => onNavigate('/host/')} className="hover:text-white cursor-pointer">
              Host Operations Portal
            </button>
            <span>•</span>
            <button onClick={() => onNavigate('/auth/error')} className="hover:text-white cursor-pointer">
              Security Guide
            </button>
            <span>•</span>
            <button onClick={() => onNavigate('/session-expired')} className="hover:text-white cursor-pointer">
              Session Policies
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
