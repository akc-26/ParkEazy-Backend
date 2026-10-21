import React from 'react';
import { Shield, LogOut, ArrowLeft } from 'lucide-react';
import { User } from '../../types';

interface AdminHeaderProps {
  currentUser: User;
  onLogout: () => void;
  onNavigateToCustomer: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentUser,
  onLogout,
  onNavigateToCustomer
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800 text-white">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-indigo-600 flex items-center justify-center font-bold text-lg text-white shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                <span>ParkEazy</span>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold">
                  Admin Console
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block -mt-1">Operational Governance & Audit</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToCustomer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center font-bold text-xs text-white">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <div className="font-semibold text-white leading-tight">{currentUser.fullName}</div>
                <div className="text-[10px] text-rose-400 uppercase font-semibold">Admin</div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors ml-1 cursor-pointer"
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
