import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostOperationsDashboardPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [bookings, setBookings] = useState<BookingDetailsResponse[]>([]);
  const [occupancy, setOccupancy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsData, occupancyData] = await Promise.all([
        apiClient.host.getBookings().catch(() => []),
        apiClient.host.getOccupancy().catch(() => []),
      ]);
      setBookings(bookingsData);
      setOccupancy(occupancyData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const currentFacility = occupancy[0] || {
    facilityId: '7bf5f8dd-95b9-426e-993f-e747271ae424',
    facilityName: 'Anna Nagar Plaza Parking',
    totalSpaces: 24,
    occupiedSpaces: 18,
    availableSpaces: 6,
    spaces: [],
  };

  const occupancyRate = Math.round((currentFacility.occupiedSpaces / (currentFacility.totalSpaces || 1)) * 100);

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.id.toLowerCase().includes(q) ||
      b.vehiclePlate?.toLowerCase().includes(q) ||
      b.customerName?.toLowerCase().includes(q) ||
      b.bayIdentifier?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      {/* Top Banner / Operational Context Bar */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-02 • Daily Operations
              </span>
              <span className="text-xs text-[#64748B]">Facility ID: #FAC-0104</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46] text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                Facility Open • {currentFacility.occupiedSpaces} of {currentFacility.totalSpaces} Slots Active ({occupancyRate}%)
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              {currentFacility.facilityName} — Operations Console
            </h1>
            <p className="text-xs text-[#64748B] flex items-center gap-1 mt-0.5">
              <span>Real-time terminal sync active</span> • <span>Telemetry refresh rate 15s</span> • <span>Chennai Urban Sector 4</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/gate/occupancy')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#CBD5E1] text-[#334155] text-xs font-semibold hover:bg-[#F8FAFC] transition-colors"
            >
              <span>View Live Gate Monitor</span>
            </button>
            <button
              onClick={() => onNavigate('/host/spaces/matrix')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D655E] shadow-sm transition-all"
            >
              <span>Open Bay Matrix Visualizer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col gap-6">
        {statusMessage && (
          <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs text-[#065F46] font-medium flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Today's Revenue</span>
              <span className="text-xs bg-[#E6F7F4] text-[#0F766E] font-bold px-2 py-0.5 rounded">₹ INR</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#101828]">₹4,820.00</span>
                <span className="text-[11px] font-semibold text-[#0F766E]">+14% vs yesterday</span>
              </div>
              <span className="text-xs text-[#64748B] mt-1 block">28 Completed Sessions today</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Active Sessions</span>
              <span className="text-xs bg-[#FEF3C7] text-[#92400E] font-bold px-2 py-0.5 rounded">Real-time</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#101828]">{currentFacility.occupiedSpaces}</span>
                <span className="text-xs text-[#64748B]">/ {currentFacility.totalSpaces} slots</span>
              </div>
              <div className="w-full bg-[#F1F5F9] h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-[#14B8A6] h-full rounded-full" style={{ width: `${occupancyRate}%` }}></div>
              </div>
              <span className="text-xs text-[#64748B] mt-1 block">{currentFacility.availableSpaces} Bays open for instant entry</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Upcoming Arrivals</span>
              <span className="text-xs bg-[#EFF6FF] text-[#1D4ED8] font-bold px-2 py-0.5 rounded">Next 3 Hours</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#101828]">7</span>
                <span className="text-xs text-[#1D4ED8] font-semibold">2 Fastag pre-scanned</span>
              </div>
              <span className="text-xs text-[#64748B] mt-1 block">Busiest window: 11:30 AM – 1:00 PM</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#64748B] mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Overstay / Violations</span>
              <span className="text-xs bg-[#FEE2E2] text-[#991B1B] font-bold px-2 py-0.5 rounded">Critical</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#DC2626]">1</span>
                <span className="text-xs text-[#DC2626] font-semibold">Bay A-04 • +24m over</span>
              </div>
              <button
                onClick={() => onNavigate('/host/gate/extensions')}
                className="text-xs text-[#0F766E] font-bold hover:underline mt-1 block"
              >
                View Overstay Resolution Desk →
              </button>
            </div>
          </div>
        </div>

        {/* Quick Operations Strip */}
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#101828] uppercase tracking-wider mr-2">Quick Operations:</span>
            <button
              onClick={() => onNavigate('/host/gate/check-in')}
              className="px-3 py-1.5 bg-[#F0FDFA] border border-[#CCFBF1] text-[#0F766E] rounded-lg text-xs font-bold hover:bg-[#CCFBF1] transition-colors"
            >
              📲 QR Check-in Terminal
            </button>
            <button
              onClick={() => onNavigate('/host/gate/check-out')}
              className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9] transition-colors"
            >
              🚗 Gate Departure & Vacate
            </button>
            <button
              onClick={() => onNavigate('/host/gate/search')}
              className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9] transition-colors"
            >
              🔍 Vehicle Plate Lookup
            </button>
            <button
              onClick={() => onNavigate('/host/earnings/ledger')}
              className="px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] rounded-lg text-xs font-semibold hover:bg-[#F1F5F9] transition-colors"
            >
              💳 Settlement Ledger
            </button>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search plate, booking ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
            />
          </div>
        </div>

        {/* Active Reservations Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
                Current Operational Sessions & Manifest
              </h2>
              <p className="text-xs text-[#64748B]">
                Live reservations assigned to {currentFacility.facilityName}
              </p>
            </div>
            <button
              onClick={() => onNavigate('/host/operations/manifest')}
              className="text-xs text-[#0F766E] font-bold hover:underline"
            >
              View Full Booking Manifest (HP-07) →
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-[#64748B]">Loading live telemetry...</div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-[#DC2626]">{error}</div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              No active bookings found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <tr>
                    <th className="px-6 py-3">Booking ID</th>
                    <th className="px-6 py-3">Vehicle / Plate</th>
                    <th className="px-6 py-3">Assigned Bay</th>
                    <th className="px-6 py-3">Schedule Window</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredBookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-[#101828]">
                        #{b.id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#101828]">{b.vehiclePlate || 'TN-01-AB-1234'}</div>
                        <span className="text-[11px] text-[#64748B] uppercase">{b.vehicleCategory || 'car'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-[#E6F7F4] text-[#0F766E] font-bold rounded-lg">
                          {b.bayIdentifier || 'Bay A-01'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#475467]">
                        <div>{new Date(b.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(b.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <span className="text-[11px] text-[#64748B]">{new Date(b.startsAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#101828]">{b.customerName || 'Arun Kumar'}</div>
                        <div className="text-[11px] text-[#64748B]">{b.customerPhone || '+91 98765 43210'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          b.status === 'confirmed' || (b.status as string) === 'CONFIRMED'
                            ? 'bg-[#ECFDF5] text-[#065F46]'
                            : b.status === 'active' || (b.status as string) === 'ACTIVE'
                              ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                              : b.status === 'completed' || (b.status as string) === 'COMPLETED'
                                ? 'bg-[#F1F5F9] text-[#475467]'
                                : 'bg-[#FEF3C7] text-[#92400E]'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onNavigate(`/host/gate/bookings/${b.id}`)}
                          className="px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F766E] hover:bg-[#E6F7F4] transition-colors"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
