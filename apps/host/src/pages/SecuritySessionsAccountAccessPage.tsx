import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function SecuritySessionsAccountAccessPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [sessions, setSessions] = useState([
    {
      id: 'sess-01',
      device: 'Google Chrome on macOS (Current Host)',
      ip: '106.198.84.12',
      location: 'Chennai, TN, India',
      lastActive: 'Active Now',
      isCurrent: true,
    },
    {
      id: 'sess-02',
      device: 'Android Terminal App (Gate Lane 1 Tablet)',
      ip: '192.168.1.45',
      location: 'Anna Nagar West Plaza Local Subnet',
      lastActive: '12 mins ago',
      isCurrent: false,
    },
  ]);

  const [revokedMsg, setRevokedMsg] = useState<string | null>(null);

  const handleRevoke = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setRevokedMsg('Session token invalidated and remote operator logged out.');
    setTimeout(() => setRevokedMsg(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-12 • Security & Access
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_06_08 • Session Governance</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Security Sessions & 2FA Account Access
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/settings/support')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Host Helpdesk →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {revokedMsg && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {revokedMsg}</span>
            <button onClick={() => setRevokedMsg(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        {/* 2FA Status Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5]/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔐</span>
            <div>
              <h2 className="text-sm font-bold text-[#065F46]">Two-Factor Authentication Active</h2>
              <p className="text-xs text-[#047857]">SMS & Authenticator app verification enforced for host logins and payout modifications.</p>
            </div>
          </div>
          <span className="text-xs font-bold bg-[#10B981] text-white px-3 py-1 rounded-full">ENFORCED</span>
        </div>

        {/* Active Sessions List */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Active Authenticated Devices ({sessions.length})
            </h3>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {sessions.map((s) => (
              <div key={s.id} className="p-5 flex items-center justify-between hover:bg-[#F8FAFC]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#101828]">{s.device}</span>
                    {s.isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E6F7F4] text-[#0F766E]">
                        This Device
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">
                    IP: <span className="font-mono text-[#334155]">{s.ip}</span> • Location: {s.location} • {s.lastActive}
                  </div>
                </div>

                {!s.isCurrent && (
                  <button
                    onClick={() => handleRevoke(s.id)}
                    className="text-xs text-[#DC2626] font-semibold hover:underline"
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
