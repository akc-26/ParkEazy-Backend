import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Car,
  DollarSign,
  CalendarCheck,
  Wallet,
  Star,
  BarChart3,
  User as UserIcon
} from 'lucide-react';
import { User } from '../../types';

interface HostSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  currentUser: User;
  facilitiesCount: number;
}

export const HostSidebar: React.FC<HostSidebarProps> = ({
  currentTab,
  onSelectTab,
  facilitiesCount
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'facilities', label: 'Facilities', icon: Building2, badge: facilitiesCount },
    { id: 'bays', label: 'Parking Bays', icon: Car },
    { id: 'pricing', label: 'Dynamic Pricing', icon: DollarSign },
    { id: 'bookings', label: 'Bookings & Holds', icon: CalendarCheck },
    { id: 'earnings', label: 'Earnings & Payouts', icon: Wallet },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'reports', label: 'Financial Reports', icon: BarChart3 },
    { id: 'profile', label: 'Host Profile', icon: UserIcon },
  ];

  return (
    <aside className="w-full md:w-64 bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs shrink-0 font-sans">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#087E8A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
