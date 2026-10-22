import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Layers,
  Sliders,
  CalendarCheck,
  DollarSign,
  Star,
  BarChart3,
  User,
  ShieldCheck,
  ChevronRight,
  ParkingCircle
} from 'lucide-react';
import { User as UserType } from '../../types';

interface HostSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: UserType;
  facilitiesCount: number;
}

export const HostSidebar: React.FC<HostSidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  facilitiesCount
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & metrics'
    },
    {
      id: 'facilities',
      label: 'Facilities',
      icon: Building2,
      badge: facilitiesCount > 0 ? facilitiesCount : undefined,
      description: 'Locations & hours'
    },
    {
      id: 'bays',
      label: 'Floor Map & Bays',
      icon: Layers,
      description: 'Layout & maintenance'
    },
    {
      id: 'pricing',
      label: 'Pricing & Surge',
      icon: Sliders,
      description: 'Dynamic rate rules'
    },
    {
      id: 'bookings',
      label: 'Live Bookings',
      icon: CalendarCheck,
      description: 'Arrivals & gate simulator'
    },
    {
      id: 'earnings',
      label: 'Earnings & Payouts',
      icon: DollarSign,
      description: 'Ledger & bank transfer'
    },
    {
      id: 'reviews',
      label: 'Guest Reviews',
      icon: Star,
      description: 'Ratings & responses'
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      description: 'Demand & occupancy'
    },
    {
      id: 'profile',
      label: 'Host Profile',
      icon: User,
      description: 'Business registration'
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs shrink-0 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Host Operator Identity Badge */}
        <div className="p-3 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-xl text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
              Operator Verified
            </span>
          </div>
          <div className="font-bold text-sm text-slate-100 truncate">
            {currentUser.businessDetails?.businessName || currentUser.fullName}
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {currentUser.fullName} · {currentUser.email}
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Host Management
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <div className="text-left truncate">
                    <div className="truncate">{item.label}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                        isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info in Sidebar */}
      <div className="pt-4 mt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Gate Sync:</span>
          <span className="text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Commission:</span>
          <span className="text-slate-600 font-medium">12% Flat</span>
        </div>
      </div>
    </aside>
  );
};
