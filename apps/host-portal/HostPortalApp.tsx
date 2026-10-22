import React, { useState, useEffect, useCallback } from 'react';
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
  LogOut,
  UserCheck,
  FileText,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { Button, Card, Badge, Table, Tabs } from '../../packages/ui';
import { apiClient } from '../../packages/api-client';
import {
  ParkingLocation,
  ParkingBay,
  BookingSummary,
  HostEarningsSummary,
  BayStatus,
  SessionUser,
  UserRole,
} from '../../packages/contracts';

import { HostLoginView } from './views/HostLoginView';
import { HostRegisterView } from './views/HostRegisterView';
import { HostVerifyView } from './views/HostVerifyView';
import { HostForgotPasswordView } from './views/HostForgotPasswordView';
import { HostOnboardingOverviewView } from './views/HostOnboardingOverviewView';
import { HostOnboardingProfileView } from './views/HostOnboardingProfileView';
import { HostOnboardingEligibilityView } from './views/HostOnboardingEligibilityView';
import { HostApplicationStatusView } from './views/HostApplicationStatusView';
import { HostExceptionsView } from './views/HostExceptionsView';
import { HostSpacesOverviewView } from './views/HostSpacesOverviewView';
import { HostFacilityCreateView } from './views/HostFacilityCreateView';
import { HostFacilityDetailView } from './views/HostFacilityDetailView';
import { HostFacilityLayoutView } from './views/HostFacilityLayoutView';
import { HostSpaceEditView } from './views/HostSpaceEditView';
import { HostSpaceRestrictionsView } from './views/HostSpaceRestrictionsView';
import { HostSpaceAmenitiesView } from './views/HostSpaceAmenitiesView';
import { HostFacilityPreviewView } from './views/HostFacilityPreviewView';
import { HostFacilityPublishView } from './views/HostFacilityPublishView';

interface HostPortalAppProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
}

