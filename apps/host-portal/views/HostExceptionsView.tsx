import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  UserX,
  Lock,
  FileWarning,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Mail,
  Home,
  CheckCircle2,
  LifeBuoy,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { SessionUser, UserRole } from '../../../packages/contracts';

interface HostExceptionsViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  exceptionType?:
    | 'UNAUTHENTICATED'
    | 'ROLE_MISMATCH'
    | 'UNVERIFIED'
    | 'ACTION_REQUIRED'
    | 'SUSPENDED'
    | 'NETWORK_ERROR';
}

export const HostExceptionsView: React.FC<HostExceptionsViewProps> = ({
  currentUser,
  onNavigate,
  exceptionType: initialExceptionType,
}) => {
  // Infer active exception state if not directly passed
  const determineActiveException = () => {
    if (initialExceptionType) return initialExceptionType;
    if (!currentUser) return 'UNAUTHENTICATED';
    if (!currentUser.roles.includes(UserRole.HOST) && !currentUser.roles.includes(UserRole.ADMIN)) {
      return 'ROLE_MISMATCH';
    }
    if (!currentUser.isHostVerified) return 'UNVERIFIED';
    return 'ACTION_REQUIRED';
  };

  const [activeTab, setActiveTab] = useState<string>(determineActiveException());

  const exceptionsData: Record<
    string,
    {
      title: string;
      code: string;
      severity: 'error' | 'warning' | 'info';
      icon: any;
      description: string;
      technicalDetails: string;
      primaryActionLabel: string;
      primaryActionPath: string;
      secondaryActionLabel?: string;
      secondaryActionPath?: string;
    }
  > = {
    UNAUTHENTICATED: {
      title: 'Authentication Required for Host Studio',
      code: 'AUTH_REQUIRED_401',
      severity: 'error',
      icon: Lock,
      description:
        'You attempted to access a protected host operational route without an active, verified session token. Please sign in with your authorized host partner credentials.',
      technicalDetails:
        'HTTP 401 UNAUTHENTICATED. Bearer token missing, malformed, or cryptographic HMAC-SHA256 signature verification failed.',
      primaryActionLabel: 'Sign In to Host Studio',
      primaryActionPath: '/host/login',
      secondaryActionLabel: 'Register New Host Account',
      secondaryActionPath: '/host/register',
    },
    ROLE_MISMATCH: {
      title: 'Host Role Required for Workspace Access',
      code: 'INSUFFICIENT_ROLES_403',
      severity: 'warning',
      icon: UserX,
      description:
        'You are currently signed in as a driver customer. Your account does not currently hold an authorized HOST role to administer parking facilities.',
      technicalDetails:
        'HTTP 403 FORBIDDEN. Principal roles: [CUSTOMER]. Required role: [HOST] or [ADMIN]. Access blocked by requireRoles guard.',
      primaryActionLabel: 'Register / Upgrade to Host Partner',
      primaryActionPath: '/host/register',
      secondaryActionLabel: 'Return to Driver Website',
      secondaryActionPath: '/',
    },
    UNVERIFIED: {
      title: 'Contact Identity Verification Pending',
      code: 'HOST_UNVERIFIED_403',
      severity: 'warning',
      icon: ShieldAlert,
      description:
        'Your host email address or phone number has not completed two-factor verification. Verified contact channels are mandatory before listing parking bays.',
      technicalDetails:
        'Principal isHostVerified = false. Payout routing and bay listing disabled until OTP verification token consumed.',
      primaryActionLabel: 'Enter Verification Code',
      primaryActionPath: '/host/verify',
      secondaryActionLabel: 'Sign In with Other Account',
      secondaryActionPath: '/host/login',
    },
    ACTION_REQUIRED: {
      title: 'Application Revision or Clarification Required',
      code: 'APPLICATION_ACTION_REQUIRED',
      severity: 'warning',
      icon: FileWarning,
      description:
        'The ParkEazy trust and safety team reviewed your host application and requested additional information regarding property title or premises insurance.',
      technicalDetails:
        'HostApplicationStatus = ACTION_REQUIRED. Bay creation wizard locked until updated documentation submitted.',
      primaryActionLabel: 'Review Application Details',
      primaryActionPath: '/host/application-status',
      secondaryActionLabel: 'Edit Profile Information',
      secondaryActionPath: '/host/onboarding/profile',
    },
    SUSPENDED: {
      title: 'Host Account Suspended by Operations',
      code: 'HOST_ACCOUNT_SUSPENDED_403',
      severity: 'error',
      icon: AlertTriangle,
      description:
        'This host account has been suspended due to an unresolved facility dispute, repeated overstay lockouts, or safety policy violations. Active bays are currently hidden.',
      technicalDetails:
        'HostApplicationStatus = SUSPENDED. Modifications to inventory and ledger payout disbursements are rejected.',
      primaryActionLabel: 'Check Application Status',
      primaryActionPath: '/host/application-status',
      secondaryActionLabel: 'Sign In to Different Account',
      secondaryActionPath: '/host/login',
    },
    NETWORK_ERROR: {
      title: 'Backend Connectivity or Database Unavailable',
      code: 'SERVICE_UNAVAILABLE_503',
      severity: 'error',
      icon: RefreshCw,
      description:
        'The ParkEazy API or persistent database pool is momentarily unreachable. Your local data changes are cached safely.',
      technicalDetails:
        'HTTP 503 SERVICE_UNAVAILABLE / NETWORK_FAILURE. Backend readiness probe returned down or connection timeout occurred.',
      primaryActionLabel: 'Retry Host Connection',
      primaryActionPath: '/host/login',
      secondaryActionLabel: 'Return to Homepage',
      secondaryActionPath: '/',
    },
  };

  const activeException = exceptionsData[activeTab] || exceptionsData.UNAUTHENTICATED;
  const IconComponent = activeException.icon;

  return (
    <div
      data-screen-id="pe_hw_01_09"
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
            <span className="text-[10px] text-amber-400 block -mt-0.5">
              Exception &amp; Security Boundary Center
            </span>
          </div>
        </div>
        <button
          onClick={() => onNavigate('/')}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Driver Website
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="inline-block px-2.5 py-1 rounded bg-amber-50 text-amber-800 font-mono text-[11px] font-semibold tracking-wider uppercase mb-1">
              Screen pe_hw_01_09
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Host Authentication &amp; Onboarding Exceptions
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Diagnostic and resolution pathways for role authorization, unauthenticated sessions, and application locks.
            </p>
          </div>
        </div>

        {/* Tab Selector for Exception Scenarios */}
        <div className="mb-6 flex flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-xl">
          {[
            { id: 'UNAUTHENTICATED', label: 'Unauthenticated (401)' },
            { id: 'ROLE_MISMATCH', label: 'Role Mismatch (403)' },
            { id: 'UNVERIFIED', label: 'Unverified Contact' },
            { id: 'ACTION_REQUIRED', label: 'Action Required' },
            { id: 'SUSPENDED', label: 'Account Suspended' },
            { id: 'NETWORK_ERROR', label: 'Service Offline (503)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Exception Display Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                activeException.severity === 'error'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <IconComponent className="w-6 h-6" />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-slate-400">
                  {activeException.code}
                </span>
                <Badge
                  variant={activeException.severity === 'error' ? 'danger' : 'warning'}
                >
                  {activeException.severity.toUpperCase()}
                </Badge>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {activeException.title}
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-2xl">
                {activeException.description}
              </p>
            </div>
          </div>

          {/* Technical Diagnostics */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block font-mono">
              System Diagnostic Details
            </span>
            <code className="text-xs text-slate-600 font-mono block break-all">
              {activeException.technicalDetails}
            </code>
            {currentUser && (
              <div className="pt-2 text-[11px] text-slate-500 font-mono flex gap-4">
                <span>Principal ID: {currentUser.id}</span>
                <span>Roles: {currentUser.roles.join(', ')}</span>
                <span>Verified: {currentUser.isHostVerified ? 'YES' : 'NO'}</span>
              </div>
            )}
          </div>

          {/* Action Pathways */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="primary"
              themeContext="host"
              onClick={() => onNavigate(activeException.primaryActionPath)}
              className="w-full sm:w-auto font-semibold"
            >
              {activeException.primaryActionLabel}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>

            {activeException.secondaryActionLabel && activeException.secondaryActionPath && (
              <Button
                variant="outline"
                onClick={() => onNavigate(activeException.secondaryActionPath!)}
                className="w-full sm:w-auto text-xs"
              >
                {activeException.secondaryActionLabel}
              </Button>
            )}
          </div>
        </div>

        {/* Support note */}
        <div className="mt-6 flex items-center justify-between text-xs text-slate-500 px-2">
          <span className="flex items-center gap-1.5">
            <LifeBuoy className="w-4 h-4 text-emerald-600" />
            Need operational help? Contact ParkEazy Partner Support.
          </span>
          <button
            onClick={() => onNavigate('/host/login')}
            className="text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Return to Host Sign In
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        ParkEazy Marketplace Platform &bull; Host Security &amp; Identity Subsystem
      </footer>
    </div>
  );
};
