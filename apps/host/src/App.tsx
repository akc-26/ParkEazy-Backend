import React, { useState, useEffect } from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';

// Existing Group 1: Auth & Eligibility
import { HostVerificationPage } from './pages/HostVerificationPage';
import { HostEligibilityPage } from './pages/HostEligibilityPage';

// Existing Group 3: Facilities & Spaces
import { AddParkingFacilityWizardPage } from './pages/AddParkingFacilityWizardPage';
import { AddEditParkingSpacePage } from './pages/AddEditParkingSpacePage';
import { PhotosListingPreviewPage } from './pages/PhotosListingPreviewPage';

// Existing Group 4: Pricing & Availability
import { AvailabilityPricingOverviewPage } from './pages/AvailabilityPricingOverviewPage';
import { SpacePricingConfigurationPage } from './pages/SpacePricingConfigurationPage';
import { DateSpecificAvailabilityClosuresPage } from './pages/DateSpecificAvailabilityClosuresPage';
import { OperatingHoursWeeklySchedulePage } from './pages/OperatingHoursWeeklySchedulePage';
import { BookingDurationAdvanceBookingRulesPage } from './pages/BookingDurationAdvanceBookingRulesPage';
import { BulkPricingScheduleUpdatesPage } from './pages/BulkPricingScheduleUpdatesPage';
import { AvailabilityConflictChangeReviewPage } from './pages/AvailabilityConflictChangeReviewPage';

// Existing Group 5: Operations, Arrivals & Occupancy
import { ArrivalCheckInOperationsPage } from './pages/ArrivalCheckInOperationsPage';
import { ActiveParkingOccupancyPage } from './pages/ActiveParkingOccupancyPage';
import { BookingDetailsCommercialTermsPage } from './pages/BookingDetailsCommercialTermsPage';
import { BookingExceptionsConflictResolutionPage } from './pages/BookingExceptionsConflictResolutionPage';

// Existing Group 6: Earnings & Ledger
import { HostEarningsFinancialOverviewPage } from './pages/HostEarningsFinancialOverviewPage';
import { BookingLevelEarningsLedgerPage } from './pages/BookingLevelEarningsLedgerPage';

// Navigation & Sidebar Layout for Host Operations Studio
import {
  LayoutDashboard,
  Building,
  DollarSign,
  Car,
  Wallet,
  CheckCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  PlusCircle,
  Settings,
} from 'lucide-react';

interface HostAppProps {
  onNavigateToWebsite?: () => void;
  onNavigateToAdmin?: () => void;
}

