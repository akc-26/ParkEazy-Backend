import React, { useState, useEffect } from 'react';
import {
  Layers,
  X,
  Zap,
  ShieldCheck,
  Check,
  AlertCircle,
  Building2,
  Info,
  Car,
  Ruler,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  ParkingLocation,
  ParkingBay,
  BayType,
  BayStatus,
  VehicleCategory,
  CreateBayRequest,
} from '../../../packages/contracts';

interface AddBayModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostId: string;
  facilities: ParkingLocation[];
  preselectedFacilityId?: string;
  onBayCreated: (bay: ParkingBay, facilityId: string) => void;
}

const VEHICLE_CATEGORIES: { id: VehicleCategory; label: string; desc: string }[] = [
  { id: VehicleCategory.COMPACT, label: 'Compact / Hatchback', desc: 'Mini, Fiat 500, Golf' },
  { id: VehicleCategory.SEDAN, label: 'Standard Sedan', desc: 'Camry, Model 3, Accord' },
  { id: VehicleCategory.SUV, label: 'Mid-to-Full SUV', desc: 'RAV4, Model Y, Explorer' },
  { id: VehicleCategory.TRUCK, label: 'Pickup Truck', desc: 'F-150, Silverado, Rivian' },
  { id: VehicleCategory.VAN, label: 'Van / Minivan', desc: 'Transit, Sprinter, Sienna' },
  { id: VehicleCategory.MOTORCYCLE, label: 'Motorcycle', desc: 'Two-wheeled vehicles' },
];

