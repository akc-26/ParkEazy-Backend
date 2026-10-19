import React, { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Layers,
  Zap,
  ArrowLeft,
  Check,
  AlertCircle,
  Save,
  ShieldAlert,
  Ruler,
  RefreshCw,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  VehicleCategory,
  UpdateBayRequest,
} from '../../../packages/contracts';

interface HostSpaceRestrictionsViewProps {
  currentUser: SessionUser | null;
  spaceId: string;
  onNavigate: (path: string) => void;
}

const VEHICLE_CATEGORIES: { id: VehicleCategory; label: string; desc: string }[] = [
  { id: VehicleCategory.COMPACT, label: 'Compact / Hatchback', desc: 'Mini, Fiat 500, Golf' },
  { id: VehicleCategory.SEDAN, label: 'Standard Sedan', desc: 'Camry, Model 3, BMW 3' },
  { id: VehicleCategory.SUV, label: 'Mid-to-Full SUV', desc: 'RAV4, Model Y, Explorer' },
  { id: VehicleCategory.TRUCK, label: 'Pickup Truck', desc: 'F-150, Silverado, Cybertruck' },
  { id: VehicleCategory.VAN, label: 'Van / Minivan', desc: 'Sprinter, Transit, Odyssey' },
  { id: VehicleCategory.MOTORCYCLE, label: 'Motorcycle / Scooter', desc: 'Two-wheeled vehicles' },
];

export const HostSpaceRestrictionsView: React.FC<HostSpaceRestrictionsViewProps> = ({
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

  // Clearance and restriction fields
  const [maxHeight, setMaxHeight] = useState('2.2');
  const [maxLength, setMaxLength] = useState('5.2');
  const [maxWidth, setMaxWidth] = useState('2.2');
  const [supportedVehicles, setSupportedVehicles] = useState<VehicleCategory[]>([
    VehicleCategory.SEDAN,
    VehicleCategory.SUV,
    VehicleCategory.COMPACT,
  ]);
  const [isAccessible, setIsAccessible] = useState(false);
  const [isCovered, setIsCovered] = useState(true);

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
      setMaxHeight(foundBay.maxVehicleHeightMeters ? String(foundBay.maxVehicleHeightMeters) : '2.2');
      setMaxLength(foundBay.maxVehicleLengthMeters ? String(foundBay.maxVehicleLengthMeters) : '5.2');
      setMaxWidth(foundBay.maxVehicleWidthMeters ? String(foundBay.maxVehicleWidthMeters) : '2.2');
      setSupportedVehicles(
        foundBay.supportedVehicles && foundBay.supportedVehicles.length > 0
          ? foundBay.supportedVehicles
          : [VehicleCategory.SEDAN, VehicleCategory.SUV, VehicleCategory.COMPACT]
      );
      setIsAccessible(Boolean(foundBay.isAccessible));
      setIsCovered(Boolean(foundBay.isCovered));
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve space restrictions.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, spaceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleCategory = (cat: VehicleCategory) => {
    setSupportedVehicles((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility || !bay) return;

    if (supportedVehicles.length === 0) {
      setErrorMessage('Please select at least one supported vehicle category.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatePayload: UpdateBayRequest = {
        maxVehicleHeightMeters: maxHeight ? parseFloat(maxHeight) : undefined,
        maxVehicleLengthMeters: maxLength ? parseFloat(maxLength) : undefined,
        maxVehicleWidthMeters: maxWidth ? parseFloat(maxWidth) : undefined,
        supportedVehicles,
        isAccessible,
        isCovered,
      };

      const updated = await apiClient.updateHostSpace(hostId, facility.id, bay.id, updatePayload);
      setBay(updated);
      setSuccessMessage('Vehicle clearance and restrictions updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update vehicle restrictions.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Loading restrictions...</p>
      </div>
    );
  }

  return (
    <div
      data-screen-id="pe_hw_02_06"
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
          pe_hw_02_06 • Vehicle Clearance &amp; Restrictions
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
          <span className="text-emerald-700 font-bold">Space {bay?.bayNumber} Restrictions</span>
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
            className="pb-3 border-b-2 border-[#22C55E] text-[#132A24] flex items-center gap-1.5"
          >
            <Car className="w-4 h-4 text-emerald-600" />
            <span>Clearance &amp; Vehicle Restrictions</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate(`/host/spaces/${spaceId}/amenities`)}
            className="pb-3 text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4 text-slate-400" />
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
          {/* Section 1: Dimensions & Physical Clearances */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-[#132A24] border-b border-slate-100 pb-3">
              <Ruler className="w-4 h-4 text-emerald-600" />
              <span>Physical Dimensions &amp; Height Clearance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Max Vehicle Height (Meters)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="1.5"
                    max="5.0"
                    value={maxHeight}
                    onChange={(e) => setMaxHeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    m
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Critical for covered parking garages.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Max Vehicle Length (Meters)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="3.0"
                    max="10.0"
                    value={maxLength}
                    onChange={(e) => setMaxLength(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    m
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Standard bay is ~5.0m - 5.5m.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Max Vehicle Width (Meters)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    min="1.5"
                    max="4.0"
                    value={maxWidth}
                    onChange={(e) => setMaxWidth(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    m
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Standard bay is ~2.2m - 2.5m.
                </span>
              </div>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCovered}
                  onChange={(e) => setIsCovered(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 h-4 w-4"
                />
                <div>
                  <span className="font-bold text-slate-800 block">Covered Space</span>
                  <span className="text-[11px] text-slate-500">Protected from rain, sun, and snow.</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAccessible}
                  onChange={(e) => setIsAccessible(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 h-4 w-4"
                />
                <div>
                  <span className="font-bold text-slate-800 block">Accessible (ADA Compliant)</span>
                  <span className="text-[11px] text-slate-500">Wide aisle and step-free access.</span>
                </div>
              </label>
            </div>
          </Card>

          {/* Section 2: Vehicle Compatibility Categories */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-[#132A24] border-b border-slate-100 pb-3">
              <Car className="w-4 h-4 text-emerald-600" />
              <span>Supported Vehicle Categories</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {VEHICLE_CATEGORIES.map((cat) => {
                const isSelected = supportedVehicles.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{cat.label}</span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {cat.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="pt-2 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/host/spaces/${spaceId}/edit`)}
            >
              Back to Core Attributes
            </Button>

            <Button
              type="submit"
              variant="primary"
              themeContext="host"
              size="md"
              disabled={isSaving}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] font-bold px-6 shadow-sm"
            >
              {isSaving ? 'Saving...' : 'Save Clearances & Restrictions'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};
