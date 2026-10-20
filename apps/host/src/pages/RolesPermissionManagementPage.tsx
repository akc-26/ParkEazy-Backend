import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function RolesPermissionManagementPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  const permissions = [
    { feature: 'Scan QR Check-In & Check-Out', attendant: true, supervisor: true, manager: true },
    { feature: 'Manual Barrier Override', attendant: false, supervisor: true, manager: true },
    { feature: 'Bay Allocation Override & Exceptions', attendant: false, supervisor: true, manager: true },
    { feature: 'Decide Overstay Extensions', attendant: false, supervisor: true, manager: true },
    { feature: 'Edit Space Tariffs & Pricing Rules', attendant: false, supervisor: false, manager: true },
    { feature: 'View Itemized Financial Ledger', attendant: false, supervisor: false, manager: true },
    { feature: 'Manage Bank Account & Payouts', attendant: false, supervisor: false, manager: true },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-12 • RBAC Governance
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_06_05 • Role Permissions Matrix</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Roles & Permission Management (RBAC)
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/settings/notifications')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Notification Alerts →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Functional Capability Assignment
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B]">
                <tr>
                  <th className="px-6 py-3 font-semibold">Operational Capability</th>
                  <th className="px-6 py-3 text-center font-semibold">Attendant</th>
                  <th className="px-6 py-3 text-center font-semibold">Supervisor</th>
                  <th className="px-6 py-3 text-center font-semibold">Facility Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {permissions.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-semibold text-[#101828]">{p.feature}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${p.attendant ? 'text-[#0F766E]' : 'text-[#94A3B8]'}`}>
                        {p.attendant ? '✓' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${p.supervisor ? 'text-[#0F766E]' : 'text-[#94A3B8]'}`}>
                        {p.supervisor ? '✓' : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-bold ${p.manager ? 'text-[#0F766E]' : 'text-[#94A3B8]'}`}>
                        {p.manager ? '✓' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
