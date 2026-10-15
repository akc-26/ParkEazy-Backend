import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function NotificationPreferencesDeliveryChannelsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('Notification delivery channel settings updated.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-11 • Delivery Channels
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_06_07 • Notification Protocols</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Notification Preferences & Delivery Channels
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/settings/security')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Security & 2FA →
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {successMsg && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="font-bold text-[#101828] block">WhatsApp Business Alerts</span>
              <span className="text-[#64748B] text-[11px]">Instant arrival notifications and driver contact passes on verified mobile.</span>
            </div>
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={(e) => setWhatsappEnabled(e.target.checked)}
              className="w-4 h-4 text-[#0F766E] rounded"
            />
          </div>

          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="font-bold text-[#101828] block">SMS Critical Escalations</span>
              <span className="text-[#64748B] text-[11px]">Overstay threshold alarms and emergency gate overrides via carrier SMS.</span>
            </div>
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              className="w-4 h-4 text-[#0F766E] rounded"
            />
          </div>

          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="font-bold text-[#101828] block">Browser Web Push Notifications</span>
              <span className="text-[#64748B] text-[11px]">Desktop & terminal audio chime upon driver booking arrival.</span>
            </div>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={(e) => setPushEnabled(e.target.checked)}
              className="w-4 h-4 text-[#0F766E] rounded"
            />
          </div>

          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div>
              <span className="font-bold text-[#101828] block">Daily Financial Email Digest</span>
              <span className="text-[#64748B] text-[11px]">Consolidated settlement ledger and GST tax summaries dispatched at 23:59.</span>
            </div>
            <input
              type="checkbox"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
              className="w-4 h-4 text-[#0F766E] rounded"
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-xs"
            >
              Save Delivery Channels
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
