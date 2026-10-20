import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility, PublicationReadinessResult } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function InventoryValidationPublicationReadinessPage({
  facilityId,
  currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [facility, setFacility] = useState<ParkingFacility | null>(null);
  const [readiness, setReadiness] = useState<PublicationReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadAudit();
  }, [facilityId]);

  const loadAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const fac = await apiClient.facilities.get(facilityId);
      setFacility(fac);
      const res = await apiClient.facilities.getReadiness(facilityId);
      setReadiness(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to evaluate publication readiness');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!readiness?.canPublish) {
      setError('Prerequisites not fulfilled. Resolve missing items before publishing.');
      return;
    }
    setPublishing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await apiClient.facilities.publish(facilityId);
      setFacility(updated);
      setSuccessMsg('Facility successfully published! Motorists can now discover and book bays.');
      loadAudit();
    } catch (err: any) {
      setError(err?.message || 'Failed to publish facility');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#64748B]">Auditing Publication Readiness Checklist...</span>
        </div>
      </div>
    );
  }

  const score = readiness?.score || 0;
  const isPublished = facility?.status === 'published';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <button onClick={() => onNavigate('/host/spaces')} className="hover:underline">Spaces</button>
              <span>/</span>
              <span>{facility?.name || 'Facility'}</span>
              <span>/</span>
              <span className="text-[#0F766E]">Publication Readiness (pe_hw_02_09)</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              Inventory Validation & Publication Readiness
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pre-flight publication audit. Certified checks must pass before opening bays for driver marketplace bookings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(`/host/facilities/${facilityId}/preview`)}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Photos & Preview
            </button>
            <button
              onClick={() => onNavigate('/host/spaces')}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              All Spaces
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs font-medium text-[#991B1B]">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-medium text-[#166534]">
            {successMsg}
          </div>
        )}

        {/* METRICS BANNER */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 48 48">
                <circle className="text-[#E2E8F0]" cx="24" cy="24" fill="transparent" r="20" stroke="currentColor" strokeWidth="4" />
                <circle
                  className={score >= 80 ? 'text-[#0F766E]' : 'text-[#F59E0B]'}
                  cx="24"
                  cy="24"
                  fill="transparent"
                  r="20"
                  stroke="currentColor"
                  strokeDasharray="125.66"
                  strokeDashoffset={125.66 - (125.66 * score) / 100}
                  strokeLinecap="round"
                  strokeWidth="4"
                />
              </svg>
              <span className="absolute text-xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                {score}%
              </span>
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-[#64748B]">Readiness Index</div>
              <h2 className="text-xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                {score === 100
                  ? 'All Prerequisites Certified'
                  : score >= 80
                  ? 'Eligible for Public Discovery'
                  : 'Staging Draft — Incomplete'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#64748B] mt-1">
                <span>Facility Code: <strong className="font-mono text-[#141B2C]">{facility?.facilityCode}</strong></span>
                <span>•</span>
                <span>Bays Configured: <strong>{facility?.totalSpaces || 0}</strong></span>
                <span>•</span>
                <span>Status: <strong className="uppercase">{facility?.status}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {isPublished ? (
              <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#DCFCE7] text-[#166534] font-bold text-xs border border-[#86EFAC]">
                <span>✓</span>
                <span>PUBLISHED LIVE TO MARKETPLACE</span>
              </div>
            ) : (
              <button
                onClick={handlePublish}
                disabled={!readiness?.canPublish || publishing}
                className={`w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  readiness?.canPublish
                    ? 'bg-[#0F766E] hover:bg-[#0D655E] text-white hover:scale-[1.02]'
                    : 'bg-[#94A3B8] text-white cursor-not-allowed opacity-60'
                }`}
              >
                {publishing ? 'Publishing...' : '🚀 Publish Facility to Marketplace'}
              </button>
            )}
          </div>
        </div>

        {/* CHECKLIST SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CHECKLIST ITEMS */}
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
            <h3 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>Automated Verification Dossier</span>
            </h3>

            <div className="space-y-3">
              {readiness?.checks.map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    c.passed
                      ? 'border-[#86EFAC] bg-[#F0FDF4] text-[#166534]'
                      : 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{c.passed ? '✓' : '✕'}</span>
                    <div>
                      <div className="font-bold">{c.label}</div>
                      {c.message && (
                        <div className="text-[11px] opacity-80 mt-0.5">{c.message}</div>
                      )}
                    </div>
                  </div>
                  <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/60">
                    {c.passed ? 'PASSED' : 'MISSING'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* MISSING & RECOMMENDATIONS */}
          <div className="space-y-6">
            {readiness?.missingRequirements && readiness.missingRequirements.length > 0 ? (
              <div className="bg-[#FFFBEB] p-6 rounded-2xl border border-[#FDE68A] shadow-xs">
                <h3 className="text-sm font-bold text-[#92400E] mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Missing Requirements</span>
                </h3>
                <p className="text-xs text-[#B45309] mb-3">
                  The following requirements must be addressed to ensure verified motorist discovery:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-[#92400E]">
                  {readiness.missingRequirements.map((req, idx) => (
                    <li key={idx} className="font-semibold">{req}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="bg-[#F0FDF4] p-6 rounded-2xl border border-[#86EFAC] shadow-xs">
                <h3 className="text-sm font-bold text-[#166534] mb-2 flex items-center gap-2">
                  <span>🎉</span>
                  <span>Clean Pre-Flight Audit</span>
                </h3>
                <p className="text-xs text-[#15803D]">
                  Zero blocking issues detected. The facility complies with GPS radius precision, minimum bay quotas, safety clearance rules, and tariff schedules.
                </p>
              </div>
            )}

            {/* QUICK ACTIONS JUMP CARD */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <h3 className="text-sm font-bold text-[#141B2C] mb-3">Quick Configuration Short-cuts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => onNavigate(`/host/facilities/${facilityId}/gate`)}
                  className="p-3 text-left border border-[#E2E8F0] rounded-xl hover:border-[#0F766E] hover:bg-[#F0FDFA]"
                >
                  <div className="font-bold text-[#141B2C]">Gate Directives</div>
                  <div className="text-[11px] text-[#64748B]">GPS & barrier instructions</div>
                </button>
                <button
                  onClick={() => onNavigate(`/host/facilities/${facilityId}/layout`)}
                  className="p-3 text-left border border-[#E2E8F0] rounded-xl hover:border-[#0F766E] hover:bg-[#F0FDFA]"
                >
                  <div className="font-bold text-[#141B2C]">Bay Layout</div>
                  <div className="text-[11px] text-[#64748B]">Generate physical slots</div>
                </button>
                <button
                  onClick={() => onNavigate(`/host/facilities/${facilityId}/preview`)}
                  className="p-3 text-left border border-[#E2E8F0] rounded-xl hover:border-[#0F766E] hover:bg-[#F0FDFA]"
                >
                  <div className="font-bold text-[#141B2C]">Photo Assets</div>
                  <div className="text-[11px] text-[#64748B]">Cover & stall gallery</div>
                </button>
                <button
                  onClick={() => onNavigate('/host/pricing')}
                  className="p-3 text-left border border-[#E2E8F0] rounded-xl hover:border-[#0F766E] hover:bg-[#F0FDFA]"
                >
                  <div className="font-bold text-[#141B2C]">Pricing Tariffs</div>
                  <div className="text-[11px] text-[#64748B]">Base rates & multipliers</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
