import React from 'react';
import { Building2, LogOut, ArrowLeft, ChevronDown } from 'lucide-react';
import { User, Facility } from '../../types';

interface HostHeaderProps {
  currentUser: User;
  facilities: Facility[];
  selectedFacilityId: string | null;
  onSelectFacility: (id: string) => void;
  onLogout: () => void;
  onNavigateToCustomer: () => void;
}

export const HostHeader: React.FC<HostHeaderProps> = ({
  currentUser,
  facilities,
  selectedFacilityId,
  onSelectFacility,
  onLogout,
  onNavigateToCustomer
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0E1E20] border-b border-slate-800 text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={onNavigateToCustomer}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#087E8A] to-[#12B886] flex items-center justify-center font-bold text-lg text-white shadow-md">
                P
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                  <span>ParkEazy</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#087E8A]/30 text-teal-300 border border-[#087E8A]/50 font-semibold">
                    Host Portal
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1">Intelligent Parking Operations</span>
              </div>
            </div>

            {facilities.length > 0 && (
              <div className="hidden md:flex items-center gap-2 bg-[#162A2D] px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs">
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <select
                  value={selectedFacilityId || ''}
                  onChange={(e) => onSelectFacility(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-hidden cursor-pointer"
                >
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id} className="bg-[#162A2D] text-white">
                      {fac.name} ({fac.city})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToCustomer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-[#162A2D] hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="w-7 h-7 rounded-full bg-[#087E8A] flex items-center justify-center font-bold text-xs text-white">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-semibold text-white leading-tight">{currentUser.fullName}</div>
                <div className="text-[10px] text-teal-400 capitalize">{currentUser.role}</div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
