import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, FacilityOperatingModel } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function AddParkingFacilityWizardPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();

  // Form state
  const [operatingModel, setOperatingModel] = useState<FacilityOperatingModel>('commercial_garage');
  const [name, setName] = useState('');
  const [facilityCode, setFacilityCode] = useState('');
  const [propertyOwner, setPropertyOwner] = useState('');
  const [metroRegion, setMetroRegion] = useState('Chennai Metro');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Chennai');
  const [postalCode, setPostalCode] = useState('600102');
  const [latitude, setLatitude] = useState('13.0850');
  const [longitude, setLongitude] = useState('80.2101');
  const [isCovered, setIsCovered] = useState(true);
  const [is24x7, setIs24x7] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([
    'CCTV Surveillance',
    'Guarded Boom Barrier',
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient();

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleSave = async (continueToNext: boolean) => {
    setError(null);
    if (!name.trim() || name.trim().length < 3) {
      setError('Facility display name must be at least 3 characters long');
      return;
    }
    if (!addressLine1.trim() || addressLine1.trim().length < 5) {
      setError('Street address must be at least 5 characters long');
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(postalCode.trim())) {
      setError('Postal code must be a valid 6-digit Indian PIN code');
      return;
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Please provide valid latitude (-90 to 90) and longitude (-180 to 180)');
      return;
    }

    setLoading(true);
    try {
      const facility = await apiClient.facilities.create({
        name: name.trim(),
        facilityCode: facilityCode.trim() || undefined,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        postalCode: postalCode.trim(),
        latitude: lat,
        longitude: lng,
        operatingModel,
        propertyOwner: propertyOwner.trim() || undefined,
        landmark: addressLine2.trim() || undefined,
        isCovered,
        is24x7,
        amenities,
      });

      if (continueToNext) {
        onNavigate(`/host/facilities/${facility.id}/gate`);
      } else {
        onNavigate('/host/spaces');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create facility. Please check input values.');
    } finally {
      setLoading(false);
    }
  };

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
              <span>Back to Facilities</span>
            </button>
            <div className="h-4 w-px bg-[#E2E8F0]"></div>
            <span className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#141B2C]">
              Register New Parking Facility
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#64748B] bg-[#E2E8F0] px-2 py-0.5 rounded">
              PE-HW-02-02
            </span>
            <button
              onClick={() => handleSave(false)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#141B2C] hover:bg-[#F1F5F9] transition cursor-pointer"
            >
              Save Draft & Exit
            </button>
          </div>
        </div>
      </header>

      {/* WIZARD PROGRESS BAR */}
      <div className="bg-white border-b border-[#E2E8F0] py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#0F766E] font-bold">
            <span className="w-5 h-5 rounded-full bg-[#0F766E] text-white flex items-center justify-center text-[10px]">1</span>
            <span>Facility Info</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-4"></div>
          <div className="flex items-center gap-2 text-[#64748B]">
            <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-[10px]">2</span>
            <span>Entrance & Gate</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-4"></div>
          <div className="flex items-center gap-2 text-[#64748B]">
            <span className="w-5 h-5 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-[10px]">3</span>
            <span>Bay Layout</span>
          </div>
          <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-4"></div>
          <div className="flex items-center gap-2 text-[#64748B]">
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

        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-8">
          {/* SECTION 1: OPERATIONAL MODEL */}
          <div>
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              1. Facility Operational Model
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Select the operational archetype that describes your physical parking asset.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label
                onClick={() => setOperatingModel('commercial_garage')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  operatingModel === 'commercial_garage'
                    ? 'border-[#0F766E] bg-[#ECFDF5]/30'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-[#E0E8FF] text-[#0F766E] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
                  </div>
                  <strong className="text-xs font-bold text-[#141B2C] block">Commercial Garage</strong>
                  <span className="text-[11px] text-[#64748B] mt-0.5 block">
                    Multi-level complex, mall, or gated commercial facility with boom barrier.
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#0F766E]">
                  {operatingModel === 'commercial_garage' && '✓ Selected'}
                </div>
              </label>

              <label
                onClick={() => setOperatingModel('residential_driveway')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  operatingModel === 'residential_driveway'
                    ? 'border-[#0F766E] bg-[#ECFDF5]/30'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">home_work</span>
                  </div>
                  <strong className="text-xs font-bold text-[#141B2C] block">Residential Driveway</strong>
                  <span className="text-[11px] text-[#64748B] mt-0.5 block">
                    Private villa driveway or apartment building accommodating 1–4 bays.
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#0F766E]">
                  {operatingModel === 'residential_driveway' && '✓ Selected'}
                </div>
              </label>

              <label
                onClick={() => setOperatingModel('open_ground')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  operatingModel === 'open_ground'
                    ? 'border-[#0F766E] bg-[#ECFDF5]/30'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#475569] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[18px]">stadium</span>
                  </div>
                  <strong className="text-xs font-bold text-[#141B2C] block">Open Ground / Field</strong>
                  <span className="text-[11px] text-[#64748B] mt-0.5 block">
                    Surface-level open plot, event overflow lot, or unpaved staging field.
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#0F766E]">
                  {operatingModel === 'open_ground' && '✓ Selected'}
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 2: BASIC FACILITY INFORMATION */}
          <div className="border-t border-[#E2E8F0] pt-6">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              2. Basic Facility Information
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Enter official naming and operating entity details.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Facility Public Display Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anna Nagar West Multi-Level Parking Hub"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  Visible to drivers and GPS navigation apps.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Internal Ref Code (Optional)
                </label>
                <input
                  type="text"
                  value={facilityCode}
                  onChange={(e) => setFacilityCode(e.target.value)}
                  placeholder="e.g. #FAC-0104"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Property Owner / Operating Entity *
                </label>
                <input
                  type="text"
                  value={propertyOwner}
                  onChange={(e) => setPropertyOwner(e.target.value)}
                  placeholder="e.g. ParkEazy Urban Assets Ltd."
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: LOCATION & REGION */}
          <div className="border-t border-[#E2E8F0] pt-6">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              3. Location & Metropolitan Region
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Geographic coordinates determine motorist search visibility and radius discovery.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Metropolitan Region *
                </label>
                <select
                  value={metroRegion}
                  onChange={(e) => setMetroRegion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                >
                  <option value="Chennai Metro">Chennai Metropolitan Region</option>
                  <option value="Bengaluru Metro">Bengaluru Urban Hub</option>
                  <option value="Hyderabad Metro">Hyderabad Core Region</option>
                  <option value="Mumbai MMR">Mumbai MMR Zone</option>
                  <option value="Delhi NCR">Delhi NCR Belt</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Street Address & Door No. *
                </label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. 142 2nd Avenue, Sector 5"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Landmark / Secondary Line
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Opposite Metro Pillar 142"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  Postal PIN Code (6-Digits) *
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  maxLength={6}
                  placeholder="600102"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  GPS Latitude *
                </label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="13.0850"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#141B2C] block mb-1">
                  GPS Longitude *
                </label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="80.2101"
                  className="w-full px-3 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs text-[#141B2C] focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                />
              </div>
            </div>

            {/* Quick Coordinate Presets */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-[#64748B]">
              <span>Quick Presets:</span>
              <button
                type="button"
                onClick={() => { setLatitude('13.0850'); setLongitude('80.2101'); setCity('Chennai'); setPostalCode('600102'); }}
                className="px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#141B2C] font-medium cursor-pointer"
              >
                Anna Nagar
              </button>
              <button
                type="button"
                onClick={() => { setLatitude('13.0418'); setLongitude('80.2341'); setCity('Chennai'); setPostalCode('600017'); }}
                className="px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#141B2C] font-medium cursor-pointer"
              >
                T Nagar
              </button>
              <button
                type="button"
                onClick={() => { setLatitude('12.9392'); setLongitude('80.2348'); setCity('Chennai'); setPostalCode('600097'); }}
                className="px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#141B2C] font-medium cursor-pointer"
              >
                OMR IT Corridor
              </button>
            </div>
          </div>

          {/* SECTION 4: GENERAL FACILITY ATTRIBUTES */}
          <div className="border-t border-[#E2E8F0] pt-6">
            <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-1">
              4. General Facility Attributes
            </h2>
            <p className="text-xs text-[#64748B] mb-4">
              Highlight key operational characteristics and safety provisions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCovered}
                  onChange={(e) => setIsCovered(e.target.checked)}
                  className="w-4 h-4 text-[#0F766E] rounded"
                />
                <div>
                  <strong className="text-xs text-[#141B2C] block">Covered / Underground Stalls</strong>
                  <span className="text-[11px] text-[#64748B]">Weather, rain, and sun protection for vehicles</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={is24x7}
                  onChange={(e) => setIs24x7(e.target.checked)}
                  className="w-4 h-4 text-[#0F766E] rounded"
                />
                <div>
                  <strong className="text-xs text-[#141B2C] block">24/7 Continuous Operation</strong>
                  <span className="text-[11px] text-[#64748B]">Facility never closes for entry or exit</span>
                </div>
              </label>
            </div>

            <label className="text-xs font-semibold text-[#141B2C] block mb-2">
              Facility Amenity Declarations
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'CCTV Surveillance',
                'Guarded Boom Barrier',
                'EV Fast Charging',
                'Disabled Accessible',
                'Valet Assist',
                'Well Lit At Night',
                'Restrooms Onsite',
              ].map((amenity) => {
                const active = amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition ${
                      active
                        ? 'bg-[#0F766E] text-white shadow-xs'
                        : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {amenity}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="border-t border-[#E2E8F0] pt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => onNavigate('/host/spaces')}
              className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:bg-[#F1F5F9] transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-xs font-semibold hover:bg-[#0F766E]/5 transition cursor-pointer"
              >
                Save as Draft & Exit
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>{loading ? 'Creating...' : 'Continue to Entrance & Gate →'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
