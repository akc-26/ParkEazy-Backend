import React, { useState, useEffect } from 'react';
import { CustomerHeader } from '../components/customer/CustomerHeader';
import { HostHeader } from '../components/host/HostHeader';
import { AdminHeader } from '../components/admin/AdminHeader';
import { HostLogin } from '../components/host/HostLogin';
import { AdminLogin } from '../components/admin/AdminLogin';
import { HostSidebar } from '../components/host/HostSidebar';
import { HostDashboard } from '../components/host/HostDashboard';
import { HostFacilities } from '../components/host/HostFacilities';
import { HostBays } from '../components/host/HostBays';
import { HostPricing } from '../components/host/HostPricing';
import { HostBookings } from '../components/host/HostBookings';
import { HostEarnings } from '../components/host/HostEarnings';
import { HostReviews } from '../components/host/HostReviews';
import { HostReports } from '../components/host/HostReports';
import { HostProfile } from '../components/host/HostProfile';
import { CustomerHome } from '../components/customer/CustomerHome';
import { CustomerBookings } from '../components/customer/CustomerBookings';
import { UserFooter } from '../components/customer/UserFooter';
import { AdminConsole } from '../components/admin/AdminConsole';
import { User, Facility, Booking } from '../types';
import { api } from '../api';

type AppRoute = 'customer' | 'host' | 'admin';

