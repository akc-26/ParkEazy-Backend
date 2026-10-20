import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Landmark,
  User,
  Phone,
  Mail,
  Save,
  CheckCircle2,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { User as UserType } from '../../types';
import { api } from '../../api';

interface HostProfileProps {
  currentUser: UserType;
  onRefresh: () => void;
}

export const HostProfile: React.FC<HostProfileProps> = ({ currentUser, onRefresh }) => {
  const [formData, setFormData] = useState({
    fullName: currentUser.fullName,
    phone: currentUser.phone || '',
    businessName: currentUser.businessDetails?.businessName || '',
    registrationNumber: currentUser.businessDetails?.registrationNumber || '',
    taxId: currentUser.businessDetails?.taxId || '',
    payoutBankName: currentUser.businessDetails?.payoutBankName || '',
    payoutAccountNumber: currentUser.businessDetails?.payoutAccountNumber || '',
    payoutRoutingNumber: currentUser.businessDetails?.payoutRoutingNumber || ''
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        businessDetails: {
          businessName: formData.businessName,
          registrationNumber: formData.registrationNumber,
          taxId: formData.taxId,
          payoutBankName: formData.payoutBankName,
          payoutAccountNumber: formData.payoutAccountNumber,
          payoutRoutingNumber: formData.payoutRoutingNumber,
          stripeConnectAccountId: currentUser.businessDetails?.stripeConnectAccountId || 'acct_1NZVb4KJ910aBCDe',
          isVerified: true
        }
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      alert('Error updating profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Account & Regulatory Compliance
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Host Profile & Business Registration
          </h2>
          <p className="text-xs text-slate-500">
            Verify legal commercial entity info, banking settlement details, and operator credentials.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Operator Verified & Cleared</span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Profile and payout credentials saved successfully!
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 text-xs">
        {/* Personal Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <User className="w-4 h-4 text-sky-500" />
            <span>Primary Account Representative</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Direct Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={currentUser.email}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Role & Status</label>
              <div className="px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-xl capitalize font-medium flex items-center justify-between">
                <span>{currentUser.role} Account</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {currentUser.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Entity Details */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>Commercial Entity Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Registered Business Entity Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Corporate Reg Number</label>
              <input
                type="text"
                value={formData.registrationNumber}
                onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Federal Tax ID / EIN</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Stripe Connect Account ID</label>
              <input
                type="text"
                disabled
                value={currentUser.businessDetails?.stripeConnectAccountId || 'acct_1NZVb4KJ910aBCDe'}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-600 rounded-xl font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {/* Payout Banking Details */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-500" />
            <span>Bank Settlement & ACH Routing</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Settlement Bank Name</label>
              <input
                type="text"
                value={formData.payoutBankName}
                onChange={e => setFormData({ ...formData, payoutBankName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bank Routing Number (ABA)</label>
              <input
                type="text"
                value={formData.payoutRoutingNumber}
                onChange={e => setFormData({ ...formData, payoutRoutingNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Account Number (Masked)</label>
              <input
                type="text"
                value={formData.payoutAccountNumber}
                onChange={e => setFormData({ ...formData, payoutAccountNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile Details'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
