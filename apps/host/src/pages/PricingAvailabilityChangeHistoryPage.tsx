import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: string;
  entity: string;
  oldValue: string;
  newValue: string;
  actor: string;
  txHash: string;
}

const INITIAL_AUDIT_LOG: AuditEntry[] = [];

export function PricingAvailabilityChangeHistoryPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [filterType, setFilterType] = useState('ALL');
  const [auditLogs] = useState<AuditEntry[]>(INITIAL_AUDIT_LOG);

  const filtered = filterType === 'ALL'
    ? auditLogs
    : auditLogs.filter((log) => log.eventType === filterType);

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'ID,Timestamp,EventType,Entity,OldValue,NewValue,Actor,TxHash\n' +
      auditLogs.map((e) => `"${e.id}","${e.timestamp}","${e.eventType}","${e.entity}","${e.oldValue}","${e.newValue}","${e.actor}","${e.txHash}"`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'parkeazy_tariff_audit_ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <button onClick={() => onNavigate('/host/pricing')} className="hover:underline">Tariffs</button>
              <span>/</span>
              <span className="text-[#0F766E]">Change History (pe_hw_03_09)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Tariff & Availability Audit Log
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-bold font-mono">
                SOC2 Type II Certified
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Immutable operational history of all price modifications, operating hour updates, date closures, and bulk adjustments across Anna Nagar Plaza.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/pricing')}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Tariffs Overview
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-[#141B2C] hover:bg-[#1E293B] text-white text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>📥</span>
              <span>Export Audit Ledger</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-6">
        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Operations' },
              { id: 'RATE_MODIFIED', label: 'Rate Adjustments' },
              { id: 'CLOSURE_SCHEDULED', label: 'Date Closures' },
              { id: 'SURGE_RULE_SET', label: 'Surge Curve Shifts' },
              { id: 'BULK_RATE_ADJUST', label: 'Bulk Batches' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === f.id
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#141B2C]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-[#64748B]">
            Showing {filtered.length} Recorded Entries
          </span>
        </div>

        {/* AUDIT TABLE */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Timestamp (IST)</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Previous Value</th>
                  <th className="py-3 px-4">Updated Value</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Verification Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.length > 0 ? (
                  filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4 font-mono text-[#64748B]">{log.timestamp}</td>
                      <td className="py-3 px-4 font-bold text-[#141B2C]">
                        <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#334155] font-mono text-[11px]">
                          {log.eventType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#141B2C]">{log.entity}</td>
                      <td className="py-3 px-4 text-[#94A3B8] line-through">{log.oldValue}</td>
                      <td className="py-3 px-4 font-bold text-[#0F766E]">{log.newValue}</td>
                      <td className="py-3 px-4 text-[#64748B]">{log.actor}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-[#94A3B8]">{log.txHash}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-[#64748B]">
                      No pricing adjustments recorded. Audit history is populated when tariff updates are executed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
