import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building,
  Car,
  FileCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Home,
  Save,
  Check,
} from 'lucide-react';
import { Button, Input, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  HostOnboardingProfile,
  HostOwnershipType,
} from '../../../packages/contracts';

interface HostOnboardingEligibilityViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
}

export const HostOnboardingEligibilityView: React.FC<HostOnboardingEligibilityViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [ownershipType, setOwnershipType] = useState<HostOwnershipType>('OWNED');
  const [propertyTypes, setPropertyTypes] = useState<string[]>(['DRIVEWAY']);
  const [hasLiabilityInsurance, setHasLiabilityInsurance] = useState(false);
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [acceptsHostAgreement, setAcceptsHostAgreement] = useState(false);
  const [affirmNoSubleasingViolations, setAffirmNoSubleasingViolations] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);

    apiClient
      .getHostOnboarding(currentUser.id)
      .then((data) => {
        setOwnershipType(data.ownershipType || 'OWNED');
        if (data.propertyTypes && data.propertyTypes.length > 0) {
          setPropertyTypes(data.propertyTypes);
        }
        setHasLiabilityInsurance(Boolean(data.hasLiabilityInsurance));
        setInsurancePolicyNumber(data.insurancePolicyNumber || '');
        setInsuranceExpiryDate(data.insuranceExpiryDate || '');
        setAcceptsHostAgreement(Boolean(data.acceptsHostAgreement));
        setAffirmNoSubleasingViolations(true);
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Unable to retrieve eligibility records.');
        setIsLoading(false);
      });
  }, [currentUser]);

  const togglePropertyType = (typeId: string) => {
    if (propertyTypes.includes(typeId)) {
      if (propertyTypes.length > 1) {
        setPropertyTypes(propertyTypes.filter((t) => t !== typeId));
      }
    } else {
      setPropertyTypes([...propertyTypes, typeId]);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (propertyTypes.length === 0) {
      newErrors.propertyTypes = 'Select at least one property type you intend to list.';
    }

    if (hasLiabilityInsurance && !insurancePolicyNumber.trim()) {
      newErrors.insurancePolicyNumber = 'Policy number is required when liability insurance is active.';
    }

    if (!acceptsHostAgreement) {
      newErrors.acceptsHostAgreement = 'You must affirm the ParkEazy Host Operating Agreement.';
    }

    if (!affirmNoSubleasingViolations) {
      newErrors.affirmNoSubleasingViolations = 'You must affirm compliance with local zoning and lease restrictions.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (submitApplication = false) => {
    if (!currentUser) return;
    setErrorMessage(null);
    setStatusMessage(null);

    if (submitApplication && !validate()) {
      setErrorMessage('Please satisfy all required eligibility affirmations before submission.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.updateHostOnboarding(currentUser.id, {
        ownershipType,
        propertyTypes,
        hasLiabilityInsurance,
        insurancePolicyNumber: insurancePolicyNumber.trim() || undefined,
        insuranceExpiryDate: insuranceExpiryDate || undefined,
        acceptsHostAgreement,
        onboardingStep: submitApplication ? 'SUBMITTED' : 'ELIGIBILITY',
      });

      if (submitApplication) {
        const submitted = await apiClient.submitHostOnboarding(currentUser.id);
        setStatusMessage('Application submitted successfully for operational verification review!');
        setTimeout(() => {
          onNavigate('/host/application-status');
        }, 1000);
      } else {
        setStatusMessage('Eligibility settings saved to durable persistence.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update eligibility details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-screen-id="pe_hw_01_07"
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
              Step 2 &bull; Property Eligibility &amp; Guidelines
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

      {/* Main Content Card */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold tracking-wider uppercase mb-1">
                Screen pe_hw_01_07
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Property Eligibility &amp; Host Declaration
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify title authority, managed bay types, and insurance declarations before opening parking inventory.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              Step 2 of 3
            </span>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Eligibility Notice</p>
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
                <p className="font-semibold">Status Update</p>
                <p className="mt-0.5">{statusMessage}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              Retrieving eligibility record...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Ownership Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Premises Authorization &amp; Ownership Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'OWNED', title: 'Property Owner', desc: 'Direct deed / title holder' },
                    { id: 'LEASED', title: 'Leaseholder / Tenant', desc: 'Permitted subleasing rights' },
                    { id: 'AUTHORIZED_REPRESENTATIVE', title: 'Authorized Agent', desc: 'HOA / Property manager' },
                  ].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setOwnershipType(o.id as HostOwnershipType)}
                      className={`p-3.5 text-left rounded-xl border text-xs transition-all ${
                        ownershipType === o.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block font-medium">{o.title}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">{o.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Types Managed */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Eligible Parking Facilities Intended for Listing
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'DRIVEWAY', label: 'Residential Driveway' },
                    { id: 'COVERED_GARAGE', label: 'Covered Garage' },
                    { id: 'SURFACE_LOT', label: 'Paved Surface Lot' },
                    { id: 'UNDERGROUND', label: 'Underground / Secured' },
                    { id: 'EV_CHARGING_HUB', label: 'Dedicated EV Hub' },
                    { id: 'COMMERCIAL_FACILITY', label: 'Commercial Deck' },
                  ].map((type) => {
                    const isSelected = propertyTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => togglePropertyType(type.id)}
                        className={`p-3 text-left rounded-xl border text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-semibold'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span>{type.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
                {errors.propertyTypes && (
                  <p className="mt-1 text-xs text-red-600">{errors.propertyTypes}</p>
                )}
              </div>

              {/* Liability Insurance Declaration */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Premises Liability Insurance Protection
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Does your property carry active general liability or homeowner/commercial premises insurance?
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={hasLiabilityInsurance}
                      onChange={(e) => setHasLiabilityInsurance(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {hasLiabilityInsurance && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <Input
                      label="Insurance Policy Number"
                      id="elig-policy-num"
                      placeholder="POL-STATE-99412"
                      value={insurancePolicyNumber}
                      onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                      error={errors.insurancePolicyNumber}
                    />
                    <Input
                      label="Policy Expiration Date"
                      id="elig-policy-exp"
                      type="date"
                      value={insuranceExpiryDate}
                      onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Host Declarations */}
              <div className="space-y-2.5 pt-2">
                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={affirmNoSubleasingViolations}
                    onChange={(e) => setAffirmNoSubleasingViolations(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>
                    I affirm that listing these physical parking bays does not violate local zoning regulations, building lease restrictions, or homeowner association bylaws.
                  </span>
                </label>
                {errors.affirmNoSubleasingViolations && (
                  <p className="text-xs text-red-600 pl-6">{errors.affirmNoSubleasingViolations}</p>
                )}

                <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptsHostAgreement}
                    onChange={(e) => setAcceptsHostAgreement(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span>
                    I agree to adhere to the{' '}
                    <strong className="text-slate-900">
                      ParkEazy Host Operating Standards
                    </strong>
                    , including respecting customer booking transition buffers, honoring confirmed reservations, and maintaining clean physical clearances.
                  </span>
                </label>
                {errors.acceptsHostAgreement && (
                  <p className="text-xs text-red-600 pl-6">{errors.acceptsHostAgreement}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSave(false)}
                  isLoading={isSubmitting}
                  className="w-full sm:w-auto text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Draft
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onNavigate('/host/onboarding/profile')}
                    className="w-full sm:w-auto text-xs font-semibold"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Back to Profile
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    themeContext="host"
                    onClick={() => handleSave(true)}
                    isLoading={isSubmitting}
                    className="w-full sm:w-auto font-semibold"
                  >
                    Submit Host Application
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
