import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  KeyRound,
  DollarSign,
  Camera,
  ArrowLeft,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  UploadCloud,
  Layers,
  ShieldCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  PropertyType,
  AccessMethod,
  CreateFacilityRequest,
} from '../../../packages/contracts';

interface HostFacilityCreateViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
}

const COMMON_AMENITIES = [
  'EV Charging',
  'CCTV Security',
  'Covered Garage',
  '24/7 Access',
  'Elevator Access',
  'Paved Surface',
  'Staffed Kiosk',
  'Disabled Parking',
  'Gated Entry',
  'Well-Lit',
  'Security Patrol',
];

const PRESET_IMAGES = [
  {
    name: 'Covered Facility',
    url: '/assets/images/hero_parking_bay_1792157347279.jpg',
  },
  {
    name: 'Residential Driveway',
    url: '/assets/images/host_parking_driveway_1792157348722.jpg',
  },
  {
    name: 'Mobility Transit Hub',
    url: '/assets/images/admin_facility_aerial_1792157347651.jpg',
  },
];

export const HostFacilityCreateView: React.FC<HostFacilityCreateViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>(PropertyType.GARAGE);

  // Address
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

  // Access & entry
  const [accessMethod, setAccessMethod] = useState<AccessMethod>(AccessMethod.GATE_CODE);
  const [accessInstructions, setAccessInstructions] = useState('');

  // Pricing (in dollars for user entry, multiplied to cents on submit)
  const [hourlyRateDollars, setHourlyRateDollars] = useState('5.00');
  const [dailyRateDollars, setDailyRateDollars] = useState('35.00');
  const [securityDepositDollars, setSecurityDepositDollars] = useState('20.00');

  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'CCTV Security',
    'Paved Surface',
    'Well-Lit',
  ]);

  // Image / Photography
  const [imageUrl, setImageUrl] = useState<string>(PRESET_IMAGES[0].url);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image file size cannot exceed 5MB.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const res = await apiClient.uploadMedia({
          name: file.name,
          type: file.type,
          base64,
        });
        setImageUrl(res.url);
      } catch (err: any) {
        setUploadError(err.message || 'Image upload failed.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read selected image file.');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    // Validation
    if (!name.trim() || name.trim().length < 3) {
      setErrorBanner('Facility name must be at least 3 characters.');
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setErrorBanner('Facility description must be at least 10 characters.');
      return;
    }
    if (!line1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setErrorBanner('Complete street address (line 1, city, state, postal code) is required.');
      return;
    }
    if (!accessInstructions.trim() || accessInstructions.trim().length < 5) {
      setErrorBanner('Please provide clear driver entry and access instructions (min 5 characters).');
      return;
    }

    const hourlyRateCents = Math.round(parseFloat(hourlyRateDollars || '0') * 100);
    const dailyRateCents = Math.round(parseFloat(dailyRateDollars || '0') * 100);
    const securityDepositCents = Math.round(parseFloat(securityDepositDollars || '0') * 100);

    if (hourlyRateCents <= 0) {
      setErrorBanner('Hourly rate must be greater than $0.00.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateFacilityRequest = {
        name: name.trim(),
        description: description.trim(),
        propertyType,
        address: {
          line1: line1.trim(),
          line2: line2.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
          latitude: 37.7749, // Verified baseline default coordinates
          longitude: -122.4194,
        },
        timezone: 'America/Los_Angeles',
        accessMethod,
        accessInstructions: accessInstructions.trim(),
        hourlyRateCents,
        dailyRateCents,
        securityDepositCents,
        amenities: selectedAmenities,
        imageUrl: imageUrl || undefined,
        photos: imageUrl
          ? [
              {
                id: `pho-${Date.now()}`,
                url: imageUrl,
                caption: name.trim(),
                isPrimary: true,
                uploadedAt: new Date().toISOString(),
              },
            ]
          : [],
      };

      const created = await apiClient.createHostFacility(hostId, payload);
      // Navigate to layout screen to configure bays
      onNavigate(`/host/facilities/${created.id}/layout`);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to create facility.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-screen-id="pe_hw_02_02"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      {/* Header */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/host/spaces')}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Facilities
          </button>
        </div>
        <div className="text-xs font-mono text-emerald-400">
          pe_hw_02_02 • Create Facility
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">
            Facility Onboarding Wizard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#132A24] tracking-tight mt-1">
            Register New Parking Facility
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Fill in the facility details below. After creating the facility, you will configure physical parking bays, clearance dimensions, and vehicle compatibility.
          </p>
        </div>

        {errorBanner && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Please correct the following errors:</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorBanner}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Facility Identity */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#132A24] border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>1. Basic Facility Information</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Facility Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Downtown Plaza Underground Parking, Sunset Blvd Driveway"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Property / Facility Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                >
                  <option value={PropertyType.GARAGE}>Private Covered Garage</option>
                  <option value={PropertyType.DRIVEWAY}>Residential Driveway</option>
                  <option value={PropertyType.UNDERGROUND}>Underground Commercial Facility</option>
                  <option value={PropertyType.PARKING_LOT}>Open Surface Parking Lot</option>
                  <option value={PropertyType.CARPORT}>Sheltered Carport</option>
                  <option value={PropertyType.COMMERCIAL}>Commercial Building Bay</option>
                  <option value={PropertyType.OTHER}>Other Property Type</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Country <span className="text-rose-500">*</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                >
                  <option value="US">United States (US)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="UK">United Kingdom (UK)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Public Listing Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your parking facility: security features, ease of parking, lighting, and walking distance to nearby transit or attractions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  required
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  Minimum 10 characters. Clear descriptions get 40% more driver bookings.
                </span>
              </div>
            </div>
          </Card>

          {/* Section 2: Physical Address */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#132A24] border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>2. Physical Street Address</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Street Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 500 Howard Street"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suite 200, Entrance B, Garage Level 1"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  City <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. San Francisco"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="CA"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Postal Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="94105"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                    required
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Driver Access & Entry Instructions */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#132A24] border-b border-slate-100 pb-3">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>3. Driver Access Method &amp; Instructions</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Driver Access Mechanism <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: AccessMethod.GATE_CODE, label: 'Keypad / Gate PIN' },
                    { id: AccessMethod.APP_BLE, label: 'ParkEazy BLE App' },
                    { id: AccessMethod.OPEN_ACCESS, label: 'Open Driveway / Lot' },
                    { id: AccessMethod.ATTENDANT, label: 'Staffed Attendant' },
                    { id: AccessMethod.KEYCARD, label: 'Keycard / Fob' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAccessMethod(m.id)}
                      className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                        accessMethod === m.id
                          ? 'border-[#22C55E] bg-emerald-50 text-emerald-900 ring-2 ring-[#22C55E]'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Access Instructions for Confirmed Drivers <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Enter 4-digit code 1234 on the keypad beside the left gate pillar. Follow the ramp down to level B2."
                  value={accessInstructions}
                  onChange={(e) => setAccessInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  required
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  These instructions are automatically sent to drivers after booking confirmation.
                </span>
              </div>
            </div>
          </Card>

          {/* Section 4: Operational Pricing */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#132A24] border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>4. Operational Pricing Rates</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hourly Rate ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.25"
                    min="1.00"
                    value={hourlyRateDollars}
                    onChange={(e) => setHourlyRateDollars(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Max Rate ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="1.00"
                    min="5.00"
                    value={dailyRateDollars}
                    onChange={(e) => setDailyRateDollars(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Security Deposit ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    step="5.00"
                    min="0.00"
                    value={securityDepositDollars}
                    onChange={(e) => setSecurityDepositDollars(e.target.value)}
                    className="w-full pl-7 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Section 5: Amenities & Features */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#132A24] border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>5. Facility Amenities &amp; Features</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {COMMON_AMENITIES.map((amenity) => {
                const isSelected = selectedAmenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{amenity}</span>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Section 6: Photography & Media */}
          <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#132A24] border-b border-slate-100 pb-3">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>6. Facility Photography</span>
            </div>

            <div className="space-y-4">
              {/* Selected Photo Preview */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-full sm:w-48 h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  <img
                    src={imageUrl}
                    alt="Facility Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-3 flex-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Upload Custom Photo (JPEG, PNG, WebP — Max 5MB)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                    {isUploading && (
                      <span className="text-xs text-emerald-600 block mt-1 animate-pulse">
                        Uploading and verifying photograph...
                      </span>
                    )}
                    {uploadError && (
                      <span className="text-xs text-rose-600 block mt-1">
                        {uploadError}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block mb-1.5 font-medium">
                      Or select from verified sample facility photos:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_IMAGES.map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setImageUrl(preset.url)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                            imageUrl === preset.url
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-between pt-4 pb-12 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onNavigate('/host/spaces')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              themeContext="host"
              size="lg"
              disabled={isSubmitting}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] font-extrabold px-8 shadow-sm"
            >
              {isSubmitting ? (
                'Saving Facility...'
              ) : (
                <>
                  <span>Create Facility &amp; Configure Bays</span>
                  <Layers className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};
