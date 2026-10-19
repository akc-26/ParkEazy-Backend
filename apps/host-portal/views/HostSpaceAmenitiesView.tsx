import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Layers,
  Car,
  ArrowLeft,
  Check,
  AlertCircle,
  Save,
  ShieldCheck,
  Info,
  RefreshCw,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  UpdateBayRequest,
} from '../../../packages/contracts';

interface HostSpaceAmenitiesViewProps {
  currentUser: SessionUser | null;
  spaceId: string;
  onNavigate: (path: string) => void;
}

export const HostSpaceAmenitiesView: React.FC<HostSpaceAmenitiesViewProps> = ({
  currentUser,
  spaceId,
  onNavigate,
}) => {
  const hostId = currentUser?.id ?? '';

  const [facility, setFacility] = useState<ParkingLocation | null>(null);
  const [bay, setBay] = useState<ParkingBay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Amenity and access fields
  const [isEvCharging, setIsEvCharging] = useState(false);
  const [evChargerKw, setEvChargerKw] = useState('11');
  const [hasCctv, setHasCctv] = useState(true);
  const [isCovered, setIsCovered] = useState(true);
  const [instructions, setInstructions] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const facilities = await apiClient.getHostFacilities(hostId);
      let foundFacility: ParkingLocation | null = null;
      let foundBay: ParkingBay | null = null;

      for (const fac of facilities) {
        const bays = await apiClient.getHostSpaces(hostId, fac.id);
        const match = bays.find((b) => b.id === spaceId);
        if (match) {
          foundFacility = fac;
          foundBay = match;
          break;
        }
      }

      if (!foundFacility || !foundBay) {
        throw new Error(`Parking space '${spaceId}' not found in your inventory.`);
      }

      setFacility(foundFacility);
      setBay(foundBay);
      setIsEvCharging(Boolean(foundBay.isEvCharging));
      setEvChargerKw(foundBay.evChargerKw ? String(foundBay.evChargerKw) : '11');
      setHasCctv(Boolean(foundBay.hasCctv));
      setIsCovered(Boolean(foundBay.isCovered));
      setInstructions(foundBay.instructions || '');
      setNotes(foundBay.notes || '');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve space amenities.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, spaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !bay) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatePayload: UpdateBayRequest = {
        isEvCharging,
        evChargerKw: isEvCharging ? parseFloat(evChargerKw || '7.4') : undefined,
        hasCctv,
        isCovered,
        instructions: instructions.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const updated = await apiClient.updateHostSpace(hostId, facility.id, bay.id, updatePayload);
      setBay(updated);
      setSuccessMessage('Space amenities and driver instructions saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update space amenities.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Loading space hardware...</p>
      </div>
    );
  }

  return (
    <div
      data-screen-id="pe_hw_02_07"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      {/* Top Header */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate(facility ? `/host/facilities/${facility.id}/layout` : '/host/spaces')}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Space Layout
          </button>
        </div>
        <div className="text-xs font-mono text-emerald-400">
          pe_hw_02_07 • Amenities &amp; Access Instructions
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onNavigate('/host/spaces')}
            className="hover:underline"
          >
            Facilities
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => onNavigate(`/host/facilities/${facility?.id}`)}
            className="hover:underline font-semibold"
          >
            {facility?.name}
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => onNavigate(`/host/facilities/${facility?.id}/layout`)}
            className="hover:underline"
          >
            Layout
          </button>
          <span>/</span>
          <span className="text-emerald-700 font-bold">Space {bay?.bayNumber} Amenities</span>
        </div>

        {/* Space Navigation Sub-Tabs */}
        <div className="flex items-center border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => onNavigate(`/host/spaces/${spaceId}/edit`)}
            className="pb-3 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Core Attributes</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/host/spaces/${spaceId}/restrictions`)}
            className="pb-3 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Car className="w-4 h-4 text-slate-400" />
            <span>Clearance &amp; Vehicle Restrictions</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/host/spaces/${spaceId}/amenities`)}
            className="pb-3 border-b-2 border-[#22C55E] text-[#132A24] flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>Amenities &amp; Hardware</span>
          </button>
        </div>

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Section 1: EV Charging Hardware */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-[#132A24] border-b border-slate-100 pb-3">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>EV Charging Station Configuration</span>
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-emerald-950 block">
                    Dedicated EV Charging Post / Wall Box
                  </span>
                  <span className="text-slate-600 text-xs mt-0.5 block">
                    Enables EV drivers to filter and book this bay specifically for charging needs.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isEvCharging}
                  onChange={(e) => setIsEvCharging(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              {isEvCharging && (
                <div className="pt-3 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-emerald-950 mb-1">
                      Power Delivery Rating (kW)
                    </label>
                    <select
                      value={evChargerKw}
                      onChange={(e) => setEvChargerKw(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold"
                    >
                      <option value="3.6">3.6 kW (Standard 16A 1-Phase)</option>
                      <option value="7.4">7.4 kW (Fast Level 2 32A)</option>
                      <option value="11">11.0 kW (3-Phase AC)</option>
                      <option value="22">22.0 kW (High-Output 3-Phase)</option>
                      <option value="50">50.0 kW (DC Fast Charge Post)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-emerald-950 mb-1">
                      Supported Connector Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Type 2 (Mennekes), CCS, Tesla Wall Connector"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Other Security & Space Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasCctv}
                  onChange={(e) => setHasCctv(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block">Direct CCTV Surveillance</span>
                  <span className="text-[11px] text-slate-500">Bay is under recorded security camera view.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCovered}
                  onChange={(e) => setIsCovered(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block">Covered / Roof Protected</span>
                  <span className="text-[11px] text-slate-500">Weather-shielded parking structure.</span>
                </div>
              </label>
            </div>
          </Card>

          {/* Section 2: Driver In-Bay Guidance */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-[#132A24] border-b border-slate-100 pb-3">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Space-Specific Driver Guidance</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Specific In-Bay Driver Instructions
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Reverse in for easiest exit; wall box charger cord is on driver side; scan QR code on pillar if security gate is lowered."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Shown to drivers on the booking detail page and SMS check-in alert.
              </span>
            </div>
          </Card>

          <div className="pt-2 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/host/spaces/${spaceId}/restrictions`)}
            >
              Back to Restrictions
            </Button>

            <Button
              type="submit"
              variant="primary"
              themeContext="host"
              size="md"
              disabled={isSaving}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] font-bold px-6 shadow-sm"
            >
              {isSaving ? 'Saving...' : 'Save Hardware & Instructions'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};