export function HostPortalContent({ onNavigateToWebsite, onNavigateToAdmin }: HostAppProps = {}) {
  const { tenant } = useBrand();

  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'facilities'
    | 'add_facility'
    | 'spaces'
    | 'pricing'
    | 'pricing_config'
    | 'operating_hours'
    | 'closures'
    | 'rules'
    | 'occupancy'
    | 'arrivals'
    | 'earnings'
    | 'ledger'
    | 'verification'
    | 'eligibility'
  >('dashboard');

  const [currentUser] = useState<UserAccount>({
    id: 'host-usr-01',
    tenantId: 'tenant-default',
    email: 'metro.host@parkeazy.internal',
    fullName: 'Ramesh Sundaram',
    role: 'host',
    roles: ['host'],
    phone: '+91 98401 23456',
    isEmailVerified: true,
    isPhoneVerified: true,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });

  const navigateTo = (path: string) => {
    if (path.includes('schedule') || path.includes('operating-hours')) {
      setActiveTab('operating_hours');
    } else if (path.includes('closures') || path.includes('blackout')) {
      setActiveTab('closures');
    } else if (path.includes('facility') || path.includes('facilities/new')) {
      setActiveTab('add_facility');
    } else if (path.includes('pricing/rates') || path.includes('spaces')) {
      setActiveTab('pricing_config');
    } else if (path.includes('pricing')) {
      setActiveTab('pricing');
    } else if (path.includes('occupancy')) {
      setActiveTab('occupancy');
    } else if (path.includes('arrivals') || path.includes('check-in')) {
      setActiveTab('arrivals');
    } else if (path.includes('ledger')) {
      setActiveTab('ledger');
    } else if (path.includes('earnings')) {
      setActiveTab('earnings');
    } else if (path.includes('verify')) {
      setActiveTab('verification');
    } else {
      setActiveTab('dashboard');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { id: 'facilities', label: 'Parking Facilities', icon: Building },
    { id: 'add_facility', label: 'Add New Facility', icon: PlusCircle },
    { id: 'spaces', label: 'Space Inventory & Bay', icon: Car },
    { id: 'pricing', label: 'Rates & Availability', icon: DollarSign },
    { id: 'pricing_config', label: 'Pricing Configuration', icon: Settings },
    { id: 'operating_hours', label: 'Operating Hours & Schedule', icon: Clock },
    { id: 'closures', label: 'Date-Specific Closures', icon: Clock },
    { id: 'rules', label: 'Booking Duration Rules', icon: ShieldCheck },
    { id: 'occupancy', label: 'Live Bay Occupancy', icon: Car },
    { id: 'arrivals', label: 'Arrivals & Check-In', icon: CheckCircle },
    { id: 'earnings', label: 'Earnings & Payouts', icon: Wallet },
    { id: 'ledger', label: 'Financial Ledger', icon: DollarSign },
    { id: 'verification', label: 'Host KYC & Verification', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* Sidebar - VoiceCloud Creator Studio layout */}
      <aside className="w-full md:w-64 bg-[#0F172A] text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              H
            </div>
            <div>
              <div className="font-semibold text-white text-sm">Host Operations Studio</div>
              <div className="text-[11px] text-slate-400">{tenant.displayName}</div>
            </div>
          </div>
        </div>

        <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </nav>

        {/* Host Profile snippet */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs">
          <div>
            <div className="font-medium text-white">{currentUser.fullName}</div>
            <div className="text-[10px] text-emerald-400">Verified Host Partner</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Host Operations Overview</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your facility bays, real-time occupancy, check-in operations, and booking revenue.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('add_facility')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Facility</span>
                </button>
                <button
                  onClick={() => setActiveTab('arrivals')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Arrivals Gate</span>
                </button>
              </div>
            </div>

            {/* Metric KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('occupancy')}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Live Bay Occupancy</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">18 / 25 Bays</div>
                <div className="text-xs text-emerald-600 mt-1 font-medium">72% Active Occupancy</div>
              </div>

              <div
                onClick={() => setActiveTab('earnings')}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">This Month Revenue</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">₹45,800</div>
                <div className="text-xs text-slate-500 mt-1">Next payout: Friday</div>
              </div>

              <div
                onClick={() => setActiveTab('pricing')}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Facilities</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">2 Locations</div>
                <div className="text-xs text-emerald-600 mt-1 font-medium">100% Operational</div>
              </div>

              <div
                onClick={() => setActiveTab('arrivals')}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today Arrivals</div>
                <div className="text-2xl font-bold text-slate-900 mt-2">14 Bookings</div>
                <div className="text-xs text-sky-600 mt-1 font-medium">3 Upcoming holds</div>
              </div>
            </div>

            {/* Interactive embedded views */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Quick Facility Access</h3>
                  <button
                    onClick={() => setActiveTab('facilities')}
                    className="text-xs text-emerald-600 font-medium hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">Anna Nagar Express Hub</div>
                      <div className="text-[11px] text-slate-500">4th Ave, Shanthi Colony · 25 Bays · ₹40/hr</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">T. Nagar Commercial Plaza</div>
                      <div className="text-[11px] text-slate-500">GN Chetty Rd · 40 Bays · ₹60/hr</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900 text-sm">Recent Booking Activity</h3>
                  <button
                    onClick={() => setActiveTab('arrivals')}
                    className="text-xs text-emerald-600 font-medium hover:underline"
                  >
                    Manage Check-Ins
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">#PKZ-2026-8812 · Bay A-01</div>
                      <div className="text-[11px] text-slate-500">Vehicle: TN01AB1234 · 2 hours scheduled</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      Checked-In
                    </span>
                  </div>
                  <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-slate-900">#PKZ-2026-8813 · Bay A-02</div>
                      <div className="text-[11px] text-slate-500">Vehicle: TN09CD5678 · 4 hours scheduled</div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-100 text-sky-700">
                      Upcoming
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'facilities' && (
          <PhotosListingPreviewPage
            facilityId="fac-anna-001"
            currentUser={currentUser}
            onNavigate={navigateTo}
          />
        )}

        {activeTab === 'add_facility' && (
          <AddParkingFacilityWizardPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'spaces' && (
          <AddEditParkingSpacePage
            facilityId="fac-anna-001"
            spaceId="sp-01"
            currentUser={currentUser}
            onNavigate={navigateTo}
          />
        )}

        {activeTab === 'pricing' && (
          <AvailabilityPricingOverviewPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'pricing_config' && (
          <SpacePricingConfigurationPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'operating_hours' && (
          <OperatingHoursWeeklySchedulePage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'closures' && (
          <DateSpecificAvailabilityClosuresPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'rules' && (
          <BookingDurationAdvanceBookingRulesPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'occupancy' && (
          <ActiveParkingOccupancyPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'arrivals' && (
          <ArrivalCheckInOperationsPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'earnings' && (
          <HostEarningsFinancialOverviewPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'ledger' && (
          <BookingLevelEarningsLedgerPage currentUser={currentUser} onNavigate={navigateTo} />
        )}

        {activeTab === 'verification' && (
          <HostVerificationPage
            currentUser={currentUser}
            onNavigate={navigateTo}
            onSuccess={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'eligibility' && (
          <HostEligibilityPage currentUser={currentUser} onNavigate={navigateTo} />
        )}
      </div>
    </div>
  );
}

export default function HostApp() {
  return (
    <BrandProvider>
      <HostPortalContent />
    </BrandProvider>
  );
}
