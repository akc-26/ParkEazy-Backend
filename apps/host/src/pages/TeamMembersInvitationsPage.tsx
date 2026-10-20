import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function TeamMembersInvitationsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [members, setMembers] = useState([
    { id: 'tm-01', name: 'Kavitha Rajan', role: 'Facility Manager', email: 'kavitha@annanagarplaza.com', status: 'ACTIVE' },
    { id: 'tm-02', name: 'Rajiv Mehra', role: 'Gate Supervisor', email: 'rajiv.m@annanagarplaza.com', status: 'ACTIVE' },
    { id: 'tm-03', name: 'Dinesh Kumar', role: 'Gate Attendant', email: 'dinesh.k@annanagarplaza.com', status: 'ACTIVE' },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Gate Attendant');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setMembers((prev) => [
      ...prev,
      {
        id: `tm-${Date.now()}`,
        name: inviteEmail.split('@')[0],
        role: inviteRole,
        email: inviteEmail,
        status: 'INVITED',
      },
    ]);
    setInviteEmail('');
    setSuccessMsg(`Invitation dispatched to ${inviteEmail}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-12 • Team Management
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_06_04 • Staff Access & Delegations</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Team Members & Staff Invitations
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/settings/roles')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            RBAC Permissions Matrix →
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

        {/* Invite Form */}
        <form onSubmit={handleInvite} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-end gap-4 text-xs">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-[#344054] mb-1">Invite New Colleague</label>
            <input
              type="email"
              placeholder="operator@facility.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="block text-xs font-semibold text-[#344054] mb-1">Assign Operational Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
            >
              <option>Gate Attendant</option>
              <option>Gate Supervisor</option>
              <option>Facility Manager</option>
              <option>Financial Auditor</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] transition-all shadow-xs"
          >
            Send Invite
          </button>
        </form>

        {/* Team List */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Authorized Team Directory ({members.length})
            </h2>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {members.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center font-bold text-sm">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#101828]">{m.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475467]">
                        {m.role}
                      </span>
                    </div>
                    <span className="text-xs text-[#64748B]">{m.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    m.status === 'ACTIVE' ? 'bg-[#ECFDF5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#92400E]'
                  }`}>
                    {m.status}
                  </span>
                  <button className="text-xs text-[#DC2626] font-semibold hover:underline">
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
