import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function AvailabilityConflictChangeReviewPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [selectedPathway, setSelectedPathway] = useState<'postpone' | 'reassign' | 'exclude'>('reassign');
  const [resolved, setResolved] = useState(false);
  const [resolving, setResolving] = useState(false);

  const handleExecuteResolution = () => {
    setResolving(true);
    setTimeout(() => {
      setResolving(false);
      setResolved(true);
    }, 450);
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
              <span className="text-[#0F766E]">Conflict Resolution (pe_hw_03_08)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Availability Conflict Resolution & Safety Audit
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] text-xs font-bold uppercase">
                {resolved ? 'Resolved' : '1 Active Conflict'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Inspect overlapping customer reservations against maintenance windows and choose a non-destructive resolution pathway.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/pricing/closures')}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Closures
            </button>
            <button
              onClick={() => onNavigate('/host/pricing/history')}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Audit Log →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-6">
        {/* CONFLICT BANNER */}
        {!resolved ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FEF2F2] border border-[#F87171] text-[#991B1B] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="font-bold text-sm text-[#991B1B]">1 Active Schedule Conflict Detected</h3>
                <p className="text-xs text-[#B91C1C] mt-0.5">
                  A motorist holds a confirmed booking in Bay B-04 during a proposed maintenance window.
                </p>
              </div>
            </div>
            <span className="font-mono text-xs font-bold uppercase bg-[#FEE2E2] px-3 py-1 rounded-full border border-[#FCA5A5]">
              Threat Level: Blocking
            </span>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F0FDF4] border border-[#86EFAC] text-[#166534] flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <h3 className="font-bold text-sm">Conflict Inspection Completed</h3>
              <p className="text-xs text-[#15803D]">
                Host audit confirmed. Resolution unavailable — no safe execution API exists for automatically modifying live bookings.
              </p>
            </div>
          </div>
        )}

        {/* DOSSIER & RESOLUTION PATHWAYS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 6 COLS: CONFLICT DOSSIER */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <span>🔍</span>
              <span>Conflict Inspection Dossier</span>
            </h2>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-3 text-xs">
              <div className="flex justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-[#64748B]">Affected Booking:</span>
                <span className="font-mono font-bold text-[#141B2C]">Active Session</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Motorist Name:</span>
                <span className="font-bold text-[#141B2C]">Rahul Sharma (+91 98401 22311)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Target Space:</span>
                <span className="font-bold text-[#141B2C]">Bay B-04 (Basement 2)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Booking Window:</span>
                <span className="font-mono text-[#141B2C]">15 Nov 2025, 14:00 — 18:00 IST</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0] text-[#D92D20]">
                <span className="font-bold">Conflicting Event:</span>
                <span className="font-bold">Basement 2 Flooring Wash (14:00 - 20:00)</span>
              </div>
            </div>
          </div>

          {/* RIGHT 6 COLS: SAFE PATHWAYS */}
          <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <span>🛡️</span>
              <span>Safe Resolution Pathways</span>
            </h2>

            <div className="space-y-3">
              {[
                {
                  id: 'reassign',
                  title: 'Pathway A: Reassign Motorist to Bay B-05',
                  desc: 'Resolution unavailable — no safe execution API exists for automatically reallocating confirmed customer bookings without driver consent.',
                  recommended: true,
                },
                {
                  id: 'postpone',
                  title: 'Pathway B: Postpone Maintenance Window',
                  desc: 'Shift the flooring wash window to 18:30 IST after motorist completes departure.',
                  recommended: false,
                },
                {
                  id: 'exclude',
                  title: 'Pathway C: Exclude Bay B-04 from Closure Zone',
                  desc: 'Keep Bay B-04 active during maintenance and partition wash zone to remaining bays.',
                  recommended: false,
                },
              ].map((p) => (
                <div
                  key={p.id}
                  onClick={() => !resolved && setSelectedPathway(p.id as any)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedPathway === p.id
                      ? 'border-[#0F766E] bg-[#F0FDFA] ring-2 ring-[#0F766E]/20'
                      : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                  } ${resolved ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-[#141B2C]">{p.title}</span>
                    {p.recommended && (
                      <span className="text-[10px] uppercase font-bold text-[#0F766E] bg-[#CCFBF1] px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <strong>Operational Notice:</strong> Resolution unavailable — no safe execution API is currently exposed to mutate active confirmed driver reservations.
            </div>

            {!resolved ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExecuteResolution}
                  disabled={resolving}
                  className="w-full py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  {resolving ? 'Executing Protocol...' : 'Review Resolution Plan'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('/host/pricing')}
                className="w-full py-3 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
              >
                Return to Tariffs
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
