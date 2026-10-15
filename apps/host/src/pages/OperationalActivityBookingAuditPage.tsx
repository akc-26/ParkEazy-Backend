import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function OperationalActivityBookingAuditPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [logs] = useState([
    {
      id: 'log-01',
      timestamp: '11:42 AM',
      actor: 'Auto-Scanner Lane 1',
      action: 'GATE_BARRIER_OPENED',
      details: 'Vehicle TN-09-CB-4821 checked into Bay A-01 via QR pass verification',
      level: 'INFO',
    },
    {
      id: 'log-02',
      timestamp: '11:30 AM',
      actor: 'Operator: Kavitha R.',
      action: 'EXTENSION_GRANTED',
      details: 'Extension of 1 hr approved for vehicle TN-01-AX-9021 (Bay B-02)',
      level: 'INFO',
    },
    {
      id: 'log-03',
      timestamp: '11:15 AM',
      actor: 'Ultrasonic Sensor Array',
      action: 'BAY_VACATED',
      details: 'Bay C-03 telemetry reported clear. Bay marked open on consumer discovery catalog',
      level: 'INFO',
    },
    {
      id: 'log-04',
      timestamp: '10:55 AM',
      actor: 'Overstay Watchdog Daemon',
      action: 'OVERSTAY_ALERT_TRIGGERED',
      details: 'Vehicle TN-03-ZZ-1234 exceeded reservation grace period by 15 mins at Bay A-04',
      level: 'WARN',
    },
    {
      id: 'log-05',
      timestamp: '10:10 AM',
      actor: 'Supervisor: Rajiv M.',
      action: 'MANUAL_BARRIER_OVERRIDE',
      details: 'Manual emergency barrier open for delivery vehicle DL-01-AB-9922',
      level: 'AUDIT',
    },
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-09 • Gate Activity & Shift Audit
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_04_09 • Immutable Operations Log</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Gate Activity & Shift Audit Log
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/earnings/ledger')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Earnings Ledger →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Shift Telemetry & Access Events ({logs.length})
            </h2>
            <span className="text-xs text-[#0F766E] font-semibold bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
              Live Event Bus Active
            </span>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-[#F8FAFC] transition-colors">
                <span className="font-mono text-xs text-[#64748B] shrink-0 w-16 pt-0.5">
                  {log.timestamp}
                </span>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#101828] font-mono">{log.action}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      log.level === 'WARN'
                        ? 'bg-[#FEF2F2] text-[#DC2626]'
                        : log.level === 'AUDIT'
                          ? 'bg-[#FEF3C7] text-[#92400E]'
                          : 'bg-[#ECFDF5] text-[#065F46]'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-[#64748B]">• {log.actor}</span>
                  </div>
                  <p className="text-xs text-[#334155] mt-1">{log.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
