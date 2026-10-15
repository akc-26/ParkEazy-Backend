import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostWorkspaceSettingsOverviewPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [facilityName, setFacilityName] = useState('Anna Nagar Plaza Commercial Ventures');
  const [supportPhone, setSupportPhone] = useState('+91 44 2621 8900');
  const [emergencyPhone, setEmergencyPhone] = useState('+91 98765 00002');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST +05:30)');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Workspace operational parameters saved successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-12 • Workspace & Team
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_06_01 • Host Entity Settings</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Host Workspace Settings Overview
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/settings/business')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Business & Tax Details →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {successMsg && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        {/* Sub-nav tabs for Settings */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold border-b border-[#E2E8F0]">
          <button onClick={() => onNavigate('/host/settings')} className="px-3 py-2 text-[#0F766E] border-b-2 border-[#0F766E] font-bold">General Workspace</button>
          <button onClick={() => onNavigate('/host/settings/business')} className="px-3 py-2 text-[#64748B] hover:text-[#101828]">Business & GST</button>
          <button onClick={() => onNavigate('/host/settings/operations')} className="px-3 py-2 text-[#64748B] hover:text-[#101828]">Operational Rules</button>
          <button onClick={() => onNavigate('/host/settings/team')} className="px-3 py-2 text-[#64748B] hover:text-[#101828]">Team & Staff</button>
          <button onClick={() => onNavigate('/host/settings/roles')} className="px-3 py-2 text-[#64748B] hover:text-[#101828]">Roles (RBAC)</button>
          <button onClick={() => onNavigate('/host/settings/notifications')} className="px-3 py-2 text-[#64748B] hover:text-[#101828]">Alerts</button>
          <button onClick={() => onNavigate('/host/settings/security')} className="px-3 py-2 text-[#64748B] hover:text-[#101828]">Security & 2FA</button>
          <button onClick={() => onNavigate('/host/settings/support')} className="px-3 py-2 text-[#64748B] hover:text-[#101828]">Helpdesk</button>
        </div>

        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">Facility Host Name</label>
            <input
              type="text"
              value={facilityName}
              onChange={(e) => setFacilityName(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Gate Attendant Line</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">24x7 Emergency Contact</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">Facility Timezone</label>
            <input
              type="text"
              value={timezone}
              disabled
              className="w-full px-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-[#64748B]"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-xs"
            >
              Update Workspace Profile
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
