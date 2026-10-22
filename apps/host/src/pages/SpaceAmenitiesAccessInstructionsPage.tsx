import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingSpace, AccessArrangementType } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId: string;
  spaceId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

const AVAILABLE_AMENITIES = [
  { id: 'ev_charger', label: 'EV Fast Charger (Type 2)', icon: '⚡', desc: 'Dedicated 7.4kW - 22kW charging point' },
  { id: 'covered_roof', label: 'Covered Canopy Roof', icon: '☂️', desc: '100% weather and sun shielding' },
  { id: 'cctv_security', label: '24/7 CCTV Surveillance', icon: '📹', desc: 'Monitored camera coverage over bay' },
  { id: 'guard_on_duty', label: 'Security Guard On-Site', icon: '👮', desc: 'Physical personnel at gate entrance' },
  { id: 'elevator_access', label: 'Elevator / Lift Access', icon: '🛗', desc: 'Direct elevator from parking to lobby' },
  { id: 'wheelchair_ramp', label: 'Accessible Ramp', icon: '♿', desc: 'Step-free barrierless pathway' },
  { id: 'tire_inflator', label: 'Tire Inflator & Air', icon: '🛞', desc: 'Complimentary motorist air station' },
  { id: 'washroom_access', label: 'Restroom Facility', icon: '🚻', desc: 'Clean washroom facilities on floor' },
];

