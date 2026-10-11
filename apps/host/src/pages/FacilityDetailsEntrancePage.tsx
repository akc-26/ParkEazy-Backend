import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility, IngressCorridorType, FacilityPhoto } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function FacilityDetailsEntrancePage({ facilityId, currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [facility, setFacility] = useState<ParkingFacility | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form Fields
  const [ingressType, setIngressType] = useState<IngressCorridorType>('two_way_ramp');
  const [landmark, setLandmark] = useState('');
  const [maxHeightClearanceMeters, setMaxHeightClearanceMeters] = useState('2.1');
  const [turnByTurnDirections, setTurnByTurnDirections] = useState('');
  const [pedestrianAccessInstructions, setPedestrianAccessInstructions] = useState('');
  const [gatePinCode, setGatePinCode] = useState('');
  const [accessHotline, setAccessHotline] = useState('');
  const [entranceInstructions, setEntranceInstructions] = useState('');
  const [photos, setPhotos] = useState<FacilityPhoto[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadFacility();
  }, [facilityId]);

  const loadFacility = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.facilities.get(facilityId);
      setFacility(data);
      setIngressType(data.ingressType || 'two_way_ramp');
      setLandmark(data.landmark || '');
      setMaxHeightClearanceMeters(String(data.maxHeightClearanceMeters || 2.1));
      setTurnByTurnDirections(data.turnByTurnDirections || '');
      setPedestrianAccessInstructions(data.pedestrianAccessInstructions || '');
      setGatePinCode(data.gatePinCode || '');
      setAccessHotline(data.accessHotline || '');
      setEntranceInstructions(data.entranceInstructions || '');
      setPhotos(data.photos || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load facility');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    const newP: FacilityPhoto = {
      id: `photo-${Date.now()}`,
      url: newPhotoUrl.trim(),
      caption: 'Entrance Gate & Ingress Ramp',
      category: 'entrance',
      isCover: photos.length === 0,
      createdAt: new Date().toISOString(),
    };
    setPhotos([...photos, newP]);
    setNewPhotoUrl('');
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleSave = async (continueToNext: boolean) => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);
    try {
      const updated = await apiClient.facilities.update(facilityId, {
        ingressType,
        landmark: landmark.trim() || undefined,
        maxHeightClearanceMeters: parseFloat(maxHeightClearanceMeters) || 2.1,
        turnByTurnDirections: turnByTurnDirections.trim() || undefined,
        pedestrianAccessInstructions: pedestrianAccessInstructions.trim() || undefined,
        gatePinCode: gatePinCode.trim() || undefined,
        accessHotline: accessHotline.trim() || undefined,
        entranceInstructions: entranceInstructions.trim() || undefined,
        photos,
      });

      setFacility(updated);
      setSuccessMsg('Facility entrance and gate configuration saved successfully.');

      if (continueToNext) {
        onNavigate(`/host/facilities/${facilityId}/layout`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save entrance details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9FF] flex items-center justify-center">
        <div className="text-center text-[#64748B]">
          <div className="inline-block w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-medium">Loading entrance details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2C] flex flex-col font-['Inter']">
      {/* HEADER */}
      <header className="sticky top-0 w-full z-50 bg-[#F9F9FF]/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/host/spaces')}
              className="text-xs font-semibold text-[#64748B] hover:text-[#141B2C] flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Facilities</span>
            </button>
            <div className="h-4 w-px bg-[#E2E8F0]"></div>
            <div>
              <span className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#141B2C] block">
                {facility?.name || 'Facility Entrance & Arrival'}
              </span>
              <span className="text-[10px] text-[#64748B] font-mono">
                {facility?.facilityCode}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#64748B] bg-[#E2E8F0] px-2 py-0.5 rounded">
              PE-HW-02-03
            </span>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#141B2C] hover:bg-[#F1F5F9] transition cursor-pointer"
            >
              Save Draft
            </button>
          </div>
        </div>
      </header>

      {/* WIZARD PROGRESS BAR */}
      <div className="bg-white border-b border-[#E2E8F0] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#0F766E] font-medium cursor-pointer" onClick={() => onNavigate('/host/spaces')}>
            <span className="w-5 h-5 rounded-full bg-[#ECFDF5] text-[#0F766E] flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>Facility Info</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#0F766E] mx-4"></div>
          <div className="flex items-center gap-2 text-[#0F766E] font-bold">
            <span className="w-5 h-5 rounded-full bg-[#0F766E] text-white flex items-center justify-center text-[10px]">2</span>
            <span>Entrance & Gate</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-4"></div>
          <div className="flex items-center gap-2 text-[#64748B] cursor-pointer" onClick={() => onNavigate(`/host/facilities/${facilityId}/layout`)}>
            <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-[10px]">3</span>
            <span>Bay Layout</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-4"></div>
          <div className="flex items-center gap-2 text-[#64748B] cursor-pointer" onClick={() => onNavigate(`/host/facilities/${facilityId}/publish`)}>
            <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-[10px]">4</span>
            <span>Publish Audit</span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs">
            {successMsg}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-8">
          {/* SECTION 1: INGRESS RAMP & HARDWARE */}
          <div>
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              Ingress Ramp & Gate Configuration
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Physical entrance specifications help drivers navigate without barrier hesitation or clearance accidents.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Ingress Corridor Type *
                </label>
                <select
                  value={ingressType}
                  onChange={(e) => setIngressType(e.target.value as IngressCorridorType)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="two_way_ramp">Two-Way Ramp (Dedicated Entry & Exit)</option>
                  <option value="single_lane_signal">Single Lane with Traffic Signal Control</option>
                  <option value="ground_level_barrier">Ground Level Automatic Barrier Gate</option>
                  <option value="open_driveway">Open Driveway (No Barrier Gate)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Overhead Max Clearance (Meters) *
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={maxHeightClearanceMeters}
                  onChange={(e) => setMaxHeightClearanceMeters(e.target.value)}
                  placeholder="2.10"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Enforces strict SUV and commercial van height filters during search.
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Street Facing Visual Landmark
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Opposite Metro Pillar 142, Blue glass commercial tower"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Gate PIN Code (If applicable)
                </label>
                <input
                  type="text"
                  value={gatePinCode}
                  onChange={(e) => setGatePinCode(e.target.value)}
                  placeholder="e.g. 8842"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Only revealed to verified drivers with confirmed booking passes.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Ingress Hotline / Gate Attendant Phone
                </label>
                <input
                  type="text"
                  value={accessHotline}
                  onChange={(e) => setAccessHotline(e.target.value)}
                  placeholder="e.g. +91 44 2621 0000"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PRACTICAL DRIVER DIRECTIONS */}
          <div className="border-t border-[#E2E8F0] pt-6">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              Practical Driver Directions & Arrival Script
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Step-by-step guidance displayed on the active customer booking pass.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Turn-by-Turn Vehicle Arrival Script
                </label>
                <textarea
                  rows={3}
                  value={turnByTurnDirections}
                  onChange={(e) => setTurnByTurnDirections(e.target.value)}
                  placeholder="e.g. Take the service lane past Anna Nagar Roundtana. Turn left into Gate 2. Hold QR pass in front of ANPR kiosk on driver side."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Pedestrian Re-entry & Keypad Instructions
                </label>
                <textarea
                  rows={2}
                  value={pedestrianAccessInstructions}
                  onChange={(e) => setPedestrianAccessInstructions(e.target.value)}
                  placeholder="e.g. Pedestrian access through Lift Lobby B. Enter 4-digit PIN on keypad after 10 PM."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: ENTRANCE PHOTOGRAPHS */}
          <div className="border-t border-[#E2E8F0] pt-6">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              Entrance Gate Photographs
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Visual photos of the street entrance gate and boom barrier make arrival foolproof.
            </p>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="Enter entrance image URL or asset path (e.g. /branding/facilities/entrance.jpg)"
                className="flex-1 px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="px-4 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer"
              >
                + Add Photo
              </button>
            </div>

            {photos.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center text-xs text-[#64748B]">
                No entrance photographs added yet. Add a URL above to display visual gate landmarks.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#F1F5F9] group">
                    <div className="h-24 w-full bg-[#E2E8F0] flex items-center justify-center text-xs text-[#64748B] overflow-hidden">
                      {photo.url.startsWith('http') || photo.url.startsWith('/') ? (
                        <img src={photo.url} alt="Entrance" className="h-full w-full object-cover" />
                      ) : (
                        <span>Photo</span>
                      )}
                    </div>
                    <div className="p-2 text-[10px] text-[#141B2C] truncate">
                      {photo.caption || 'Gate Photo'}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs hover:bg-red-700 transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="border-t border-[#E2E8F0] pt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('/host/spaces')}
              className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition cursor-pointer"
            >
              ← Back to Facilities
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-xs font-semibold hover:bg-[#0F766E]/5 transition cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>{saving ? 'Saving...' : 'Continue to Bay Layout →'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
