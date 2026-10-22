import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, UserVehicle, ParkingSpace } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId?: string;
  spaceId?: string;
  startsAt?: string;
  endsAt?: string;
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function BookingDetailsVehiclePage({
  facilityId = '10000000-0000-4000-b000-000000000104',
  spaceId = '10000000-0000-4000-b000-000000000104-01',
  startsAt = new Date(Date.now() + 3600000).toISOString(),
  endsAt = new Date(Date.now() + 3 * 3600000).toISOString(),
  currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [space, setSpace] = useState<ParkingSpace | null>(null);
  const [savedVehicles, setSavedVehicles] = useState<UserVehicle[]>([]);
  const [vehiclePlate, setVehiclePlate] = useState('TN-09-CB-4821');
  const [vehicleCategory, setVehicleCategory] = useState<'car' | 'bike' | 'auto' | 'suv'>('car');
  const [driverName, setDriverName] = useState(currentUser?.fullName || 'Arun Kumar');
  const [driverPhone, setDriverPhone] = useState(currentUser?.phone || '+91 98765 00003');
  const [driverEmail, setDriverEmail] = useState(currentUser?.email || 'driver.arun@parkeazy.com');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadInitial() {
      try {
        const sp = await client.spaces.get(spaceId);
        setSpace(sp);
      } catch {
        // default fallback
      }
      try {
        const vList = await client.vehicles.list();
        setSavedVehicles(vList);
      } catch {
        // default fallback
      }
    }
    loadInitial();
  }, [spaceId]);

  const toggleAddon = (addon: string) => {
    if (selectedAddons.includes(addon)) {
      setSelectedAddons(selectedAddons.filter((a) => a !== addon));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleContinue = () => {
    const cleanedPlate = vehiclePlate.trim().toUpperCase().replace(/[\s-]/g, '');
    if (cleanedPlate.length < 6) {
      setErrorMsg('Please enter a valid registration plate number (e.g. TN09CB4821).');
      return;
    }
    setErrorMsg(null);

    onNavigate(
      `/book/review?facilityId=${facilityId}&spaceId=${spaceId}&startsAt=${encodeURIComponent(
        startsAt
      )}&endsAt=${encodeURIComponent(endsAt)}&plate=${encodeURIComponent(
        vehiclePlate
      )}&category=${vehicleCategory}&driverName=${encodeURIComponent(driverName)}&driverPhone=${encodeURIComponent(
        driverPhone
      )}`
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() =>
              onNavigate(
                `/book/spaces?facilityId=${facilityId}&spaceId=${spaceId}&startsAt=${encodeURIComponent(
                  startsAt
                )}&endsAt=${encodeURIComponent(endsAt)}`
              )
            }
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to Space Selection
          </button>
          <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_04_04
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Reserve {space?.bayIdentifier || 'Bay A-04'}
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Provide the vehicle details for automatic barrier optical recognition and driver contact.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
          {/* Saved Vehicle Quick Select */}
          {savedVehicles.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Quick Select Saved Vehicle
              </label>
              <div className="flex flex-wrap gap-2">
                {savedVehicles.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVehiclePlate(v.plateNumber);
                      setVehicleCategory(v.vehicleCategory as any);
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      vehiclePlate === v.plateNumber
                        ? 'border-[#0F766E] bg-[#E6F7F4] text-[#0F766E]'
                        : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    🚗 {v.plateNumber} ({v.make || 'Vehicle'})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Category Chips */}
          <div>
            <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
              Vehicle Classification
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'car', label: 'Car / Sedan', icon: '🚗' },
                { id: 'suv', label: 'SUV / Compact', icon: '🚙' },
                { id: 'bike', label: 'Motorcycle', icon: '🏍️' },
                { id: 'auto', label: 'Auto / 3-Wheeler', icon: '🛺' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setVehicleCategory(c.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    vehicleCategory === c.id
                      ? 'border-[#0F766E] bg-[#E6F7F4] text-[#0F766E] font-bold shadow-xs ring-1 ring-[#0F766E]'
                      : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F8FAFC] font-semibold'
                  }`}
                >
                  <div className="text-xl mb-1">{c.icon}</div>
                  <div className="text-xs">{c.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* License Plate Number */}
          <div>
            <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
              Vehicle Registration Number (License Plate)
            </label>
            <input
              type="text"
              value={vehiclePlate}
              placeholder="e.g. TN-09-CB-4821"
              onChange={(e) => {
                setVehiclePlate(e.target.value.toUpperCase());
                setErrorMsg(null);
              }}
              className="w-full text-base font-mono font-bold tracking-wider px-4 py-3 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
            />
            <p className="text-[11px] text-[#667085] mt-1.5">
              Automated ANPR (Automatic Number Plate Recognition) gates verify this number upon arrival.
            </p>
          </div>

          {/* Driver Contact Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Driver Full Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Mobile Number (SMS/WhatsApp Pass)
              </label>
              <input
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Email (GST Tax Receipt)
              </label>
              <input
                type="email"
                value={driverEmail}
                onChange={(e) => setDriverEmail(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
              />
            </div>
          </div>

          {/* Optional Directives & Addons */}
          <div>
            <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
              Special Bay Requests &amp; Assistance
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                '+ Near elevator',
                '+ EV Charger assistance',
                '+ Extra clearance check',
              ].map((addon) => {
                const isSelected = selectedAddons.includes(addon);
                return (
                  <button
                    key={addon}
                    onClick={() => toggleAddon(addon)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F766E] bg-[#E6F7F4] text-[#0F766E] font-bold'
                        : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {addon}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            onClick={handleContinue}
            className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Review Booking &amp; Price</span>
            <span>→</span>
          </button>
        </div>
      </main>
    </div>
  );
}