export const AddBayModal: React.FC<AddBayModalProps> = ({
  isOpen,
  onClose,
  hostId,
  facilities,
  preselectedFacilityId,
  onBayCreated,
}) => {
  // Facility selection
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    preselectedFacilityId || (facilities.length > 0 ? facilities[0].id : '')
  );

  // Form attributes
  const [bayNumber, setBayNumber] = useState('');
  const [bayType, setBayType] = useState<BayType>(BayType.STANDARD);
  const [levelOrFloor, setLevelOrFloor] = useState('Ground');
  const [status, setStatus] = useState<BayStatus>(BayStatus.AVAILABLE);

  // Dimensions
  const [maxHeight, setMaxHeight] = useState('2.2');
  const [maxLength, setMaxLength] = useState('5.2');
  const [maxWidth, setMaxWidth] = useState('2.2');

  // Categories
  const [supportedVehicles, setSupportedVehicles] = useState<VehicleCategory[]>([
    VehicleCategory.SEDAN,
    VehicleCategory.SUV,
    VehicleCategory.COMPACT,
  ]);

  // Features
  const [isEvCharging, setIsEvCharging] = useState(false);
  const [evChargerKw, setEvChargerKw] = useState('11');
  const [hasCctv, setHasCctv] = useState(true);
  const [isCovered, setIsCovered] = useState(true);
  const [isAccessible, setIsAccessible] = useState(false);

  // Instructions & Notes
  const [notes, setNotes] = useState('');
  const [instructions, setInstructions] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update selected facility when preselectedFacilityId or facilities changes
  useEffect(() => {
    if (preselectedFacilityId) {
      setSelectedFacilityId(preselectedFacilityId);
    } else if (facilities.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [preselectedFacilityId, facilities, selectedFacilityId]);

  if (!isOpen) return null;

  const toggleCategory = (cat: VehicleCategory) => {
    setSupportedVehicles((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedFacilityId) {
      setErrorMessage('Please select a target facility for this parking bay.');
      return;
    }

    if (!bayNumber.trim()) {
      setErrorMessage('Bay number / identifier is required.');
      return;
    }

    const heightNum = parseFloat(maxHeight);
    const lengthNum = parseFloat(maxLength);
    const widthNum = parseFloat(maxWidth);

    if (isNaN(heightNum) || heightNum <= 0) {
      setErrorMessage('Max vehicle height must be a valid positive number in meters.');
      return;
    }

    if (supportedVehicles.length === 0) {
      setErrorMessage('Please select at least one supported vehicle category.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreateBayRequest = {
        bayNumber: bayNumber.trim(),
        bayType,
        levelOrFloor: levelOrFloor.trim() || 'Ground',
        status,
        maxVehicleHeightMeters: heightNum,
        maxVehicleLengthMeters: !isNaN(lengthNum) && lengthNum > 0 ? lengthNum : undefined,
        maxVehicleWidthMeters: !isNaN(widthNum) && widthNum > 0 ? widthNum : undefined,
        supportedVehicles,
        isEvCharging,
        evChargerKw: isEvCharging ? parseFloat(evChargerKw || '7.4') : undefined,
        hasCctv,
        isCovered,
        isAccessible,
        notes: notes.trim() || undefined,
        instructions: instructions.trim() || undefined,
      };

      const createdBay = await apiClient.createHostSpace(
        hostId,
        selectedFacilityId,
        payload
      );

      // Reset form on success
      setBayNumber('');
      setNotes('');
      setInstructions('');
      setIsEvCharging(false);
      setIsAccessible(false);
      setErrorMessage(null);

      onBayCreated(createdBay, selectedFacilityId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save parking space.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-bay-title"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 id="add-bay-title" className="font-extrabold text-base text-[#132A24]">
                Add New Parking Bay
              </h3>
              <p className="text-xs text-slate-500">
                Register an independently identifiable physical space with vehicle clearances and specs.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Error creating space: </span>
              {errorMessage}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-5 text-xs">
          {/* Target Facility Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Target Parking Facility <span className="text-rose-500">*</span>
            </label>
            {facilities.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                No facilities available. Please create a parking facility first.
              </div>
            ) : (
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                required
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.address.line1}, {f.address.city} ({f.totalBays} existing bays)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Bay Identification & Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bay Identifier / Space # <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. B2-14, Spot 5"
                value={bayNumber}
                onChange={(e) => setBayNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                required
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Must be unique within this facility.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Level / Section / Floor
              </label>
              <input
                type="text"
                placeholder="e.g. Ground, Level 2, Deck B"
                value={levelOrFloor}
                onChange={(e) => setLevelOrFloor(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Bay Space Type
              </label>
              <select
                value={bayType}
                onChange={(e) => {
                  const val = e.target.value as BayType;
                  setBayType(val);
                  if (val === BayType.EV_CHARGING) setIsEvCharging(true);
                  if (val === BayType.ACCESSIBLE) setIsAccessible(true);
                  if (val === BayType.COVERED) setIsCovered(true);
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
              >
                <option value={BayType.STANDARD}>Standard Bay</option>
                <option value={BayType.EV_CHARGING}>EV Charging Bay</option>
                <option value={BayType.ACCESSIBLE}>Accessible / ADA Bay</option>
                <option value={BayType.COVERED}>Covered Bay</option>
                <option value={BayType.COMPACT}>Compact Bay</option>
                <option value={BayType.OVERSIZED}>Oversized Vehicle</option>
              </select>
            </div>
          </div>

          {/* Operational Status */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 block">Initial Operational Status</span>
              <span className="text-[11px] text-slate-500">
                Set whether this space is immediately open to reservations or under maintenance.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStatus(BayStatus.AVAILABLE)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  status === BayStatus.AVAILABLE
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                ● Available (Active)
              </button>
              <button
                type="button"
                onClick={() => setStatus(BayStatus.MAINTENANCE)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  status === BayStatus.MAINTENANCE
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                ● Maintenance (Deactivated)
              </button>
            </div>
          </div>

          {/* Vehicle Dimensions and Clearances */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-slate-400" />
              Vehicle Clearances &amp; Space Dimensions
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">
                  Max Height (meters) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="5.0"
                  value={maxHeight}
                  onChange={(e) => setMaxHeight(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">
                  Max Length (meters)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="2.0"
                  max="10.0"
                  value={maxLength}
                  onChange={(e) => setMaxLength(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-0.5">
                  Max Width (meters)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="4.0"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Supported Vehicle Categories */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-slate-400" />
              Supported Vehicle Categories <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VEHICLE_CATEGORIES.map((cat) => {
                const isSelected = supportedVehicles.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'border border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <span className="font-bold text-xs block">{cat.label}</span>
                      <span className="text-[10px] text-slate-500 block">{cat.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* EV Charging & Power Specifications */}
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <div>
                  <span className="font-bold text-emerald-950 block">EV Charging Station Equipped</span>
                  <span className="text-[11px] text-emerald-800">
                    Dedicated Level 2 or DC Fast charging available directly at this space.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isEvCharging}
                onChange={(e) => setIsEvCharging(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            {isEvCharging && (
              <div className="pt-2 border-t border-emerald-100/80 flex items-center gap-4">
                <label className="font-semibold text-emerald-900">Charger Rating:</label>
                <select
                  value={evChargerKw}
                  onChange={(e) => setEvChargerKw(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="7.4">7.4 kW — Level 2 Standard AC</option>
                  <option value="11">11.0 kW — Three-Phase AC</option>
                  <option value="22">22.0 kW — Fast Three-Phase AC</option>
                  <option value="50">50.0 kW — DC Fast Charger</option>
                  <option value="150">150.0 kW — Ultra-Fast DC</option>
                </select>
              </div>
            )}
          </div>

          {/* Additional Bay Attributes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={hasCctv}
                onChange={(e) => setHasCctv(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">CCTV Monitored</span>
                <span className="text-[10px] text-slate-500">Covered by camera</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isCovered}
                onChange={(e) => setIsCovered(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">Covered / Canopy</span>
                <span className="text-[10px] text-slate-500">Weather protected</span>
              </div>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isAccessible}
                onChange={(e) => setIsAccessible(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold text-slate-800 block">ADA Accessible</span>
                <span className="text-[10px] text-slate-500">Disabled permit zone</span>
              </div>
            </label>
          </div>

          {/* Instructions & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Driver Navigation / Placement Guidance
              </label>
              <input
                type="text"
                placeholder="e.g. Enter ramp B, turn left at pillar 14."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Internal Host Notes / Restrictions
              </label>
              <input
                type="text"
                placeholder="e.g. Wall box charger on front; tight turning radius."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              themeContext="host"
              disabled={isSubmitting || facilities.length === 0}
              className="font-bold bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] px-5"
            >
              {isSubmitting ? 'Saving Bay...' : 'Save & Add Bay'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
