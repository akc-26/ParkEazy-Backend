import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Building,
  Car,
  DollarSign,
  ChevronRight,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser, HostOnboardingProfile } from '../../../packages/contracts';

interface HostOnboardingOverviewViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostOnboardingOverviewView: React.FC<HostOnboardingOverviewViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const [profile, setProfile] = useState<HostOnboardingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    setIsLoading(true);
    setErrorMessage(null);

    apiClient
      .getHostOnboarding(currentUser.id)
      .then((data) => {
        setProfile(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Unable to retrieve onboarding profile.');
        setIsLoading(false);
      });
  }, [currentUser]);

  const getStepStatus = (step: 'profile' | 'eligibility' | 'application') => {
    if (!profile) return 'PENDING';
    if (step === 'profile') {
      const isComplete =
        profile.phoneNumber &&
        profile.addressLine1 &&
        profile.city &&
        profile.state &&
        profile.emergencyContactName;
      return isComplete ? 'COMPLETED' : 'IN_PROGRESS';
    }
    if (step === 'eligibility') {
      const isComplete =
        profile.propertyTypes &&
        profile.propertyTypes.length > 0 &&
        profile.acceptsHostAgreement;
      return isComplete ? 'COMPLETED' : profile.onboardingStep === 'PROFILE' ? 'PENDING' : 'IN_PROGRESS';
    }
    if (step === 'application') {
      return profile.applicationStatus === 'DRAFT'
        ? 'PENDING'
        : profile.applicationStatus === 'PENDING_REVIEW'
        ? 'IN_REVIEW'
        : profile.applicationStatus === 'VERIFIED'
        ? 'COMPLETED'
        : 'ACTION_REQUIRED';
    }
    return 'PENDING';
  };

  const profileStatus = getStepStatus('profile');
  const eligibilityStatus = getStepStatus('eligibility');
  const appStatus = getStepStatus('application');

  return (
    <div
      data-screen-id="pe_hw_01_05"
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
              Onboarding Subsystem
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-300 hidden sm:inline">
            Host: <strong className="text-white">{currentUser?.firstName} {currentUser?.lastName}</strong>
          </span>
          <button
            onClick={onLogout}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* Banner */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold tracking-wider uppercase mb-2">
              Screen pe_hw_01_05
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Host Partner Onboarding
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Complete your verification, host profile, and property eligibility before creating physical bay inventory.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Badge
              variant={
                profile?.applicationStatus === 'VERIFIED'
                  ? 'success'
                  : profile?.applicationStatus === 'PENDING_REVIEW'
                  ? 'info'
                  : 'neutral'
              }
            >
              Status: {profile?.applicationStatus || 'DRAFT'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              themeContext="host"
              onClick={() => onNavigate('/host/application-status')}
            >
              Application Details
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Onboarding Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            Loading onboarding progression...
          </div>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Host Profile */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    profileStatus === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      STEP 01
                    </span>
                    <Badge variant={profileStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                      {profileStatus === 'COMPLETED' ? 'Completed' : 'Requires Details'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Host Legal Identity &amp; Contact Details
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                    Operating model ({profile?.businessType || 'INDIVIDUAL'}), legal business name, verified phone number, physical mailing address, and emergency contact details.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button
                  variant={profileStatus === 'COMPLETED' ? 'outline' : 'primary'}
                  themeContext="host"
                  size="sm"
                  onClick={() => onNavigate('/host/onboarding/profile')}
                  className="font-semibold"
                >
                  {profileStatus === 'COMPLETED' ? 'Edit Details' : 'Complete Profile'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Step 2: Property Eligibility */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    eligibilityStatus === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      STEP 02
                    </span>
                    <Badge variant={eligibilityStatus === 'COMPLETED' ? 'success' : 'neutral'}>
                      {eligibilityStatus === 'COMPLETED' ? 'Eligibility Satisfied' : 'Pending'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Property Eligibility &amp; Host Declaration
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                    Property title/lease status ({profile?.ownershipType || 'OWNED'}), managed bay categories, liability coverage confirmation, and acceptance of host operating guidelines.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button
                  variant={eligibilityStatus === 'COMPLETED' ? 'outline' : 'primary'}
                  themeContext="host"
                  size="sm"
                  onClick={() => onNavigate('/host/onboarding/eligibility')}
                  className="font-semibold"
                >
                  {eligibilityStatus === 'COMPLETED' ? 'Review Eligibility' : 'Complete Eligibility'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Step 3: Application Review & Submission */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300">
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    profile?.applicationStatus === 'VERIFIED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : profile?.applicationStatus === 'PENDING_REVIEW'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400">
                      STEP 03
                    </span>
                    <Badge
                      variant={
                        profile?.applicationStatus === 'VERIFIED'
                          ? 'success'
                          : profile?.applicationStatus === 'PENDING_REVIEW'
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {profile?.applicationStatus || 'DRAFT'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Operational Review &amp; Facility Authorization
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
                    Review your application package, track operations audit progress, and unlock access to the Phase 2 facility creation wizard.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <Button
                  variant="primary"
                  themeContext="host"
                  size="sm"
                  onClick={() => onNavigate('/host/application-status')}
                  className="font-semibold"
                >
                  Check Application Status
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2 Boundary Clarification Notice */}
        <div className="mt-8 p-4 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600">
          <strong className="text-slate-900 block mb-1">
            Phase 1 Foundation Boundary Notice
          </strong>
          Physical facility creation, individual bay layout design, pricing rate curves, and live booking acceptance are strictly gated behind completion of this Host Account and Onboarding foundation.
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        ParkEazy Marketplace Platform &bull; Host Security &amp; Identity Subsystem
      </footer>
    </div>
  );
};
