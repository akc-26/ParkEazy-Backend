import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function FacilityPreferencesOperationalSettingsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [autoApprove, setAutoApprove] = useState(true);
  const [gracePeriodMins, setGracePeriodMins] = useState(15);
  const [bufferMins, setBufferMins] = useState(10);
  const [fastagEnabled, setFastagEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess('Operational tolerance and gate automation rules saved.');
    setTimeout(() => setSavedSuccess(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-12 • Operational Rules
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_06_03 • Gate Tolerances & Rules</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Facility Operational Settings & Rules
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/settings/team')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Team Members →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {savedSuccess && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {savedSuccess}</span>
            <button onClick={() => setSavedSuccess(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-6 text-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="font-bold text-[#101828] block">Instant Booking Auto-Confirmation</span>
              <span className="text-[#64748B] text-[11px]">Automatically confirm and lock bays without manual host review.</span>
            </div>
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="w-4 h-4 text-[#0F766E] rounded"
            />
          </div>

          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="font-bold text-[#101828] block">Fastag RFID Passive Scanning</span>
              <span className="text-[#64748B] text-[11px]">Enable automated NETC Fastag reader integration at arrival gate.</span>
            </div>
            <input
              type="checkbox"
              checked={fastagEnabled}
              onChange={(e) => setFastagEnabled(e.target.checked)}
              className="w-4 h-4 text-[#0F766E] rounded"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Overstay Grace Buffer (Minutes)</label>
              <input
                type="number"
                value={gracePeriodMins}
                onChange={(e) => setGracePeriodMins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
              <span className="text-[11px] text-[#64748B] mt-1 block">Free departure window after reservation expiry.</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Inter-Reservation Turnaround Buffer (Minutes)</label>
              <input
                type="number"
                value={bufferMins}
                onChange={(e) => setBufferMins(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
              <span className="text-[11px] text-[#64748B] mt-1 block">Slot blocked between back-to-back reservations.</span>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-xs"
            >
              Save Operational Rules
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
