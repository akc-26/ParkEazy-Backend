import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Home,
  CheckCircle2,
} from 'lucide-react';
import { Button, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { HostBusinessType, SessionUser } from '../../../packages/contracts';

interface HostRegisterViewProps {
  onNavigate: (path: string) => void;
  onRegisterSuccess: (user: SessionUser) => void;
}

export const HostRegisterView: React.FC<HostRegisterViewProps> = ({
  onNavigate,
  onRegisterSuccess,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessType, setBusinessType] = useState<HostBusinessType>('INDIVIDUAL');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptsTerms, setAcceptsTerms] = useState(false);
  const [acceptsHostAgreement, setAcceptsHostAgreement] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmailFormat = (val: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required.';
    } else if (firstName.trim().length > 100) {
      newErrors.firstName = 'First name cannot exceed 100 characters.';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required.';
    } else if (lastName.trim().length > 100) {
      newErrors.lastName = 'Last name cannot exceed 100 characters.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!validateEmailFormat(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required for host identity verification.';
    } else if (phoneNumber.trim().length < 7) {
      newErrors.phoneNumber = 'Please enter a valid phone number (min 7 digits).';
    }

    if (businessType !== 'INDIVIDUAL' && !businessName.trim()) {
      newErrors.businessName = 'Business or entity name is required for commercial accounts.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.';
    } else {
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasLetter || !hasNumber) {
        newErrors.password = 'Password must contain at least one letter and one number.';
      }
    }

    if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!acceptsTerms) {
      newErrors.acceptsTerms = 'You must accept the ParkEazy Terms of Service.';
    }

    if (!acceptsHostAgreement) {
      newErrors.acceptsHostAgreement = 'You must accept the ParkEazy Host Partner Agreement.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await apiClient.register({
        email: email.trim(),
        password,
        confirmPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        businessType,
        businessName: businessName.trim() || undefined,
        acceptsTerms,
        acceptsHostAgreement,
        requestedPortal: 'host',
      });

      onRegisterSuccess(response.user);
      onNavigate('/host/verify');
    } catch (err: any) {
      const msg = err.message || 'Registration failed. Please check inputs and retry.';
      setErrorMessage(msg);
      if (err.code === 'DUPLICATE_ACCOUNT') {
        setErrors((prev) => ({
          ...prev,
          email: 'An account with this email address already exists. Please sign in instead.',
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      data-screen-id="pe_hw_01_02"
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
              ParkEazy Workspace
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

      {/* Main Content Form Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-semibold tracking-wider uppercase mb-2">
              Screen pe_hw_01_02
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Create Your Host Account
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Join ParkEazy as an authorized parking host. Monetize driveways, garages, or commercial lots with automated booking control.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Registration Issue</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                id="host-reg-first-name"
                placeholder="Marcus"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                error={errors.firstName}
                disabled={isLoading}
              />
              <Input
                label="Last Name"
                id="host-reg-last-name"
                placeholder="Chen"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                error={errors.lastName}
                disabled={isLoading}
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                id="host-reg-email"
                type="email"
                placeholder="host@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                autoComplete="email"
                disabled={isLoading}
              />
              <Input
                label="Mobile Phone Number"
                id="host-reg-phone"
                type="tel"
                placeholder="+1 (555) 0144"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                error={errors.phoneNumber}
                helperText="Used for gate access alerts and verification."
                disabled={isLoading}
              />
            </div>

            {/* Business Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Host Operating Model
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'INDIVIDUAL', label: 'Individual Host', desc: 'Driveway / Residential' },
                  { id: 'BUSINESS', label: 'Registered Business', desc: 'Commercial Operator' },
                  { id: 'PROPERTY_MANAGER', label: 'Property Manager', desc: 'Multi-Tenant / HOAs' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setBusinessType(type.id as HostBusinessType)}
                    className={`p-3 text-left rounded-xl border text-xs transition-all ${
                      businessType === type.id
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-semibold shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block font-medium">{type.label}</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">{type.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {businessType !== 'INDIVIDUAL' && (
              <Input
                label="Legal Business / Entity Name"
                id="host-reg-business-name"
                placeholder="Pacific Parking Operators LLC"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                error={errors.businessName}
                disabled={isLoading}
              />
            )}

            {/* Password Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="host-reg-password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <input
                  id="host-reg-password"
                  type="password"
                  placeholder="Min 8 chars (letter + number)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    errors.password
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-slate-600 focus:ring-slate-100'
                  }`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="host-reg-confirm-password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="host-reg-confirm-password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    errors.confirmPassword
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-slate-600 focus:ring-slate-100'
                  }`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Checkbox Agreements */}
            <div className="space-y-2 pt-2">
              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptsTerms}
                  onChange={(e) => setAcceptsTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>
                  I agree to the{' '}
                  <span className="font-semibold text-slate-900">
                    ParkEazy Terms of Service
                  </span>{' '}
                  and Privacy Policy.
                </span>
              </label>
              {errors.acceptsTerms && (
                <p className="text-xs text-red-600 pl-6">{errors.acceptsTerms}</p>
              )}

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptsHostAgreement}
                  onChange={(e) => setAcceptsHostAgreement(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span>
                  I agree to the{' '}
                  <span className="font-semibold text-slate-900">
                    ParkEazy Host Partner Agreement
                  </span>{' '}
                  and confirm I hold lawful authorization to lease physical bay space.
                </span>
              </label>
              {errors.acceptsHostAgreement && (
                <p className="text-xs text-red-600 pl-6">{errors.acceptsHostAgreement}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              themeContext="host"
              isLoading={isLoading}
              className="w-full mt-4 font-semibold"
            >
              Complete Registration &amp; Proceed to Verification
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Already have account */}
          <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
            Already registered as a host?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/host/login')}
              className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Sign In to Host Account
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200 bg-white">
        ParkEazy Marketplace Platform &bull; Host Security &amp; Identity Subsystem
      </footer>
    </div>
  );
};
