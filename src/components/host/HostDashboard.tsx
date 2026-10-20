import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ParkingCircle,
  TrendingUp,
  Clock,
  Plus,
  Layers,
  Sliders,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Car,
  Activity,
  CalendarCheck
} from 'lucide-react';
import { User, Facility, Booking, ParkingBay } from '../../types';
import { api } from '../../api';

interface HostDashboardProps {
  currentUser: User;
  onNavigateTab: (tab: string) => void;
  onOpenCreateFacility: () => void;
  onOpenBulkCreateBays: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  currentUser,
  onNavigateTab,
  onOpenCreateFacility,
  onOpenBulkCreateBays
}) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [financials, setFinancials] = useState<{
    availableBalance: number;
    pendingPayouts: number;
    lifetimeEarnings: number;
    lifetimePayouts: number;
  }>({
    availableBalance: 0,
    pendingPayouts: 0,
    lifetimeEarnings: 0,
    lifetimePayouts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [facs, bks, fin] = await Promise.all([
        api.getFacilities({ hostId: currentUser.id }),
        api.getBookings(),
        api.getEarningsSummary(currentUser.id)
      ]);
      setFacilities(facs);
      setBookings(bks);
      setFinancials(fin);
    } catch (err) {
      console.error('Failed to load host dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in');
  const checkedInCount = bookings.filter(b => b.status === 'checked_in').length;
  const totalBaysCount = facilities.reduce((acc, f) => acc + (f.totalBays || 0), 0);
  const occupancyRate = totalBaysCount > 0 ? Math.round((checkedInCount / totalBaysCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 border border-slate-700/60 shadow-xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Host Verified
              </span>
              <span className="text-xs text-slate-400">
                {currentUser.businessDetails?.businessName || 'Property Operator'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {currentUser.fullName}
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Your facilities are operational. Monitor real-time bay occupancy, adjust dynamic pricing rules, approve bookings, and transfer payout earnings to your bank account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenCreateFacility}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Facility</span>
            </button>
            <button
              onClick={onOpenBulkCreateBays}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <Layers className="w-4 h-4" />
              <span>Bulk Create Bays</span>
            </button>
            <button
              onClick={() => onNavigateTab('payouts')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-medium text-xs rounded-xl transition-all active:scale-95"
            >
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Request Payout</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Available Balance</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ${financials.availableBalance.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>Lifetime: ${financials.lifetimeEarnings.toFixed(2)}</span>
            <button
              onClick={() => onNavigateTab('payouts')}
              className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-0.5"
            >
              Payout <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Current Occupancy */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Live Occupancy</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{occupancyRate}%</span>
            <span className="text-xs text-slate-500">
              ({checkedInCount} of {totalBaysCount} bays in-use)
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, occupancyRate))}%` }}
            />
          </div>
        </div>

        {/* Active Reservations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Active Reservations</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {activeBookings.length}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>{checkedInCount} vehicles on-site</span>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-0.5"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Managed Facilities */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Managed Facilities</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <ParkingCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {facilities.length}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span>{facilities.filter(f => f.status === 'active').length} active listings</span>
            <button
              onClick={() => onNavigateTab('facilities')}
              className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-0.5"
            >
              Manage <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Facilities Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Your Parking Properties
            </h2>
            <button
              onClick={() => onNavigateTab('facilities')}
              className="text-xs text-sky-600 hover:text-sky-700 font-medium"
            >
              View details & operating rules →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilities.map(facility => (
              <div
                key={facility.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                      {facility.name}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        facility.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : facility.status === 'under_review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {facility.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                    {facility.address}, {facility.city}, {facility.state}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg mb-3">
                    <div>
                      <span className="text-slate-400">Total Bays:</span>{' '}
                      <span className="font-medium text-slate-800">{facility.totalBays}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Clearance:</span>{' '}
                      <span className="font-medium text-slate-800">{facility.clearanceHeightMeters}m</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Gate Type:</span>{' '}
                      <span className="font-medium text-slate-800 capitalize">
                        {facility.gateType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Hours:</span>{' '}
                      <span className="font-medium text-slate-800">
                        {facility.operatingHours.is24x7 ? '24/7' : 'Standard'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onNavigateTab('bays')}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg text-center transition-colors"
                  >
                    Bays Map
                  </button>
                  <button
                    onClick={() => onNavigateTab('pricing')}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg text-center transition-colors"
                  >
                    Rates & Surge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Gate Barrier & Recent Activity Stream */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Live Barrier & Access Log
            </h2>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs text-sky-600 hover:text-sky-700 font-medium"
            >
              Gate simulator →
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">IoT Controller</span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                ONLINE (48ms)
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {bookings.slice(0, 5).map(b => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{b.bookingReference}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        b.status === 'checked_in'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.status === 'confirmed'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-slate-600 text-[11px] flex items-center justify-between">
                    <span>{b.customerName} ({b.licensePlate})</span>
                    <span className="font-medium text-emerald-700">+${b.hostNetEarnings.toFixed(2)}</span>
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Window: {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
