import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function ExtensionRequestsDecisionsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [requests, setRequests] = useState([
    {
      id: 'ext-01',
      bookingId: '5987de02',
      vehiclePlate: 'TN-09-CB-4821',
      bayIdentifier: 'Bay A-04',
      requestedHours: 1,
      currentEndsAt: new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString(),
      proposedEndsAt: new Date(Date.now() + 75 * 60 * 1000).toLocaleTimeString(),
      tariffInr: 50,
      nextScheduledAt: 'No conflict for 3 hours',
      status: 'PENDING',
    },
    {
      id: 'ext-02',
      bookingId: 'cf8c9b5c',
      vehiclePlate: 'TN-01-AX-9021',
      bayIdentifier: 'Bay B-02',
      requestedHours: 2,
      currentEndsAt: new Date(Date.now() - 10 * 60 * 1000).toLocaleTimeString(),
      proposedEndsAt: new Date(Date.now() + 110 * 60 * 1000).toLocaleTimeString(),
      tariffInr: 100,
      nextScheduledAt: '⚠️ Conflict: Next reservation at 2:30 PM',
      status: 'OVERSTAY_ALERT',
    },
  ]);

  const [decisionFeedback, setDecisionFeedback] = useState<string | null>(null);

  const handleApprove = (id: string, bay: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setDecisionFeedback(`Extension granted for ${bay}. Driver notified via WhatsApp/SMS.`);
  };

  const handleDecline = (id: string, bay: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setDecisionFeedback(`Extension declined for ${bay} due to upcoming scheduled booking. Overstay penalty warning issued.`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-09 • Extensions & Overstays
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_04_07 • Parking Extension Decisions</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Extension Requests & Overstay Decisions
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/gate/conflicts')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Conflict Desk →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {decisionFeedback && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {decisionFeedback}</span>
            <button onClick={() => setDecisionFeedback(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Pending Driver Extension Queue ({requests.length})
            </h2>
            <span className="text-xs text-[#64748B]">Real-time conflict check active</span>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B]">
              No pending driver extension requests. All bays on schedule.
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0]">
              {requests.map((req) => (
                <div key={req.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[#F8FAFC] transition-colors">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 bg-[#E6F7F4] text-[#0F766E] font-bold text-xs rounded-lg">
                        {req.bayIdentifier}
                      </span>
                      <span className="font-mono font-bold text-sm text-[#101828]">{req.vehiclePlate}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        req.status === 'OVERSTAY_ALERT'
                          ? 'bg-[#FEE2E2] text-[#DC2626]'
                          : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}>
                        +{req.requestedHours} hr requested
                      </span>
                    </div>

                    <div className="text-xs text-[#475467] grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                      <div>Current End: <strong>{req.currentEndsAt}</strong></div>
                      <div>Proposed End: <strong>{req.proposedEndsAt}</strong></div>
                      <div>Extension Fare: <strong className="text-[#0F766E]">₹{req.tariffInr}</strong></div>
                      <div className="col-span-2 text-[11px] mt-1 font-semibold text-[#B45309]">
                        {req.nextScheduledAt}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleApprove(req.id, req.bayIdentifier)}
                      className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-xs"
                    >
                      Approve Extension
                    </button>
                    <button
                      onClick={() => handleDecline(req.id, req.bayIdentifier)}
                      className="px-4 py-2 border border-[#FCA5A5] text-[#DC2626] rounded-xl text-xs font-bold hover:bg-[#FEF2F2]"
                    >
                      Decline & Enforce Exit
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
