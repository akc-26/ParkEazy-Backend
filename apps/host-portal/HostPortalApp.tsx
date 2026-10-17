import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Layers,
  CalendarCheck,
  DollarSign,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Car,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react';
import { Button, Card, Badge, Table, Tabs } from '../../packages/ui';
import { apiClient } from '../../packages/api-client';
import {
  ParkingLocation,
  ParkingBay,
  BookingSummary,
  HostEarningsSummary,
  BayStatus,
} from '../../packages/contracts';

interface HostPortalAppProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
}

export const HostPortalApp: React.FC<HostPortalAppProps> = ({
  currentPath = '/host/',
  onNavigate,
}) => {
  const getTabFromPath = (path: string): 'overview' | 'bays' | 'bookings' | 'earnings' => {
    if (path.includes('/bays')) return 'bays';
    if (path.includes('/bookings')) return 'bookings';
    if (path.includes('/earnings')) return 'earnings';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'bays' | 'bookings' | 'earnings'>(getTabFromPath(currentPath));

  useEffect(() => {
    setActiveTab(getTabFromPath(currentPath));
  }, [currentPath]);

  const handleTabChange = (tab: 'overview' | 'bays' | 'bookings' | 'earnings') => {
    setActiveTab(tab);
    onNavigate('/host/' + (tab === 'overview' ? '' : tab));
  };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [earnings, setEarnings] = useState<HostEarningsSummary | null>(null);
  const [locations, setLocations] = useState<ParkingLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('loc-dt-001');
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Authenticate as demo host for the Host Portal
  useEffect(() => {
    apiClient.login('host@parkeazy.com', 'demo-host-pass', 'host').then(() => {
      Promise.all([
        apiClient.getHostEarnings('usr-host-001'),
        apiClient.getLocations(),
        apiClient.getBookings(),
      ])
        .then(([earningsData, locationsData, bookingsData]) => {
          setEarnings(earningsData);
          setLocations(locationsData);
          if (locationsData.length > 0) {
            setSelectedLocationId(locationsData[0].id);
          }
          setBookings(bookingsData);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Host Portal data load error:', err);
          setIsLoading(false);
        });
    });
  }, []);

  // Load bays for current selected location
  useEffect(() => {
    if (selectedLocationId) {
      apiClient.getBays(selectedLocationId).then(setBays).catch(console.error);
    }
  }, [selectedLocationId]);

  const activeLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];

  return (
    <div className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex font-sans">
      {/* 1. Collapsible Left Sidebar (VoiceCloud Creator Studio Structure) */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#12211C] text-white transition-all duration-200 flex flex-col shrink-0 border-r border-[#1e342d]`}
      >
        {/* Host Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[#1e342d]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center shrink-0">
              H
            </div>
            {sidebarOpen && (
              <div className="whitespace-nowrap">
                <span className="font-bold text-sm tracking-tight text-white block">
                  Host Studio
                </span>
                <span className="text-[10px] text-emerald-400 block -mt-0.5">
                  ParkEazy Workspace
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white p-1 rounded-md"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => handleTabChange('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#22C55E] text-[#12211C] font-semibold'
                : 'text-slate-300 hover:bg-[#1a2e27] hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Overview</span>}
          </button>

          <button
            onClick={() => handleTabChange('bays')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'bays'
                ? 'bg-[#22C55E] text-[#12211C] font-semibold'
                : 'text-slate-300 hover:bg-[#1a2e27] hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Locations & Bays</span>}
          </button>

          <button
            onClick={() => handleTabChange('bookings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'bookings'
                ? 'bg-[#22C55E] text-[#12211C] font-semibold'
                : 'text-slate-300 hover:bg-[#1a2e27] hover:text-white'
            }`}
          >
            <CalendarCheck className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Active Bookings</span>}
          </button>

          <button
            onClick={() => handleTabChange('earnings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'earnings'
                ? 'bg-[#22C55E] text-[#12211C] font-semibold'
                : 'text-slate-300 hover:bg-[#1a2e27] hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span>Earnings & Payouts</span>}
          </button>
        </nav>

        {/* Bottom Switcher to Marketplace */}
        <div className="p-3 border-t border-[#1e342d]">
          <button
            onClick={() => onNavigate('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#1a2e27] transition-colors"
          >
            <ExternalLink className="w-4 h-4 shrink-0 text-emerald-400" />
            {sidebarOpen && <span>Driver Marketplace (/)</span>}
          </button>
        </div>
      </aside>

      {/* 2. Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header with Contextual Breadcrumbs */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-2 text-xs text-slate-500 overflow-hidden">
            <span className="font-semibold text-slate-800">Host Studio</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{activeLocation?.name || 'My Properties'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[#0F766E] font-medium capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Location Switcher */}
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium focus:outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="w-7 h-7 rounded-full bg-[#0F766E] text-white flex items-center justify-center text-xs font-bold">
                M
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  Marcus Chen
                </div>
                <div className="text-[10px] text-emerald-600 font-medium">
                  Verified Host · ID usr-host-001
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 3. Page Content Container */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] mx-auto w-full space-y-6">
          {/* Host KPI Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="md">
              <div className="text-xs text-slate-500 font-medium mb-1">
                Total Accrued Revenue
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                ${earnings ? (earnings.totalAccruedCents / 100).toFixed(2) : '0.00'}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>85% Host net share accrued</span>
              </div>
            </Card>

            <Card padding="md">
              <div className="text-xs text-slate-500 font-medium mb-1">
                Available for Payout
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                ${earnings ? (earnings.availableForPayoutCents / 100).toFixed(2) : '0.00'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Next cycle: Automatic weekly disbursement
              </div>
            </Card>

            <Card padding="md">
              <div className="text-xs text-slate-500 font-medium mb-1">
                Physical Bays Configured
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {bays.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                In current selected location
              </div>
            </Card>

            <Card padding="md">
              <div className="text-xs text-slate-500 font-medium mb-1">
                Escrowed Deposits Held
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                ${earnings ? (earnings.securityDepositsHeldCents / 100).toFixed(2) : '0.00'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Protected in segregated escrow
              </div>
            </Card>
          </div>

          {/* Conditional View by Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Physical Bays Inventory */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Physical Bay Inventory
                    </h3>
                    <p className="text-xs text-slate-500">
                      Each bay has an independent inventory identity.
                    </p>
                  </div>
                  <Badge variant="success">All Live</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bays.map((bay) => (
                    <div
                      key={bay.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            Bay {bay.bayNumber}
                          </div>
                          <div className="text-xs text-slate-500">
                            {bay.bayType} · {bay.levelOrFloor || 'Ground'}
                          </div>
                        </div>
                        <Badge variant="neutral">Available</Badge>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{bay.isEvCharging ? `EV (${bay.evChargerKw}kW)` : 'Standard'}</span>
                        <span className="font-mono">{bay.hasCctv ? 'CCTV Active' : 'No CCTV'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Active Bookings */}
              <div className="lg:col-span-5 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Active & Upcoming Bookings
                  </h3>
                  <p className="text-xs text-slate-500">
                    Live schedule for {activeLocation?.name}
                  </p>
                </div>

                <div className="space-y-3">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          {b.id}
                        </span>
                        <Badge variant={b.status === 'ACTIVE' ? 'success' : 'info'}>
                          {b.status}
                        </Badge>
                      </div>

                      <div className="text-xs text-slate-700 space-y-1">
                        <div>
                          <span className="text-slate-400">Driver:</span> {b.userName}
                        </div>
                        <div>
                          <span className="text-slate-400">Bay:</span> {b.bayNumber}
                        </div>
                        <div>
                          <span className="text-slate-400">License Plate:</span>{' '}
                          <span className="font-mono font-medium">{b.licensePlate || 'N/A'}</span>
                        </div>
                        <div className="pt-2 flex justify-between font-mono text-slate-900 font-bold border-t border-slate-100">
                          <span>Host Net Earning:</span>
                          <span className="text-emerald-700">
                            ${((b.quote.baseAmountCents * 0.85) / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bays' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    All Physical Bays for {activeLocation?.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Managing independent bay identity, vehicle clearances, and EV ratings.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  themeContext="host"
                  onClick={() => alert('Add Bay Wizard will be implemented in Stage 2')}
                >
                  Add New Bay
                </Button>
              </div>

              <Table<ParkingBay>
                columns={[
                  { key: 'bayNumber', header: 'Bay Identifier' },
                  { key: 'bayType', header: 'Bay Type' },
                  { key: 'levelOrFloor', header: 'Level / Section' },
                  {
                    key: 'isEvCharging',
                    header: 'EV Equipped',
                    render: (row) => (row.isEvCharging ? `Yes (${row.evChargerKw} kW)` : 'No'),
                  },
                  {
                    key: 'status',
                    header: 'Current Status',
                    render: (row) => <Badge variant="success">{row.status}</Badge>,
                  },
                ]}
                data={bays}
                keyExtractor={(row) => row.id}
              />
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirmed Booking Schedule
                </h3>
                <p className="text-xs text-slate-500">
                  All customer reservations respect 1h-72h duration bounds and 15m transition buffer.
                </p>
              </div>

              <Table<BookingSummary>
                columns={[
                  { key: 'id', header: 'Booking Ref', className: 'font-mono' },
                  { key: 'bayNumber', header: 'Assigned Bay' },
                  { key: 'userName', header: 'Customer' },
                  { key: 'licensePlate', header: 'Vehicle Plate', className: 'font-mono' },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <Badge variant={row.status === 'ACTIVE' ? 'success' : 'info'}>
                        {row.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'quote',
                    header: 'Total Value',
                    align: 'right',
                    render: (row) => `$${(row.quote.totalPayableCents / 100).toFixed(2)}`,
                  },
                ]}
                data={bookings}
                keyExtractor={(row) => row.id}
              />
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Host Financial Settlement Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Backed by append-only double-entry financial ledger records.
                </p>
              </div>

              <div className="p-6 bg-white rounded-xl border border-slate-200 space-y-4 max-w-xl">
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Total Accrued Earnings:</span>
                  <span className="font-mono font-bold text-slate-900 tabular-nums">
                    ${earnings ? (earnings.totalAccruedCents / 100).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Pending Clearance (Recent Bookings):</span>
                  <span className="font-mono text-slate-700 tabular-nums">
                    ${earnings ? (earnings.pendingClearanceCents / 100).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between text-xs py-1 border-b border-slate-100">
                  <span className="text-slate-600">Lifetime Settled Payouts:</span>
                  <span className="font-mono text-slate-700 tabular-nums">
                    ${earnings ? (earnings.lifetimePayoutsCents / 100).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between text-sm py-2 font-bold text-emerald-800">
                  <span>Available for Instant Payout:</span>
                  <span className="font-mono tabular-nums">
                    ${earnings ? (earnings.availableForPayoutCents / 100).toFixed(2) : '0.00'}
                  </span>
                </div>

                <Button
                  variant="primary"
                  themeContext="host"
                  className="w-full"
                  onClick={() => alert('Payout disbursement will connect with Stripe Connect in Stage 2')}
                >
                  Request Payout Disbursement
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
