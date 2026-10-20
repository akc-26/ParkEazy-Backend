import React from 'react';
import {
  DollarSign,
  Calendar,
  Layers,
  LayoutDashboard,
  Clock,
  ShieldCheck,
  Calculator,
  SlidersHorizontal,
  AlertTriangle,
  History,
  Wrench,
  CalendarRange,
} from 'lucide-react';

interface HostSubNavProps {
  currentPath?: string;
  activeSection?: string;
  onNavigate: (path: string) => void;
  activeModule?: 'pricing' | 'availability' | 'spaces' | 'general' | 'operations' | 'finance' | 'support' | string;
}

export const HostSubNav: React.FC<HostSubNavProps> = ({
  currentPath = '',
  activeSection,
  onNavigate,
  activeModule = 'general',
}) => {
  const effectiveModule = activeSection || activeModule;

  const pricingTabs = [
    { label: 'Overview', path: '/host/pricing', screenId: 'pe_hw_03_01' },
    { label: 'Rate Configuration', path: '/host/pricing/rates', screenId: 'pe_hw_03_02' },
    { label: 'Operating Schedule', path: '/host/pricing/schedule', screenId: 'pe_hw_03_03' },
    { label: 'Closures', path: '/host/pricing/closures', screenId: 'pe_hw_03_04' },
    { label: 'Policies & Rules', path: '/host/pricing/rules', screenId: 'pe_hw_03_05' },
    { label: 'Price Estimate', path: '/host/pricing/estimate', screenId: 'pe_hw_03_06' },
    { label: 'Bulk Pricing', path: '/host/pricing/bulk', screenId: 'pe_hw_03_07' },
    { label: 'Conflicts', path: '/host/pricing/conflicts', screenId: 'pe_hw_03_08' },
    { label: 'Audit History', path: '/host/pricing/history', screenId: 'pe_hw_03_09' },
  ];

  const availabilityTabs = [
    { label: 'Calendar Overview', path: '/host/availability', screenId: 'pe_hw_04_01' },
    { label: 'Weekly Schedule', path: '/host/availability/schedule', screenId: 'pe_hw_04_02' },
    { label: 'Date Exceptions', path: '/host/availability/exceptions', screenId: 'pe_hw_04_03' },
    { label: 'Maintenance Blocks', path: '/host/availability/blocks', screenId: 'pe_hw_04_04' },
    { label: 'Conflict Validation', path: '/host/availability/conflicts', screenId: 'pe_hw_04_05' },
    { label: 'Availability History', path: '/host/availability/history', screenId: 'pe_hw_04_06' },
  ];

  const tabs = effectiveModule === 'pricing' ? pricingTabs : effectiveModule === 'availability' ? availabilityTabs : [];

  return (
    <div className="bg-[#192D26] text-white border-b border-[#254238] px-6 py-2">
      {/* Top Level Module Switcher */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-[#254238]/60 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => onNavigate('/host')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'general' || effectiveModule === 'dashboard'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/spaces')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'spaces'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Spaces &amp; Facilities</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/pricing')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'pricing'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Pricing</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/availability')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'availability'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Availability</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/extensions')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'extensions' || effectiveModule === 'operations'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Extensions</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/payouts')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'payouts' || effectiveModule === 'finance'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Payouts</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/reviews')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'reviews'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Reviews</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/notifications')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'notifications'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/host/support')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              effectiveModule === 'support'
                ? 'bg-[#22C55E] text-[#12211C] font-bold'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Support</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-emerald-400">
          Stage 2 Host Release • Full Operations
        </div>
      </div>

      {/* Sub-tabs for the active module */}
      {tabs.length > 0 && (
        <div className="flex items-center gap-1 pt-2 overflow-x-auto scrollbar-none text-xs">
          {tabs.map((tab) => {
            const isActive = currentPath === tab.path || (tab.path === '/host/pricing' && currentPath === '/host/pricing/');
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => onNavigate(tab.path)}
                className={`px-3 py-1 rounded whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold border-b-2 border-[#22C55E]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className="font-mono text-[9px] opacity-60">({tab.screenId})</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
