import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function BookingExceptionsConflictResolutionPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [incidents, setIncidents] = useState([
    {
      id: 'inc-01',
      type: 'DOUBLE_PARKING',
      bayIdentifier: 'Bay B-03',
      vehiclePlate: 'TN-07-JK-1928',
      description: 'Vehicle parked across demarcation lines blocking adjacent Bay B-04',
      reportedAt: '10:45 AM',
      severity: 'HIGH',
      status: 'OPEN',
    },
    {
      id: 'inc-02',
      type: 'UNREGISTERED_PLATE',
      bayIdentifier: 'Lane 1 Inbound',
      vehiclePlate: 'TN-22-EF-3388',
      description: 'No active reservation record found at barrier entrance. Driver claims phone dead.',
      reportedAt: '11:12 AM',
      severity: 'MEDIUM',
      status: 'OPEN',
    },
  ]);

  const [resolvedMsg, setResolvedMsg] = useState<string | null>(null);

  const handleResolve = (id: string, resolution: string) => {
    setIncidents((prev) => prev.filter((i) => i.id !== id));
    setResolvedMsg(`Incident resolved: ${resolution}. Logged into shift audit trail.`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-09 • Incidents & Conflicts
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_04_08 • Gate Conflict Desk</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Conflict & Duplicate Resolution
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/gate/audit')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Gate Audit Trail →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {resolvedMsg && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {resolvedMsg}</span>
            <button onClick={() => setResolvedMsg(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Active Facility Incidents & Exceptions ({incidents.length})
            </h2>
          </div>

          {incidents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              No active operational conflicts. All facility bays functioning normally.
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-[#DC2626]">{inc.vehiclePlate}</span>
                      <span className="px-2.5 py-0.5 bg-[#F1F5F9] text-[#475467] font-semibold text-xs rounded">
                        {inc.bayIdentifier}
                      </span>
                      <span className="text-xs bg-[#FEF2F2] text-[#DC2626] font-bold px-2 py-0.5 rounded">
                        {inc.type}
                      </span>
                    </div>
                    <span className="text-xs text-[#64748B]">{inc.reportedAt}</span>
                  </div>

                  <p className="text-xs text-[#334155]">{inc.description}</p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleResolve(inc.id, 'Manual Bay Reassignment')}
                      className="px-3 py-1.5 bg-[#0F766E] text-white rounded-lg text-xs font-bold hover:bg-[#0D655E]"
                    >
                      Reassign Alternate Bay
                    </button>
                    <button
                      onClick={() => handleResolve(inc.id, 'Instant Spot Pass Issued')}
                      className="px-3 py-1.5 border border-[#CBD5E1] text-[#334155] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC]"
                    >
                      Issue Counter Spot Pass
                    </button>
                    <button
                      onClick={() => handleResolve(inc.id, 'Attendant Directed Exit')}
                      className="px-3 py-1.5 border border-[#FCA5A5] text-[#DC2626] rounded-lg text-xs font-bold hover:bg-[#FEF2F2]"
                    >
                      Direct Vehicle to Exit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
