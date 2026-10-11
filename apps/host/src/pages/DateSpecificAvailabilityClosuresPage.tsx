import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

interface ClosureEvent {
  id: string;
  title: string;
  type: 'holiday' | 'maintenance' | 'event';
  startDate: string;
  endDate: string;
  scope: string;
  status: 'active' | 'upcoming' | 'expired';
}

const INITIAL_CLOSURES: ClosureEvent[] = [
  {
    id: 'cl-1',
    title: 'Diwali Festival Public Holiday',
    type: 'holiday',
    startDate: '2025-11-01',
    endDate: '2025-11-03',
    scope: 'All 24 Bays',
    status: 'upcoming',
  },
  {
    id: 'cl-2',
    title: 'Basement 2 Hydro-Jet Flooring Wash',
    type: 'maintenance',
    startDate: '2025-11-15',
    endDate: '2025-11-16',
    scope: 'Basement 2 (B-01 to B-12)',
    status: 'upcoming',
  },
  {
    id: 'cl-3',
    title: 'Pongal Festival Surge Period',
    type: 'event',
    startDate: '2026-01-14',
    endDate: '2026-01-17',
    scope: 'All 24 Bays',
    status: 'upcoming',
  },
];

export function DateSpecificAvailabilityClosuresPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [closures, setClosures] = useState<ClosureEvent[]>(INITIAL_CLOSURES);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'holiday' | 'maintenance' | 'event'>('holiday');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newScope, setNewScope] = useState('All 24 Bays');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newStart || !newEnd) return;
    const item: ClosureEvent = {
      id: 'cl-' + Date.now(),
      title: newTitle,
      type: newType,
      startDate: newStart,
      endDate: newEnd,
      scope: newScope,
      status: 'upcoming',
    };
    setClosures([...closures, item]);
    setShowModal(false);
    setNewTitle('');
    setNewStart('');
    setNewEnd('');
  };

  const handleDelete = (id: string) => {
    setClosures(closures.filter((c) => c.id !== id));
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
              <span className="text-[#0F766E]">Date Closures (pe_hw_03_04)</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Date-Specific Availability & Temporary Closures
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#CCFBF1] text-[#0F766E] text-xs font-bold font-mono">
                {closures.length} Blackouts
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              Schedule public holidays, maintenance shutdowns, seasonal hours, or VIP event blackouts without disrupting verified motorist bookings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/host/pricing/schedule')}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Weekly Hours
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span>
              <span>Add Calendar Closure</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <span>📅</span>
              <span>Active & Scheduled Calendar Overrides</span>
            </h2>
            <button
              onClick={() => onNavigate('/host/pricing/conflicts')}
              className="text-xs font-bold text-[#D92D20] hover:underline"
            >
              Audit Conflicts →
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9]">
            {closures.map((c) => (
              <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5">
                    {c.type === 'holiday' ? '🎉' : c.type === 'maintenance' ? '🔧' : '🎪'}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#141B2C]">{c.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-[#64748B] mt-1">
                      <span>From: <strong className="font-mono text-[#141B2C]">{c.startDate}</strong></span>
                      <span>To: <strong className="font-mono text-[#141B2C]">{c.endDate}</strong></span>
                      <span>•</span>
                      <span className="font-medium text-[#0F766E]">{c.scope}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] uppercase">
                    {c.status}
                  </span>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs text-[#D92D20] hover:underline cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ADD MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Add Calendar Closure Override
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[#94A3B8] hover:text-[#141B2C] font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">Reason / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Festival Closure"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e: any) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="holiday">Public Holiday</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="event">VIP Event Blackout</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Scope</label>
                  <select
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                  >
                    <option value="All 24 Bays">All 24 Bays</option>
                    <option value="Basement 1 Only">Basement 1 Only</option>
                    <option value="Basement 2 Only">Basement 2 Only</option>
                    <option value="EV Bays Only">EV Bays Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
