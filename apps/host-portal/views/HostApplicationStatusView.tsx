import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Home,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  HostOnboardingProfile,
  HostApplicationStatus,
} from '../../../packages/contracts';

interface HostApplicationStatusViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
}

export const HostApplicationStatusView: React.FC<HostApplicationStatusViewProps> = ({
  currentUser,
  onNavigate,
}) => {
  const [profile, setProfile] = useState<HostOnboardingProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = () => {
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
        setErrorMessage(err.message || 'Unable to retrieve host application status.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchStatus();
  }, [currentUser]);

  const getStatusBadge = (status?: HostApplicationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge variant="success">Application Verified</Badge>;
      case 'PENDING_REVIEW':
        return <Badge variant="info">Under Operational Review</Badge>;
      case 'ACTION_REQUIRED':
        return <Badge variant="warning">Action Required</Badge>;
      case 'SUSPENDED':
        return <Badge variant="danger">Account Suspended</Badge>;
      case 'DRAFT':
      default:
        return <Badge variant="neutral">Draft &bull; Incomplete</Badge>;
    }
  };

  return (
    <div
      data-screen-id="pe_hw_01_08"
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
              Host Application Lifecycle Status
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigate('/host/onboarding')}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Onboarding
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold tracking-wider uppercase mb-1">
                Screen pe_hw_01_08
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Host Application Status
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time review and operational authorization status from the ParkEazy trust subsystem.
              </p>
            </div>
            <div className="shrink-0">{getStatusBadge(profile?.applicationStatus)}</div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Status Retrieval Issue</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              Checking application state against live backend database...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Primary Status Card */}
              <div
                className={`p-5 rounded-2xl border ${
                  profile?.applicationStatus === 'VERIFIED'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : profile?.applicationStatus === 'PENDING_REVIEW'
                    ? 'bg-blue-50/70 border-blue-200'
                    : profile?.applicationStatus === 'ACTION_REQUIRED'
                    ? 'bg-amber-50/70 border-amber-200'
                    : profile?.applicationStatus === 'SUSPENDED'
                    ? 'bg-red-50/70 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {profile?.applicationStatus === 'VERIFIED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : profile?.applicationStatus === 'PENDING_REVIEW' ? (
                    <Clock className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                  ) : profile?.applicationStatus === 'ACTION_REQUIRED' ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  ) : profile?.applicationStatus === 'SUSPENDED' ? (
                    <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="w-6 h-6 text-slate-500 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1">
                    <h3 className="text-base font-bold text-slate-900">
                      {profile?.applicationStatus === 'VERIFIED'
                        ? 'Host Partner Account Verified & Authorized'
                        : profile?.applicationStatus === 'PENDING_REVIEW'
                        ? 'Application Submitted & Pending Review'
                        : profile?.applicationStatus === 'ACTION_REQUIRED'
                        ? 'Operational Action Required on Application'
                        : profile?.applicationStatus === 'SUSPENDED'
                        ? 'Host Account Suspended'
                        : 'Onboarding Application in Draft'}
                    </h3>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {profile?.statusReason ||
                        (profile?.applicationStatus === 'PENDING_REVIEW'
                          ? 'Your host onboarding application has been submitted and is currently being inspected by ParkEazy Operations. Standard review duration is 24 to 48 hours.'
                          : profile?.applicationStatus === 'VERIFIED'
                          ? 'Congratulations! Your host partner identity and property eligibility are approved. You may proceed into Host Studio to monitor live bays.'
                          : 'Please finish completing your host profile and eligibility declarations.')}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex flex-wrap gap-4 text-[11px] text-slate-500 font-mono">
                      {profile?.submittedAtUtc && (
                        <span>
                          Submitted: {new Date(profile.submittedAtUtc).toLocaleString()}
                        </span>
                      )}
                      {profile?.reviewedAtUtc && (
                        <span>
                          Reviewed: {new Date(profile.reviewedAtUtc).toLocaleString()}
                        </span>
                      )}
                      <span>
                        Last Synced: {new Date(profile?.updatedAt || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement Audit Checklist */}
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                  Verification &amp; Compliance Checklist
                </h3>
                <div className="space-y-2">
                  {[
                    {
                      label: 'Account & Email Verification',
                      passed: currentUser?.isHostVerified,
                      desc: currentUser?.email,
                    },
                    {
                      label: 'Direct Host Phone Line',
                      passed: Boolean(profile?.phoneNumber && profile.phoneNumber.length >= 7),
                      desc: profile?.phoneNumber || 'Missing phone number',
                    },
                    {
                      label: 'Physical Facility Address',
                      passed: Boolean(profile?.addressLine1 && profile?.city && profile?.state),
                      desc: profile?.addressLine1 ? `${profile.addressLine1}, ${profile.city}` : 'Not provided',
                    },
                    {
                      label: 'Emergency Contact Declared',
                      passed: Boolean(profile?.emergencyContactName && profile?.emergencyContactPhone),
                      desc: profile?.emergencyContactName || 'Missing emergency contact',
                    },
                    {
                      label: 'Operating Model & Premises Authority',
                      passed: Boolean(profile?.ownershipType),
                      desc: `${profile?.businessType} (${profile?.ownershipType})`,
                    },
                    {
                      label: 'Host Partner Agreement Accepted',
                      passed: Boolean(profile?.acceptsHostAgreement),
                      desc: profile?.acceptsHostAgreement ? 'Affirmed & Stored' : 'Pending Acceptance',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {item.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {item.label}
                          </span>
                          <span className="text-[11px] text-slate-400 block font-mono">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                      <Badge variant={item.passed ? 'success' : 'neutral'}>
                        {item.passed ? 'Satisfied' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchStatus}
                  className="w-full sm:w-auto text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh Status
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {profile?.applicationStatus === 'VERIFIED' ? (
                    <Button
                      type="button"
                      variant="primary"
                      themeContext="host"
                      onClick={() => onNavigate('/host/')}
                      className="w-full sm:w-auto font-semibold"
                    >
                      Enter Host Studio
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      themeContext="host"
                      onClick={() => onNavigate('/host/onboarding/profile')}
                      className="w-full sm:w-auto text-xs font-semibold"
                    >
                      Edit Application Details
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onNavigate('/host/exceptions')}
                    className="w-full sm:w-auto text-xs text-slate-500"
                  >
                    View Exception Guide
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
