import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostProfileContactDetailsPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  const [businessName, setBusinessName] = useState('Anna Nagar Plaza Commercial Hub');
  const [operatorType, setOperatorType] = useState('commercial');
  const [contactPerson, setContactPerson] = useState(currentUser?.fullName || 'Kavitha Rajan');
  const [phone, setPhone] = useState(currentUser?.phone || '+91 98401 98820');
  const [email] = useState(currentUser?.email || 'kavitha.rajan@annagarplaza.in');
  const [taxId, setTaxId] = useState('33AAAAA0000A1Z5');
  const [bankAccountNumber, setBankAccountNumber] = useState('918020038472910');
  const [bankIfsc, setBankIfsc] = useState('HDFC0001042');
  const [address, setAddress] = useState('100 Feet Road, Anna Nagar West, Chennai, TN 600040');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setApiError(null);
    setSavedSuccess(false);

    try {
      await apiClient.users.updateHostProfile({
        businessName,
        panNumber: taxId,
        bankAccountNumber,
        bankIfsc,
        bankName: 'HDFC Bank Ltd',
      });
      setSavedSuccess(true);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Unable to save host profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2C] flex flex-col font-['Inter']">
      {/* HEADER */}
      <header className="sticky top-0 w-full z-50 bg-[#F9F9FF]/90 backdrop-blur-xl border-b border-[#E2E8F0] shadow-xs">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-3 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold font-['Plus_Jakarta_Sans'] shadow-xs">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#141B2C] leading-tight tracking-tight">
                  {tenant.displayName}
                </span>
                <span className="text-[10px] uppercase text-[#64748B] font-semibold tracking-wider">
                  Host Workspace
                </span>
              </div>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9EDFF] text-[#006B5F] text-xs">
              <span className="material-symbols-outlined text-[16px]">lock</span>
              <span className="font-medium text-[#3E4947]">256-Bit SSL Encrypted</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B] font-mono">PE-HW-01-06</span>
            <button
              onClick={() => onNavigate('/host/onboarding')}
              className="text-xs text-[#0F766E] hover:underline font-semibold cursor-pointer"
            >
              Back to Launchpad
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pt-8 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-[#0F766E] uppercase tracking-wider">Step 2 of 4</span>
            <span className="text-[#94A3B8]">•</span>
            <span className="font-semibold text-[#141B2C]">Host Profile & Contact Management</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0F766E] animate-pulse" />
            <span className="text-xs font-semibold text-[#0F766E]">Registry Active</span>
          </div>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5 text-xs text-[#0F766E] font-bold uppercase tracking-wider mb-1">
            <span>PE-HW-01-06</span>
            <span>•</span>
            <span>Commercial Facility Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight">
            Host Profile & Contact Management
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl">
            Configure administrative registry records, on-ground marshalls, and automated dispatch escalation pathways for Anna Nagar Plaza.
          </p>
        </div>

        {savedSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-[#ECFDF3] border border-[#A6F4C5] text-[#027A48] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="font-bold">Host profile and KYC credentials updated successfully.</span>
            </div>
            <button
              onClick={() => onNavigate('/host/onboarding/eligibility')}
              className="underline font-bold hover:text-[#02542D] cursor-pointer"
            >
              Continue to Step 3 →
            </button>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSave} className="space-y-8">
          {/* Card 1: Business / Facility Information */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F766E] text-[20px]">corporate_fare</span>
              Facility & Commercial Identity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#141B2C]">Registered Commercial Entity Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#141B2C]">Operator Model</label>
                <select
                  value={operatorType}
                  onChange={(e) => setOperatorType(e.target.value)}
                  className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                >
                  <option value="commercial">Commercial Garage / Plaza Operator</option>
                  <option value="residential">Residential / Private Tenancy</option>
                  <option value="enterprise">Enterprise Valet Partner</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-[#141B2C]">Physical Facility Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Operations & Ground Contacts */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F766E] text-[20px]">support_agent</span>
              On-Ground Marshalls & Dispatch Hotline
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#141B2C]">Designated Facility Manager</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  required
                  className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#141B2C]">Gate Marshall Phone (Emergency)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] focus:bg-white focus:outline-none focus:border-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Banking & Payout Settlement */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-sm">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0F766E] text-[20px]">account_balance</span>
              Banking & Direct Settlement Ledgers
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#141B2C]">GSTIN / PAN Tax Identifier</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  required
                  className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] font-mono focus:bg-white focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#141B2C]">Settlement Bank Account Number</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  required
                  className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] font-mono focus:bg-white focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#141B2C]">Bank IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  required
                  className="w-full h-11 px-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#141B2C] font-mono focus:bg-white focus:outline-none focus:border-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              onClick={() => onNavigate('/host/onboarding')}
              className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#141B2C] hover:bg-[#F8FAFC] cursor-pointer"
            >
              ← Back to Overview
            </button>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#005C55] text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {isSaving ? 'Saving...' : 'Save & Continue to Eligibility →'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-[#101828] text-[#94A3B8] py-6 px-4 text-xs border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 {tenant.displayName} Technologies. Host Management System.</p>
          <div className="flex items-center gap-4 text-[#CBD5E1]">
            <span>Ref: <code>pe_hw_01_06</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
