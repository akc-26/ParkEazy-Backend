import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility, FacilityClosure } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { validateClosure } from '@parkeazy/validation';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function DateSpecificAvailabilityClosuresPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [closures, setClosures] = useState<FacilityClosure[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadFacilities();
  }, []);

  useEffect(() => {
    if (selectedFacilityId) {
      loadClosures(selectedFacilityId);
    }
  }, [selectedFacilityId]);

  const loadFacilities = async () => {
    setLoading(true);
    setErrorNotice(null);
    try {
      const data = await apiClient.facilities.list();
      setFacilities(data);
      if (data.length > 0) {
        setSelectedFacilityId(data[0].id);
      }
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to load parking facilities.');
    } finally {
      setLoading(false);
    }
  };

  const loadClosures = async (facilityId: string) => {
    try {
      const data = await apiClient.facilities.getClosures(facilityId);
      setClosures(data || []);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to load facility closures.');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacilityId) {
      setErrorNotice('Please select a facility first.');
      return;
    }

    const payload = {
      facilityId: selectedFacilityId,
      startDate: newStart,
      endDate: newEnd,
      reason: newTitle.trim() || undefined
    };

    const val = validateClosure(payload);
    if (!val.isValid) {
      setErrorNotice(val.errors[0]?.message || 'Invalid closure dates.');
      return;
    }

    setSaving(true);
    setErrorNotice(null);
    setSaveNotice(null);

    try {
      await apiClient.facilities.createClosure(selectedFacilityId, payload);
      await loadClosures(selectedFacilityId);
      setShowModal(false);
      setSaveNotice('Closure schedule successfully saved and committed to persistence.');
      setNewTitle('');
      setNewStart('');
      setNewEnd('');
    } catch (err: any) {
      // Conflict reporting (e.g. HTTP 409 or overlapping reservations)
      setErrorNotice(err?.message || 'Failed to create facility closure.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!selectedFacilityId) return;
    setErrorNotice(null);
    setSaveNotice(null);
    try {
      await apiClient.facilities.deleteClosure(selectedFacilityId, id);
      setClosures(closures.filter((c) => c.id !== id));
      setSaveNotice('Closure override successfully removed.');
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to delete closure.');
    }
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
              <span className="text-[#0F766E]">Date Closures (Section 3B)</span>
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
        {/* Facility Selector */}
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="text-xs font-bold text-[#141B2C] shrink-0">Selected Facility:</label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full sm:w-80 px-3 py-1.5 text-xs font-semibold bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl outline-none"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.city || 'Facility'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorNotice && (
          <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs font-semibold text-[#991B1B]">
            ⚠️ {errorNotice}
          </div>
        )}

        {saveNotice && (
          <div className="p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-medium text-[#166534]">
            ✓ {saveNotice}
          </div>
        )}

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

          {closures.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              No date-specific closures scheduled for this facility. Click <strong>+ Add Calendar Closure</strong> to block out holidays or maintenance windows.
            </div>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {closures.map((c) => (
                <div key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-0.5">🗓️</div>
                    <div>
                      <h3 className="font-bold text-sm text-[#141B2C]">{c.reason || 'Scheduled Facility Closure'}</h3>
                      <div className="flex items-center gap-3 text-xs text-[#64748B] mt-1">
                        <span>From: <strong className="font-mono text-[#141B2C]">{c.startDate}</strong></span>
                        <span>To: <strong className="font-mono text-[#141B2C]">{c.endDate}</strong></span>
                        {c.affectedBayIds && c.affectedBayIds.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-[#0F766E]">{c.affectedBayIds.length} Bays Affected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-[#D92D20] hover:underline cursor-pointer font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                className="text-[#94A3B8] hover:text-[#141B2C] font-bold text-lg cursor-pointer"
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
                  placeholder="e.g. Public Holiday or Surface Maintenance"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
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
                  className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Closure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