export function SpaceAmenitiesAccessInstructionsPage({
  facilityId,
  spaceId,
  currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'ev_charger',
    'covered_roof',
    'cctv_security',
    'guard_on_duty',
  ]);
  const [accessMethod, setAccessMethod] = useState<AccessArrangementType>('anpr_barrier');
  const [gatePinCode, setGatePinCode] = useState('7492');
  const [accessHotline, setAccessHotline] = useState('+91 44 2621 8899');
  const [entranceInstructions, setEntranceInstructions] = useState(
    'Enter via North Ramp Gate 2. Scan QR code or let ANPR camera read vehicle plate.'
  );
  const [pedestrianGuidance, setPedestrianGuidance] = useState(
    'Take Core B Elevator to Ground Floor Plaza. Security code for pedestrian return door is 1984.'
  );

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadSpace();
  }, [spaceId]);

  const loadSpace = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.spaces.get(spaceId);
      setSpace(data);
      if (data.amenities && data.amenities.length > 0) {
        setSelectedAmenities(data.amenities);
      }
      if (data.accessMethod) {
        setAccessMethod(data.accessMethod);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load bay amenities');
    } finally {
      setLoading(false);
    }
  };

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.spaces.update(spaceId, {
        amenities: selectedAmenities,
        accessMethod,
      });
      setSuccessMsg('Amenity declarations and arrival access directives saved successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save space amenities');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#64748B]">Auditing Amenity Specifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <button onClick={() => onNavigate('/host/spaces')} className="hover:underline">Spaces</button>
              <span>/</span>
              <span>Bay {space?.bayIdentifier || 'A-04'}</span>
              <span>/</span>
              <span className="text-[#0F766E]">Amenities & Access (pe_hw_02_07)</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              Space Amenities & Access Arrangements
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Declare physical amenities truthfully and establish barrier hardware protocols for arriving motorists.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(`/host/spaces/${spaceId}/restrictions`)}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Compatibility
            </button>
            <button
              onClick={() => onNavigate(`/host/facilities/${facilityId}/preview`)}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Photos & Preview →
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 7 COLS: FORM CONTROLS */}
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
            {/* 1. AMENITIES DECLARATIONS */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                    Truthful Amenity Declarations
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-[#0F766E] bg-[#CCFBF1] px-2.5 py-1 rounded-full uppercase">
                  {selectedAmenities.length} Active
                </span>
              </div>
              <p className="text-xs text-[#64748B] mb-4">
                Amenities declared here are exposed to customer search filters. False representations result in listing suspension.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_AMENITIES.map((item) => {
                  const active = selectedAmenities.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleAmenity(item.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        active
                          ? 'border-[#0F766E] bg-[#F0FDFA] ring-2 ring-[#0F766E]/20'
                          : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xl">{item.icon}</span>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {}}
                          className="accent-[#0F766E] w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <div className="font-bold text-xs text-[#141B2C]">{item.label}</div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">{item.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. ACCESS ARRANGEMENT & ENTRY HARDWARE */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚧</span>
                  <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                    Access Arrangement & Entry Hardware Reality
                  </h2>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-2">Ingress Barrier Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'anpr_barrier', label: 'ANPR Camera Boom Barrier', sub: 'Camera scans number plate automatically', icon: '📸' },
                      { id: 'guarded_boom_barrier', label: 'Guarded Boom Barrier', sub: 'Security guard checks driver mobile pass', icon: '👮' },
                      { id: 'keypad_lockbox', label: 'Digital Keypad / Lockbox', sub: 'Motorist enters PIN on entry terminal', icon: '🔢' },
                      { id: 'open_ingress', label: 'Open Ingress (No Barrier)', sub: 'Drive-in direct access with bay marker', icon: '🚪' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAccessMethod(opt.id as AccessArrangementType)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          accessMethod === opt.id
                            ? 'border-[#0F766E] bg-[#F0FDFA] ring-2 ring-[#0F766E]/20'
                            : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                        }`}
                      >
                        <div className="text-xl mb-1">{opt.icon}</div>
                        <div className="text-xs font-bold text-[#141B2C]">{opt.label}</div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Backup Entry PIN Code</label>
                    <input
                      type="text"
                      value={gatePinCode}
                      onChange={(e) => setGatePinCode(e.target.value)}
                      placeholder="e.g. 7492"
                      className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl font-mono focus:ring-2 focus:ring-[#0F766E] outline-none"
                    />
                    <p className="text-[10px] text-[#94A3B8] mt-1">Dispatched to driver 15 mins before arrival</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Gate Operations Hotline</label>
                    <input
                      type="text"
                      value={accessHotline}
                      onChange={(e) => setAccessHotline(e.target.value)}
                      placeholder="e.g. +91 44 2621 8899"
                      className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                    />
                    <p className="text-[10px] text-[#94A3B8] mt-1">Direct contact for driver gate assistance</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Gate Entrance Directives</label>
                  <textarea
                    rows={2}
                    value={entranceInstructions}
                    onChange={(e) => setEntranceInstructions(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Pedestrian Exit & Return Guidance</label>
                  <textarea
                    rows={2}
                    value={pedestrianGuidance}
                    onChange={(e) => setPedestrianGuidance(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer"
              >
                {saving ? 'Saving...' : '💾 Save Amenities & Access Protocol'}
              </button>
            </div>
          </form>

          {/* RIGHT 5 COLS: ARRIVAL GUIDANCE SIMULATOR */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📱</span>
                  <div>
                    <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                      Motorist In-App Pass Preview
                    </h2>
                    <p className="text-[11px] text-[#64748B]">Driver perspective upon confirmed booking</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-[#CCFBF1] text-[#0F766E] font-bold px-2 py-0.5 rounded">
                  Live Sync
                </span>
              </div>

              {/* SIMULATED MOBILE CARD */}
              <div className="bg-[#101828] text-white rounded-2xl p-5 shadow-lg border border-[#1E293B]">
                <div className="flex items-center justify-between border-b border-[#334155] pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse"></span>
                    <span className="text-xs font-bold text-[#E2E8F0]">ACTIVE RESERVATION</span>
                  </div>
                  <span className="font-mono text-xs text-[#94A3B8]">#PE-84920</span>
                </div>

                <div className="mb-4">
                  <div className="text-[11px] text-[#94A3B8] uppercase">Allocated Space</div>
                  <div className="text-xl font-extrabold text-white font-['Plus_Jakarta_Sans'] flex items-center gap-2">
                    <span>Bay {space?.bayIdentifier || 'A-04'}</span>
                    <span className="text-xs font-normal text-[#2DD4BF] bg-[#0F766E]/50 px-2 py-0.5 rounded">
                      {space?.floorLevel || 'Basement 1'}
                    </span>
                  </div>
                </div>

                {/* ACCESS DIRECTIVES */}
                <div className="bg-[#1E293B] rounded-xl p-3.5 mb-3 border border-[#334155]">
                  <div className="text-[10px] uppercase font-bold text-[#2DD4BF] mb-1">Gate Entry Protocol</div>
                  <p className="text-xs text-[#E2E8F0] leading-relaxed">
                    {entranceInstructions}
                  </p>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#334155] text-xs">
                    <span className="text-[#94A3B8]">Gate PIN:</span>
                    <span className="font-mono font-bold text-white tracking-widest text-sm bg-[#0F172A] px-2 py-0.5 rounded">
                      {gatePinCode}
                    </span>
                  </div>
                </div>

                {/* PEDESTRIAN GUIDANCE */}
                <div className="bg-[#1E293B] rounded-xl p-3.5 mb-4 border border-[#334155]">
                  <div className="text-[10px] uppercase font-bold text-[#2DD4BF] mb-1">Pedestrian Exit & Return</div>
                  <p className="text-xs text-[#E2E8F0] leading-relaxed">
                    {pedestrianGuidance}
                  </p>
                </div>

                {/* AMENITIES BADGES */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#94A3B8] mb-2">Verified Bay Amenities</div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAmenities.map((aId) => {
                      const item = AVAILABLE_AMENITIES.find((a) => a.id === aId);
                      return item ? (
                        <span
                          key={aId}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#334155] text-[11px] font-medium text-white"
                        >
                          <span>{item.icon}</span>
                          <span>{item.label.split('(')[0].trim()}</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#334155] flex items-center justify-between text-xs text-[#94A3B8]">
                  <span>Gate Hotline:</span>
                  <span className="text-white font-mono font-semibold">{accessHotline}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
