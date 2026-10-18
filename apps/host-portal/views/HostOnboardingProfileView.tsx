import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Building2,
  Phone,
  MapPin,
  Shield,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Home,
  Save,
} from 'lucide-react';
import { Button, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  HostOnboardingProfile,
  HostBusinessType,
} from '../../../packages/contracts';

interface HostOnboardingProfileViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
}

export const HostOnboardingProfileView: React.FC<HostOnboardingProfileViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [businessType, setBusinessType] = useState<HostBusinessType>('INDIVIDUAL');
  const [businessName, setBusinessName] = useState('');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing profile
  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);

    apiClient
      .getHostOnboarding(currentUser.id)
      .then((data) => {
        setBusinessType(data.businessType || 'INDIVIDUAL');
        setBusinessName(data.businessName || '');
        setBusinessRegistrationNumber(data.businessRegistrationNumber || '');
        setTaxId(data.taxId || '');
        setPhoneNumber(data.phoneNumber || currentUser.phoneNumber || '');
        setAddressLine1(data.addressLine1 || '');
        setAddressLine2(data.addressLine2 || '');
        setCity(data.city || '');
        setState(data.state || '');
        setPostalCode(data.postalCode || '');
        setCountry(data.country || 'US');
        setEmergencyContactName(data.emergencyContactName || '');
        setEmergencyContactPhone(data.emergencyContactPhone || '');
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Unable to load host onboarding profile.');
        setIsLoading(false);
      });
  }, [currentUser]);

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required.';
    } else if (phoneNumber.trim().length < 7) {
      newErrors.phoneNumber = 'Please enter a valid phone number.';
    }

    if (!addressLine1.trim()) {
      newErrors.addressLine1 = 'Physical address line 1 is required.';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required.';
    }

    if (!state.trim()) {
      newErrors.state = 'State / Province is required.';
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = 'Postal / ZIP code is required.';
    }

    if (!emergencyContactName.trim()) {
      newErrors.emergencyContactName = 'Emergency contact name is required.';
    }

    if (!emergencyContactPhone.trim()) {
      newErrors.emergencyContactPhone = 'Emergency contact phone number is required.';
    }

    if (businessType !== 'INDIVIDUAL' && !businessName.trim()) {
      newErrors.businessName = 'Business name is required for commercial accounts.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (proceedToNext = false) => {
    if (!currentUser) return;
    setErrorMessage(null);
    setStatusMessage(null);

    if (proceedToNext && !validateFields()) {
      setErrorMessage('Please correct the validation errors before proceeding.');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.updateHostOnboarding(currentUser.id, {
        businessType,
        businessName: businessName.trim() || undefined,
        businessRegistrationNumber: businessRegistrationNumber.trim() || undefined,
        taxId: taxId.trim() || undefined,
        phoneNumber: phoneNumber.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        country: country.trim(),
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone: emergencyContactPhone.trim(),
        onboardingStep: proceedToNext ? 'ELIGIBILITY' : 'PROFILE',
      });

      setStatusMessage('Host profile details saved successfully to durable persistence.');

      if (proceedToNext) {
        setTimeout(() => {
          onNavigate('/host/onboarding/eligibility');
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save onboarding profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      data-screen-id="pe_hw_01_06"
      className="min-h-screen bg-[#F0F4F3] text-[#12211C] flex flex-col justify-between font-sans"
    >
      {/* Top Navbar */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center shrink-0">
            H
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              Host Studio
            </span>
            <span className="text-[10px] text-emerald-400 block -mt-0.5">
              Step 1 &bull; Profile &amp; Contact Details
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigate('/host/onboarding')}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Onboarding Overview
        </button>
      </header>

      {/* Main Content Form */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold tracking-wider uppercase mb-1">
                Screen pe_hw_01_06
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Host Profile &amp; Contact Details
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide accurate business, identity, and emergency contact details for host verification.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Step 1 of 3
            </span>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Profile Error</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Profile Updated</p>
                <p className="mt-0.5">{statusMessage}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              Retrieving profile information...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Operating Model */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Operating Model
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'INDIVIDUAL', title: 'Individual Host', sub: 'Driveway / Residential' },
                    { id: 'BUSINESS', title: 'Commercial Business', sub: 'Registered Parking Entity' },
                    { id: 'PROPERTY_MANAGER', title: 'Property Manager', sub: 'Multi-Tenant / HOAs' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBusinessType(m.id as HostBusinessType)}
                      className={`p-3.5 text-left rounded-xl border text-xs transition-all ${
                        businessType === m.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block font-medium">{m.title}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{m.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Commercial Fields */}
              {businessType !== 'INDIVIDUAL' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="sm:col-span-1">
                    <Input
                      label="Business Name"
                      id="prof-biz-name"
                      placeholder="SF Parking Group LLC"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      error={errors.businessName}
                    />
                  </div>
                  <div>
                    <Input
                      label="Registration #"
                      id="prof-biz-reg"
                      placeholder="REG-2026-991"
                      value={businessRegistrationNumber}
                      onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      label="Tax ID / EIN"
                      id="prof-biz-tax"
                      placeholder="XX-XXXXXXX"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Primary Host Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Host Contact Phone Number"
                    id="prof-phone"
                    placeholder="+1 (555) 0144"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    error={errors.phoneNumber}
                    helperText="Direct line for operations dispatch and incident resolution."
                  />
                  <div className="w-full">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Verified Account Email
                    </label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      className="w-full px-3.5 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg text-slate-600 cursor-not-allowed"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Immutable authentication identifier.
                    </p>
                  </div>
                </div>
              </div>

              {/* Physical Mailing / Headquarters Address */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Host Physical Address
                </h3>
                <div className="space-y-3">
                  <Input
                    label="Street Address Line 1"
                    id="prof-addr1"
                    placeholder="742 Montgomery St"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    error={errors.addressLine1}
                  />
                  <Input
                    label="Address Line 2 (Suite / Unit)"
                    id="prof-addr2"
                    placeholder="Suite 400 (Optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      label="City"
                      id="prof-city"
                      placeholder="San Francisco"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      error={errors.city}
                    />
                    <Input
                      label="State / Province"
                      id="prof-state"
                      placeholder="CA"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      error={errors.state}
                    />
                    <Input
                      label="Postal / ZIP"
                      id="prof-zip"
                      placeholder="94111"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      error={errors.postalCode}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  24/7 Facility Emergency Contact
                </h3>
                <p className="text-[11px] text-slate-500 mb-3">
                  Contact reachable during live driver bookings if gate or access hardware malfunctions occur.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Emergency Contact Name"
                    id="prof-emer-name"
                    placeholder="Sarah Chen"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    error={errors.emergencyContactName}
                  />
                  <Input
                    label="Emergency Phone"
                    id="prof-emer-phone"
                    placeholder="+1 (555) 0198"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    error={errors.emergencyContactPhone}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSave(false)}
                  isLoading={isSaving}
                  className="w-full sm:w-auto text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Draft
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="primary"
                    themeContext="host"
                    onClick={() => handleSave(true)}
                    isLoading={isSaving}
                    className="w-full sm:w-auto font-semibold"
                  >
                    Save &amp; Continue to Eligibility
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        ParkEazy Marketplace Platform &bull; Host Security &amp; Identity Subsystem
      </footer>
    </div>
  );
};
