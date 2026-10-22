import React, { useState, useEffect } from 'react';
import {
  Building2,
  Car,
  Shield,
  Layers,
  DollarSign,
  CalendarCheck,
  Sliders,
  Star,
  BarChart3,
  User as UserIcon,
  Search,
  Plus,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Header } from './components/Header';
import { HostDashboard } from './components/host/HostDashboard';
import { HostFacilities } from './components/host/HostFacilities';
import { HostBays } from './components/host/HostBays';
import { HostPricing } from './components/host/HostPricing';
import { HostBookings } from './components/host/HostBookings';
import { HostEarnings } from './components/host/HostEarnings';
import { HostReviews } from './components/host/HostReviews';
import { HostReports } from './components/host/HostReports';
import { HostProfile } from './components/host/HostProfile';
import { CustomerSearch } from './components/customer/CustomerSearch';
import { CustomerBookings } from './components/customer/CustomerBookings';
import { AdminConsole } from './components/admin/AdminConsole';
import { User, Facility, Booking } from './types';
import { api } from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<'host' | 'customer' | 'admin'>('host');
  const [hostTab, setHostTab] = useState<string>('dashboard');
  const [customerTab, setCustomerTab] = useState<'search' | 'my_bookings'>('search');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal triggers from dashboard
  const [triggerCreateFacility, setTriggerCreateFacility] = useState(false);
  const [triggerBulkCreateBays, setTriggerBulkCreateBays] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    try {
      setLoading(true);
      const res = await api.getMe();
      setCurrentUser(res.user);
      if (res.user.role === 'host') setActiveRole('host');
      else if (res.user.role === 'admin') setActiveRole('admin');
      else setActiveRole('customer');

      await loadFacilities(res.user.id);
    } catch (err) {
      console.error('App init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFacilities = async (hostId?: string) => {
    try {
      const facs = await api.getFacilities({ hostId });
      setFacilities(facs);
      if (facs.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(facs[0].id);
      }
    } catch (err) {
      console.error('Failed to load facilities', err);
    }
  };

  const handleSelectUser = async (user: User) => {
    setCurrentUser(user);
    if (user.role === 'host') {
      setActiveRole('host');
      await loadFacilities(user.id);
    } else if (user.role === 'admin') {
      setActiveRole('admin');
      await loadFacilities();
    } else {
      setActiveRole('customer');
      await loadFacilities();
    }
  };

  const handleBookingCreated = (booking: Booking) => {
    setCustomerTab('my_bookings');
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-xs">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span>Initializing ParkEazy Platform...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* Universal Header with Role & Account Switcher */}
      <Header
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        onRefreshData={() => loadFacilities(currentUser.id)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* HOST PORTAL */}
        {activeRole === 'host' && (
          <div className="space-y-6">
            {/* Host Sub-Navigation Tabs Bar */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1 overflow-x-auto text-xs">
              <button
                onClick={() => setHostTab('dashboard')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'dashboard'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setHostTab('facilities')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'facilities'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Facilities ({facilities.length})</span>
              </button>

              <button
                onClick={() => setHostTab('bays')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'bays'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Floor Map & Bays</span>
              </button>

              <button
                onClick={() => setHostTab('pricing')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'pricing'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Smart Pricing & Surge</span>
              </button>

              <button
                onClick={() => setHostTab('bookings')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'bookings'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Bookings & Gate Access</span>
              </button>

              <button
                onClick={() => setHostTab('earnings')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'earnings'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Earnings & Payouts</span>
              </button>

              <button
                onClick={() => setHostTab('reviews')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'reviews'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>Reviews</span>
              </button>

              <button
                onClick={() => setHostTab('reports')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'reports'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Reports</span>
              </button>

              <button
                onClick={() => setHostTab('profile')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  hostTab === 'profile'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Host Profile</span>
              </button>
            </div>

            {/* Host Views */}
            {hostTab === 'dashboard' && (
              <HostDashboard
                currentUser={currentUser}
                onNavigateTab={(tab) => setHostTab(tab)}
                onOpenCreateFacility={() => setHostTab('facilities')}
                onOpenBulkCreateBays={() => {
                  setTriggerBulkCreateBays(true);
                  setHostTab('bays');
                }}
              />
            )}

            {hostTab === 'facilities' && (
              <HostFacilities
                facilities={facilities}
                currentUser={currentUser}
                onRefresh={() => loadFacilities(currentUser.id)}
                onSelectFacilityForBays={(facId) => {
                  setSelectedFacilityId(facId);
                  setHostTab('bays');
                }}
                onSelectFacilityForPricing={(facId) => {
                  setSelectedFacilityId(facId);
                  setHostTab('pricing');
                }}
              />
            )}

            {hostTab === 'bays' && (
              <HostBays
                facilities={facilities}
                selectedFacilityId={selectedFacilityId}
                onSelectFacility={(id) => setSelectedFacilityId(id)}
                currentUser={currentUser}
                onRefreshFacilities={() => loadFacilities(currentUser.id)}
                bulkModalOpenInitial={triggerBulkCreateBays}
              />
            )}

            {hostTab === 'pricing' && (
              <HostPricing
                facilities={facilities}
                selectedFacilityId={selectedFacilityId}
                onSelectFacility={(id) => setSelectedFacilityId(id)}
                currentUser={currentUser}
              />
            )}

            {hostTab === 'bookings' && (
              <HostBookings
                currentUser={currentUser}
                facilities={facilities}
              />
            )}

            {hostTab === 'earnings' && (
              <HostEarnings currentUser={currentUser} />
            )}

            {hostTab === 'reviews' && (
              <HostReviews
                facilities={facilities}
                currentUser={currentUser}
              />
            )}

            {hostTab === 'reports' && (
              <HostReports currentUser={currentUser} />
            )}

            {hostTab === 'profile' && (
              <HostProfile
                currentUser={currentUser}
                onRefresh={() => handleSelectUser(currentUser)}
              />
            )}
          </div>
        )}

        {/* CUSTOMER PORTAL */}
        {activeRole === 'customer' && (
          <div className="space-y-6">
            {/* Customer Sub-Navigation */}
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-1 text-xs self-start w-fit">
              <button
                onClick={() => setCustomerTab('search')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-colors ${
                  customerTab === 'search'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search & Reserve</span>
              </button>

              <button
                onClick={() => setCustomerTab('my_bookings')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium transition-colors ${
                  customerTab === 'my_bookings'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>My Reservations & Access Passes</span>
              </button>
            </div>

            {customerTab === 'search' && (
              <CustomerSearch
                currentUser={currentUser}
                onBookingCreated={handleBookingCreated}
              />
            )}

            {customerTab === 'my_bookings' && (
              <CustomerBookings
                currentUser={currentUser}
                onRefresh={() => loadFacilities()}
              />
            )}
          </div>
        )}

        {/* ADMIN CONSOLE */}
        {activeRole === 'admin' && (
          <AdminConsole
            currentUser={currentUser}
            onRefreshAll={() => loadFacilities()}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-bold text-slate-800">ParkEazy Host & Parking Operations Engine</span>
            <span>·</span>
            <span>Version 2.4.0 (Host-Basline-PH00 Full Implementation)</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Durable Persistence · ACID Double-Entry Ledger · Automated IoT Access
          </div>
        </div>
      </footer>
    </div>
  );
}