export const HostPortalApp: React.FC<HostPortalAppProps> = ({
  currentPath = '/host/',
  onNavigate,
}) => {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Restore authenticated session on load
  const refreshSession = useCallback(async () => {
    try {
      const session = await apiClient.getSession();
      setCurrentUser(session.user);
      return session.user;
    } catch {
      setCurrentUser(null);
      return null;
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const handleLogout = useCallback(() => {
    apiClient.setAuthToken(null);
    setCurrentUser(null);
    onNavigate('/host/login');
  }, [onNavigate]);

  const handleLoginSuccess = useCallback((user: SessionUser) => {
    setCurrentUser(user);
  }, []);

  // Normalize path without trailing slashes
  const cleanPath = currentPath.replace(/\/+$/, '') || '/host';

  // --------------------------------------------------------------------------
  // Dedicated Host Authentication & Onboarding Routes (Phase 1 Approved Scope)
  // --------------------------------------------------------------------------

  // Screen pe_hw_01_01: Host Sign-In
  if (cleanPath === '/host/login') {
    return (
      <HostLoginView
        onNavigate={onNavigate}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Screen pe_hw_01_02: Host Registration
  if (cleanPath === '/host/register') {
    return (
      <HostRegisterView
        onNavigate={onNavigate}
        onRegisterSuccess={handleLoginSuccess}
      />
    );
  }

  // Screen pe_hw_01_03: Verification
  if (cleanPath === '/host/verify') {
    return (
      <HostVerifyView
        currentUser={currentUser}
        onNavigate={onNavigate}
        onVerificationSuccess={handleLoginSuccess}
      />
    );
  }

  // Screen pe_hw_01_04: Password Recovery
  if (cleanPath === '/host/forgot-password') {
    return (
      <HostForgotPasswordView
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_01_05: Onboarding Overview
  if (cleanPath === '/host/onboarding') {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostExceptionsView
          currentUser={null}
          exceptionType="UNAUTHENTICATED"
          onNavigate={onNavigate}
        />
      );
    }
    return (
      <HostOnboardingOverviewView
        currentUser={currentUser}
        onNavigate={onNavigate}
        onLogout={handleLogout}
      />
    );
  }

  // Screen pe_hw_01_06: Onboarding Profile & Contact Details
  if (cleanPath === '/host/onboarding/profile') {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostExceptionsView
          currentUser={null}
          exceptionType="UNAUTHENTICATED"
          onNavigate={onNavigate}
        />
      );
    }
    return (
      <HostOnboardingProfileView
        currentUser={currentUser}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_01_07: Onboarding Eligibility
  if (cleanPath === '/host/onboarding/eligibility') {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostExceptionsView
          currentUser={null}
          exceptionType="UNAUTHENTICATED"
          onNavigate={onNavigate}
        />
      );
    }
    return (
      <HostOnboardingEligibilityView
        currentUser={currentUser}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_01_08: Host Application Status
  if (cleanPath === '/host/application-status') {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostExceptionsView
          currentUser={null}
          exceptionType="UNAUTHENTICATED"
          onNavigate={onNavigate}
        />
      );
    }
    return (
      <HostApplicationStatusView
        currentUser={currentUser}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_01_09: Exception Center
  if (cleanPath === '/host/exceptions') {
    return (
      <HostExceptionsView
        currentUser={currentUser}
        onNavigate={onNavigate}
      />
    );
  }

  // --------------------------------------------------------------------------
  // Phase 2: Host Facility & Parking-Space Inventory Management
  // --------------------------------------------------------------------------

  // Screen pe_hw_02_01: Facility/Space Overview
  if (cleanPath === '/host/spaces') {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostSpacesOverviewView
        currentUser={currentUser}
        onNavigate={onNavigate}
        onLogout={handleLogout}
      />
    );
  }

  // Screen pe_hw_02_02: Facility Creation Wizard
  if (cleanPath === '/host/facilities/new') {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostFacilityCreateView
        currentUser={currentUser}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_02_04: Physical Inventory and Bay Layout
  const layoutMatch = cleanPath.match(/^\/host\/facilities\/([^/]+)\/layout$/);
  if (layoutMatch) {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostFacilityLayoutView
        currentUser={currentUser}
        facilityId={layoutMatch[1]}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_02_08: Listing Preview
  const previewMatch = cleanPath.match(/^\/host\/facilities\/([^/]+)\/preview$/);
  if (previewMatch) {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostFacilityPreviewView
        currentUser={currentUser}
        facilityId={previewMatch[1]}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_02_09: Publication Readiness and Validation
  const publishMatch = cleanPath.match(/^\/host\/facilities\/([^/]+)\/publish$/);
  if (publishMatch) {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostFacilityPublishView
        currentUser={currentUser}
        facilityId={publishMatch[1]}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_02_05: Core Space Attributes Editor
  const spaceEditMatch =
    cleanPath.match(/^\/host\/spaces\/([^/]+)\/edit$/) ||
    cleanPath.match(/^\/host\/facilities\/[^/]+\/spaces\/([^/]+)\/edit$/);
  if (spaceEditMatch) {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostSpaceEditView
        currentUser={currentUser}
        spaceId={spaceEditMatch[1]}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_02_06: Vehicle Restrictions and Clearance
  const spaceRestMatch =
    cleanPath.match(/^\/host\/spaces\/([^/]+)\/restrictions$/) ||
    cleanPath.match(/^\/host\/facilities\/[^/]+\/spaces\/([^/]+)\/restrictions$/);
  if (spaceRestMatch) {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostSpaceRestrictionsView
        currentUser={currentUser}
        spaceId={spaceRestMatch[1]}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_02_07: Amenities and Driver Access Instructions
  const spaceAmenMatch =
    cleanPath.match(/^\/host\/spaces\/([^/]+)\/amenities$/) ||
    cleanPath.match(/^\/host\/facilities\/[^/]+\/spaces\/([^/]+)\/amenities$/);
  if (spaceAmenMatch) {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostSpaceAmenitiesView
        currentUser={currentUser}
        spaceId={spaceAmenMatch[1]}
        onNavigate={onNavigate}
      />
    );
  }

  // Screen pe_hw_02_03: Facility Detail and Management
  const facilityDetailMatch = cleanPath.match(/^\/host\/facilities\/([^/]+)$/);
  if (facilityDetailMatch && facilityDetailMatch[1] !== 'new') {
    if (!isAuthChecking && !currentUser) {
      return (
        <HostLoginView
          onNavigate={onNavigate}
          onLoginSuccess={handleLoginSuccess}
          returnUrl={currentPath}
        />
      );
    }
    return (
      <HostFacilityDetailView
        currentUser={currentUser}
        facilityId={facilityDetailMatch[1]}
        onNavigate={onNavigate}
      />
    );
  }

  // --------------------------------------------------------------------------
  // Authenticated Host Studio Dashboard (/host/, /host/bays, /host/bookings, /host/earnings)
  // --------------------------------------------------------------------------

  // If unauthenticated, redirect to host sign in
  if (!isAuthChecking && !currentUser) {
    return (
      <HostLoginView
        onNavigate={onNavigate}
        onLoginSuccess={handleLoginSuccess}
        returnUrl={currentPath}
      />
    );
  }

  return (
    <HostDashboardWorkspace
      currentUser={currentUser}
      currentPath={cleanPath}
      onNavigate={onNavigate}
      onLogout={handleLogout}
    />
  );
};

// ----------------------------------------------------------------------------
// Internal Sub-component: Host Dashboard Workspace
// ----------------------------------------------------------------------------

interface HostDashboardWorkspaceProps {
  currentUser: SessionUser | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const HostDashboardWorkspace: React.FC<HostDashboardWorkspaceProps> = ({
  currentUser,
  currentPath,
  onNavigate,
  onLogout,
}) => {
  const getTabFromPath = (path: string): 'overview' | 'bays' | 'bookings' | 'earnings' => {
    if (path.includes('/bays')) return 'bays';
    if (path.includes('/bookings')) return 'bookings';
    if (path.includes('/earnings')) return 'earnings';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'bays' | 'bookings' | 'earnings'>(
    getTabFromPath(currentPath)
  );

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

  // Load Host Portal data for the authenticated host
  useEffect(() => {
    const hostId = currentUser?.id || 'usr-host-001';
    Promise.all([
      apiClient.getHostEarnings(hostId).catch(() => null),
      apiClient.getLocations().catch(() => []),
      apiClient.getBookings().catch(() => []),
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
  }, [currentUser]);

  // Load bays for current selected location
  useEffect(() => {
    if (selectedLocationId) {
      apiClient.getBays(selectedLocationId).then(setBays).catch(console.error);
    }
  }, [selectedLocationId]);

  const activeLocation = locations.find((l) => l.id === selectedLocationId) || locations[0];

  return (
    <div className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex font-sans">
      {/* 1. Collapsible Left Sidebar */}
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
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
            title="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 flex-1">
          {[
            { id: 'overview', label: 'Facility Overview', icon: LayoutDashboard },
            { id: 'bays', label: 'Parking Bays', icon: Layers },
            { id: 'bookings', label: 'Bookings & Holds', icon: CalendarCheck },
            { id: 'earnings', label: 'Payouts & Ledger', icon: DollarSign },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#22C55E] text-[#12211C] font-bold shadow-xs'
                    : 'text-slate-300 hover:bg-[#1B2F28] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#12211C]' : 'text-slate-400'}`} />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-[#1e342d]">
            <span
              className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1 block ${
                !sidebarOpen && 'hidden'
              }`}
            >
              Account &amp; Onboarding
            </span>
            <button
              onClick={() => onNavigate('/host/onboarding')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-[#1B2F28] hover:text-white transition-colors"
            >
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              {sidebarOpen && <span>Onboarding Setup</span>}
            </button>
            <button
              onClick={() => onNavigate('/host/application-status')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-[#1B2F28] hover:text-white transition-colors"
            >
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              {sidebarOpen && <span>Application Status</span>}
            </button>
            <button
              onClick={() => onNavigate('/host/exceptions')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-[#1B2F28] hover:text-white transition-colors"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              {sidebarOpen && <span>Exception Center</span>}
            </button>
          </div>
        </nav>

        {/* User Identity & Logout */}
        <div className="p-3 border-t border-[#1e342d]">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {currentUser?.firstName?.[0] || 'H'}
              </div>
              {sidebarOpen && (
                <div className="overflow-hidden">
                  <span className="text-xs font-semibold text-white block truncate">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {currentUser?.email}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Content View */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-800">Facility Location:</span>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.address?.city || ''}, {loc.address?.state || ''})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Rate: <strong className="text-slate-800 font-mono">${((activeLocation?.hourlyRateCents || 500) / 100).toFixed(2)}/hr</strong>
            </span>
            <Badge variant="success">Operational</Badge>
            <button
              onClick={() => onNavigate('/')}
              className="text-xs text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <span>Driver Website</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </header>

        {/* Main Section */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Metrics & Quick Bays */}
              <div className="lg:col-span-7 space-y-6">
                {/* Metric Strip */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 block">Total Physical Bays</span>
                    <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
                      {bays.length}
                    </span>
                    <span className="text-[11px] text-emerald-600 mt-0.5 block flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> 100% Configured
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 block">Active Bookings</span>
                    <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
                      {bookings.filter((b) => b.status === 'ACTIVE' || b.status === 'CONFIRMED').length}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      15m buffer enforced
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="text-xs text-slate-500 block">Accrued Earnings</span>
                    <span className="text-2xl font-bold font-mono text-emerald-800 mt-1 block">
                      ${earnings ? (earnings.totalAccruedCents / 100).toFixed(2) : '0.00'}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Double-entry verified
                    </span>
                  </div>
                </div>

                {/* Bay Roster Grid */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    Bays at {activeLocation?.name}
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Physical bay status, clearances, and independent identity codes.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bays.map((bay) => (
                    <div
                      key={bay.id}
                      className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900 font-mono">
                          {bay.bayNumber}
                        </span>
                        <Badge variant={bay.status === 'AVAILABLE' ? 'success' : 'neutral'}>
                          {bay.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-600 space-y-0.5">
                        <div>
                          <span className="text-slate-400">Type:</span> {bay.bayType}
                        </div>
                        <div>
                          <span className="text-slate-400">Level:</span> {bay.levelOrFloor || 'Ground Level'}
                        </div>
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
                    Active &amp; Upcoming Bookings
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
                  onClick={() => alert('Add Bay Wizard will be implemented in Stage 2 after Phase 1 Host Account sign-off')}
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
