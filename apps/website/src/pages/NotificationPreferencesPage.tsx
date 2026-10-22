import React, { useState } from 'react';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
}

export function NotificationPreferencesPage({
  currentUser,
  onNavigate,
  onLogout,
}: Props) {
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [whatsappAlerts, setWhatsappAlerts] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);
    setSaveError('Notification preference persistence is not available yet. Your changes have not been saved.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              P
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-tight block">ParkEazy</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Reserve &amp; Arrive</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/account/profile')}
            className="text-xs font-semibold text-slate-600 hover:text-teal-800"
          >
            ← Back to Profile
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">pe_uw_07_07</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Notification &amp; Communication Preferences
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure intended alert preferences. Persistence is not connected yet, so changes on this page will not affect delivered notifications.
          </p>
        </div>

        {saveError && <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold" role="alert">{saveError}</div>}

        {savedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span>✓</span>
            <span>Communication preferences successfully saved.</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Mandatory */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                1. Mandatory Service &amp; Safety Notifications
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Required for active vehicle access, turnstile operations, and legal tax compliance.
              </p>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 block">Gate Pass &amp; Boom Barrier Clearance Barcode</span>
                  <span className="text-slate-500">Delivery channel is not configured in this release.</span>
                </div>
                <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  Not configured
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="font-bold text-slate-900 block">Overstay Warning &amp; Penalty Grace Alerts</span>
                  <span className="text-slate-500">Automated overstay alerts are not configured in this release.</span>
                </div>
                <span className="font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  Not configured
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Configurable Channels */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                2. Configurable Trip &amp; Commute Updates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose your preferred channels for navigation and bay reminders.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Email Receipts &amp; Summaries</span>
                  <span className="text-[11px] text-slate-500">Email receipt delivery is not configured in this release</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-5 h-5 text-teal-700 rounded focus:ring-teal-700"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">SMS Notifications</span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      Twilio Provider Integration Pending
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Instant SMS on vehicle arrival and departure</span>
                </div>
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="w-5 h-5 text-teal-700 rounded focus:ring-teal-700"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">WhatsApp Gate Pass Link</span>
                  <span className="text-[11px] text-slate-500">Receive 1-click turnstile access link directly in WhatsApp</span>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappAlerts}
                  onChange={(e) => setWhatsappAlerts(e.target.checked)}
                  className="w-5 h-5 text-teal-700 rounded focus:ring-teal-700"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">Push Notifications</span>
                    <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                      FCM Provider Integration Pending
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Mobile browser banner alerts when approaching assigned parking bay</span>
                </div>
                <input
                  type="checkbox"
                  checked={pushAlerts}
                  onChange={(e) => setPushAlerts(e.target.checked)}
                  className="w-5 h-5 text-teal-700 rounded focus:ring-teal-700"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Promotional */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                3. Optional Promotional &amp; Marketing Communications
              </h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Monthly Parking Deals &amp; Surge Discounts</span>
                <span className="text-[11px] text-slate-500">Discounts at airport and railway partner lots</span>
              </div>
              <input
                type="checkbox"
                checked={marketingEmail}
                onChange={(e) => setMarketingEmail(e.target.checked)}
                className="w-5 h-5 text-teal-700 rounded focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Communication Preferences'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
