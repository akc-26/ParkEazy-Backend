import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  ArrowLeft,
  Check,
  AlertCircle,
  Save,
  ShieldAlert,
  Car,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  BayType,
  BayStatus,
  UpdateBayRequest,
} from '../../../packages/contracts';

interface HostSpaceEditViewProps {
  currentUser: SessionUser | null;
  spaceId: string;
  onNavigate: (path: string) => void;
}

export const HostSpaceEditView: React.FC<HostSpaceEditViewProps> = ({
  currentUser,
  spaceId,
  onNavigate,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [facility, setFacility] = useState<ParkingLocation | null>(null);
  const [bay, setBay] = useState<ParkingBay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [bayNumber, setBayNumber] = useState('');
  const [bayType, setBayType] = useState<BayType>(BayType.STANDARD);
  const [levelOrFloor, setLevelOrFloor] = useState('');
  const [status, setStatus] = useState<BayStatus>(BayStatus.AVAILABLE);

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
      setBayNumber(foundBay.bayNumber);
      setBayType(foundBay.bayType);
      setLevelOrFloor(foundBay.levelOrFloor || 'Ground');
      setStatus(foundBay.status);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve parking space.');
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

    if (!bayNumber.trim()) {
      setErrorMessage('Bay number cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updatePayload: UpdateBayRequest = {
        bayNumber: bayNumber.trim(),
        bayType,
        levelOrFloor: levelOrFloor.trim(),
        status,
      };

      const updated = await apiClient.updateHostSpace(hostId, facility.id, bay.id, updatePayload);
      setBay(updated);
      setSuccessMessage('Parking space updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update parking space.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Loading parking space...</p>
      </div>
    );
  }

  if (errorMessage && !bay) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Space Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">{errorMessage}</p>
        <Button
          variant="primary"
          themeContext="host"
          size="sm"
          onClick={() => onNavigate('/host/spaces')}
          className="mt-4"
        >
          Return to Facilities
        </Button>
      </div>
    );
  }

  return (
    <div
      data-screen-id="pe_hw_02_05"
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
          pe_hw_02_05 • Edit Parking Space
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
          <span className="text-emerald-700 font-bold">Space {bay?.bayNumber}</span>
        </div>

        {/* Space Navigation Sub-Tabs */}
        <div className="flex items-center border-b border-slate-200 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => onNavigate(`/host/spaces/${spaceId}/edit`)}
            className="pb-3 border-b-2 border-[#22C55E] text-[#132A24] flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-emerald-600" />
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

        {/* Form Container */}
        <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs">
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-extrabold text-[#132A24]">
                Physical Space Identity
              </h2>
              <Badge variant={status === BayStatus.AVAILABLE ? 'success' : 'warning'}>
                {status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bay Identifier / Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={bayNumber}
                  onChange={(e) => setBayNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 font-mono font-bold text-sm"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must be unique within this facility.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Level / Floor / Deck
                </label>
                <input
                  type="text"
                  value={levelOrFloor}
                  onChange={(e) => setLevelOrFloor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Used by drivers for floor-level wayfinding.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Space Classification / Bay Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={bayType}
                  onChange={(e) => setBayType(e.target.value as BayType)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm"
                >
                  <option value={BayType.STANDARD}>Standard Parking Bay</option>
                  <option value={BayType.COMPACT}>Compact Vehicle Space</option>
                  <option value={BayType.EV_CHARGING}>EV Dedicated Charging Space</option>
                  <option value={BayType.ACCESSIBLE}>Accessible (ADA) Space</option>
                  <option value={BayType.COVERED}>Covered / Weather Protected</option>
                  <option value={BayType.OVERSIZED}>Oversized Vehicle / Van Space</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Operational Booking Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BayStatus)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-semibold"
                >
                  <option value={BayStatus.AVAILABLE}>Available for Bookings</option>
                  <option value={BayStatus.MAINTENANCE}>Maintenance / Temporarily Inactive</option>
                  <option value={BayStatus.OCCUPIED}>Occupied</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onNavigate(facility ? `/host/facilities/${facility.id}/layout` : '/host/spaces')}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                themeContext="host"
                size="md"
                disabled={isSaving}
                className="bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] font-bold px-6 shadow-sm"
              >
                {isSaving ? 'Saving...' : 'Save Space Attributes'}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};