export default function App() {
  // Current route resolved from window.location.pathname
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/host')) return 'host';
    return 'customer';
  });

  // Host state
  const [hostUser, setHostUser] = useState<User | null>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostTab, setHostTab] = useState<string>('dashboard');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [triggerBulkCreateBays, setTriggerBulkCreateBays] = useState(false);

  // Admin state
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  // Customer state
  const [customerUser, setCustomerUser] = useState<User | null>(null);
  const [customerTab, setCustomerTab] = useState<'home' | 'my_bookings'>('home');

  // Fallback demo customer for unauthenticated browsing
  const defaultDemoCustomer: User = {
    id: 'usr_cust1',
    email: 'alex.driver@example.com',
    fullName: 'Alex Driver',
    phone: '+1 (206) 555-0188',
    role: 'customer',
    status: 'active',
    isEmailVerified: true,
  };

  // Sync route with browser history
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        setCurrentRoute('admin');
      } else if (path.startsWith('/host')) {
        setCurrentRoute('host');
      } else {
        setCurrentRoute('customer');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Route-specific session initialization
  useEffect(() => {
    if (currentRoute === 'host') {
      api.setActiveContext('host');
      initHostSession();
    } else if (currentRoute === 'admin') {
      api.setActiveContext('admin');
      initAdminSession();
    } else {
      api.setActiveContext('customer');
      initCustomerSession();
    }
  }, [currentRoute]);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    if (path.startsWith('/admin')) {
      setCurrentRoute('admin');
    } else if (path.startsWith('/host')) {
      setCurrentRoute('host');
    } else {
      setCurrentRoute('customer');
    }
  };

  // ----------------- HOST SESSION -----------------
  const initHostSession = async () => {
    try {
      setHostLoading(true);
      const host = await api.getHostUser();
      setHostUser(host);
      if (host) {
        await loadHostFacilities(host.id);
      }
    } catch (err) {
      console.error('Error verifying host session:', err);
      setHostUser(null);
    } finally {
      setHostLoading(false);
    }
  };

  const loadHostFacilities = async (hostId: string) => {
    try {
      const facs = await api.getFacilities({ hostId });
      setFacilities(facs);
      if (facs.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(facs[0].id);
      }
    } catch (err) {
      console.error('Failed to load host facilities:', err);
    }
  };

  const handleHostLoginSuccess = async (user: User) => {
    setHostUser(user);
    setHostTab('dashboard');
    await loadHostFacilities(user.id);
  };

  const handleHostLogout = async () => {
    await api.logoutHost();
    setHostUser(null);
    setFacilities([]);
    setSelectedFacilityId(null);
  };

  // ----------------- ADMIN SESSION -----------------
  const initAdminSession = async () => {
    try {
      setAdminLoading(true);
      const admin = await api.getAdminUser();
      setAdminUser(admin);
    } catch (err) {
      console.error('Error verifying admin session:', err);
      setAdminUser(null);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLoginSuccess = (user: User) => {
    setAdminUser(user);
  };

  const handleAdminLogout = async () => {
    await api.logoutAdmin();
    setAdminUser(null);
  };

  // ----------------- CUSTOMER SESSION -----------------
  const initCustomerSession = async () => {
    try {
      const cust = await api.getCustomerUser();
      setCustomerUser(cust);
    } catch {
      setCustomerUser(null);
    }
  };

  const handleBookingCreated = (booking: Booking) => {
    setCustomerTab('my_bookings');
  };

  // =========================================================================
  // VIEW ROUTER: Distinct route-based experiences for Customer, Host, Admin
  // =========================================================================

  // ----------------- 1. HOST ROUTE (/host) -----------------
  if (currentRoute === 'host') {
    if (hostLoading) {
      return (
        <div className="min-h-screen bg-[#F0F4F3] flex items-center justify-center text-xs text-[#162A2D]">
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-4 h-4 border-2 border-[#087E8A] border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold">Verifying Host Session...</span>
          </div>
        </div>
      );
    }

    // Unauthenticated: Show Host Login page
    if (!hostUser) {
      return (
        <HostLogin
          onLoginSuccess={handleHostLoginSuccess}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    // Authenticated: Show Host Workspace
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col font-sans text-[#162A2D]">
        <HostHeader
          currentUser={hostUser}
          facilities={facilities}
          selectedFacilityId={selectedFacilityId}
          onSelectFacility={setSelectedFacilityId}
          onLogout={handleHostLogout}
          onNavigateToCustomer={() => navigate('/')}
        />

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Left Sidebar Navigation */}
            <HostSidebar
              currentTab={hostTab}
              onSelectTab={(tab) => setHostTab(tab)}
              currentUser={hostUser}
              facilitiesCount={facilities.length}
            />

            {/* Right-Hand Content Area */}
            <div className="flex-1 min-w-0 w-full space-y-6">
              {hostTab === 'dashboard' && (
                <HostDashboard
                  currentUser={hostUser}
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
                  currentUser={hostUser}
                  onRefresh={() => loadHostFacilities(hostUser.id)}
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
                  currentUser={hostUser}
                  onRefreshFacilities={() => loadHostFacilities(hostUser.id)}
                  bulkModalOpenInitial={triggerBulkCreateBays}
                />
              )}

              {hostTab === 'pricing' && (
                <HostPricing
                  facilities={facilities}
                  selectedFacilityId={selectedFacilityId}
                  onSelectFacility={(id) => setSelectedFacilityId(id)}
                  currentUser={hostUser}
                />
              )}

              {hostTab === 'bookings' && (
                <HostBookings
                  currentUser={hostUser}
                  facilities={facilities}
                />
              )}

              {hostTab === 'earnings' && (
                <HostEarnings currentUser={hostUser} />
              )}

              {hostTab === 'reviews' && (
                <HostReviews
                  facilities={facilities}
                  currentUser={hostUser}
                />
              )}

              {hostTab === 'reports' && (
                <HostReports currentUser={hostUser} />
              )}

              {hostTab === 'profile' && (
                <HostProfile
                  currentUser={hostUser}
                  onRefresh={() => loadHostFacilities(hostUser.id)}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ----------------- 2. ADMIN ROUTE (/admin) -----------------
  if (currentRoute === 'admin') {
    if (adminLoading) {
      return (
        <div className="min-h-screen bg-[#F4F8FC] flex items-center justify-center text-xs text-slate-800">
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-4 h-4 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
            <span className="font-semibold">Authorizing Administrator...</span>
          </div>
        </div>
      );
    }

    // Unauthenticated: Show Admin Login page
    if (!adminUser) {
      return (
        <AdminLogin
          onLoginSuccess={handleAdminLoginSuccess}
          onNavigateHome={() => navigate('/')}
        />
      );
    }

    // Authenticated: Show Admin Moderation Console
    return (
      <div className="min-h-screen bg-[#F4F8FC] flex flex-col font-sans text-slate-900">
        <AdminHeader
          currentUser={adminUser}
          onLogout={handleAdminLogout}
          onNavigateToCustomer={() => navigate('/')}
        />

        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <AdminConsole
            currentUser={adminUser}
            onRefreshAll={() => {}}
          />
        </main>
      </div>
    );
  }

  // ----------------- 3. CUSTOMER ROUTE (/) -----------------
  const activeCustomer = customerUser || defaultDemoCustomer;

  return (
    <div className="min-h-screen bg-[#F4F8F7] flex flex-col font-sans text-[#162A2D]">
      {/* Public Customer Header (No Host/Admin Switching Tabs, No identity dropdown) */}
      <CustomerHeader
        currentUser={customerUser}
        activeCustomerTab={customerTab}
        onSelectCustomerTab={setCustomerTab}
        onNavigateToHost={() => navigate('/host')}
        onCustomerAuthChange={setCustomerUser}
      />

      {/* Customer Main Viewport */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 py-4">
          {customerTab === 'home' ? (
            <CustomerHome
              currentUser={activeCustomer}
              onBookingCreated={handleBookingCreated}
              onViewMyBookings={() => setCustomerTab('my_bookings')}
              onNavigateToHostPortal={() => navigate('/host')}
            />
          ) : (
            <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <CustomerBookings
                currentUser={activeCustomer}
                onRefresh={() => {}}
              />
            </div>
          )}
        </div>

        {/* Established Customer Footer */}
        <UserFooter
          onOpenHostPortal={() => navigate('/host')}
          onOpenAdminPortal={() => navigate('/admin')}
          onNavigateHome={() => {
            navigate('/');
            setCustomerTab('home');
          }}
        />
      </div>
    </div>
  );
}
