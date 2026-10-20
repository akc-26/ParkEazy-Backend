import React, { useState } from 'react';
import { UserAccount } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  onProfileUpdated?: (user: UserAccount) => void;
}

export function EditPersonalDetailsPage({
  currentUser,
  onNavigate,
  onLogout,
  onProfileUpdated,
}: Props) {
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [emergencyName, setEmergencyName] = useState(currentUser?.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser?.emergencyContactPhone || '');
  const [gstin, setGstin] = useState(currentUser?.gstin || '');
  const [companyName, setCompanyName] = useState(currentUser?.companyName || '');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Full name cannot be empty');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });
      const updated = await client.users.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
      });

      onProfileUpdated?.(updated);

      // Refresh cached display data only after the server confirms persistence.
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('parkeazy_customer_user');
        if (stored) {
          const userObj = JSON.parse(stored);
          userObj.fullName = updated.fullName;
          userObj.phone = updated.phone;
          userObj.emergencyContactName = updated.emergencyContactName;
          userObj.emergencyContactPhone = updated.emergencyContactPhone;
          userObj.companyName = updated.companyName;
          userObj.gstin = updated.gstin;
          localStorage.setItem('parkeazy_customer_user', JSON.stringify(userObj));
        }
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onNavigate('/account/profile');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update personal details');
    } finally {
      setSaving(false);
    }
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">pe_uw_07_02</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Personal &amp; Contact Details
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Update the name and phone number stored in your ParkEazy account. Email changes require re-verification.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span>✓</span>
            <span>Profile details saved successfully. Returning to profile overview...</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
            <span>✕</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* Section 1: Basic Identity */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Basic Identity
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Legal Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3 py-2 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Email change requires re-verification</span>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Contact Information &amp; Verification Policy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Mobile Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Emergency Contact Name</label>
                <input
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Emergency Contact Phone</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 max-w-sm"
              />
            </div>
          </div>

          {/* Section 3: Corporate & Tax Billing */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-2">
              Corporate &amp; Tax Billing (Optional)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Company Registered Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Corporate GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('/account/profile')}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Personal Details'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
