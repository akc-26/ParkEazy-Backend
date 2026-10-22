import React, { useState, useEffect } from 'react';
import { UserAccount, VehicleType } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
  vehicleId?: string;
}

export function AddEditVehiclePage({
  currentUser,
  onNavigate,
  onLogout,
  vehicleId,
}: Props) {
  const [category, setCategory] = useState<VehicleType>('car');
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });
    client.vehicles.list().then((vehicles) => {
      const vehicle = vehicles.find((item) => item.id === vehicleId);
      if (!vehicle) throw new Error('Vehicle not found in your account.');
      setCategory(vehicle.vehicleCategory);
      setPlate(vehicle.plateNumber);
      setMake(vehicle.make || '');
      setModel(vehicle.model || '');
      setColor(vehicle.color || '');
      setIsDefault(vehicle.isDefault);
    }).catch((err: any) => setErrorMsg(err.message || 'Unable to load vehicle details'));
  }, [vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPlate = plate.trim().toUpperCase();
    if (!cleanPlate) {
      setErrorMsg('Vehicle registration number is required');
      return;
    }

    // Validate standard Indian registration number
    const plateRegex = /^[A-Z]{2}[ -]?[0-9]{1,2}[ -]?[A-Z]{1,3}[ -]?[0-9]{4}$/i;
    if (!plateRegex.test(cleanPlate)) {
      setErrorMsg('Please enter a valid Indian registration plate (e.g. TN-09-CB-4821 or KA-01-AB-1234)');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });
      const payload = {
        plateNumber: cleanPlate,
        vehicleCategory: category,
        make: make.trim(),
        model: model.trim(),
        color: color.trim(),
        isDefault,
      };
      if (vehicleId) await client.vehicles.update(vehicleId, payload);
      else await client.vehicles.add(payload);

      onNavigate('/account/vehicles');
    } catch (err: any) {
      setErrorMsg(err.message || (vehicleId ? 'Failed to update vehicle' : 'Failed to add vehicle'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              P
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-tight block">ParkEazy</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Reserve &amp; Arrive</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/account/vehicles')}
            className="text-xs font-semibold text-slate-600 hover:text-teal-800"
          >
            ← Back to Vehicles
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">pe_uw_07_04</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {vehicleId ? 'Edit Vehicle' : 'Register New Vehicle'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Save your vehicle details for reuse during booking. Entry methods depend on the facility.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {/* Category Chips */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">Vehicle Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'car', name: 'Car / Hatchback', icon: '🚗' },
                { id: 'suv', name: 'Compact SUV', icon: '🚙' },
                { id: 'bike', name: 'Two Wheeler', icon: '🏍️' },
                { id: 'auto', name: 'Commercial Auto', icon: '🛺' },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCategory(c.id as VehicleType)}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                    category === c.id
                      ? 'border-teal-700 bg-teal-50 text-teal-900 font-bold shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Registration Plate */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Registration Plate Number (RTO)</label>
            <input
              type="text"
              required
              placeholder="e.g. TN-09-CB-4821 or MH-02-EE-8899"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 text-base font-mono uppercase font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Format: 2-letter state code + 2-digit district + series + 4-digit number.
            </span>
          </div>

          {/* Make & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Make / Manufacturer</label>
              <input
                type="text"
                placeholder="e.g. Hyundai, Honda, Tata"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Model Name</label>
              <input
                type="text"
                placeholder="e.g. Creta SX, City ZX"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Exterior Color</label>
            <input
              type="text"
              placeholder="e.g. Silver, White, Dark Grey"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          {/* Default Switch */}
          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-teal-700 rounded focus:ring-teal-700"
            />
            <label htmlFor="isDefault" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Set as primary default vehicle for fast checkout
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('/account/vehicles')}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (vehicleId ? 'Saving...' : 'Registering...') : (vehicleId ? 'Save Vehicle Changes' : 'Save & Register Vehicle')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
