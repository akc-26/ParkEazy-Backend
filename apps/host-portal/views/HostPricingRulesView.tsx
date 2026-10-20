import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  DollarSign,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  PricingPolicy,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostPricingRulesViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostPricingRulesView: React.FC<HostPricingRulesViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [policy, setPolicy] = useState<PricingPolicy | null>(null);

  const [minHours, setMinHours] = useState('1');
  const [maxHours, setMaxHours] = useState('72');
  const [incrementMins, setIncrementMins] = useState('30');
  const [bufferMins, setBufferMins] = useState('15');
  const [cancellationTier, setCancellationTier] = useState<'FLEXIBLE_24H' | 'STANDARD_48H' | 'STRICT_7D'>('STANDARD_48H');
  const [depositDollars, setDepositDollars] = useState('20.00');
  const [overstayDollarsPerHour, setOverstayDollarsPerHour] = useState('15.00');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadFacilities = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const facs = await apiClient.getHostFacilities(hostId);
      setFacilities(facs);
      if (facs.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(facs[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load facilities.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const loadPolicy = useCallback(async () => {
    if (!selectedFacilityId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const p = await apiClient.getPricingPolicy(hostId, selectedFacilityId);
      setPolicy(p);
      setMinHours((p.minDurationMinutes / 60).toString());
      setMaxHours((p.maxDurationMinutes / 60).toString());
      setIncrementMins(p.bookingIncrementMinutes.toString());
      setBufferMins(p.transitionBufferMinutes.toString());
      setCancellationTier(p.cancellationPolicyTier);
      setDepositDollars((p.securityDepositCents / 100).toFixed(2));
      setOverstayDollarsPerHour((p.overstayPenaltyPerHourCents / 100).toFixed(2));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load pricing policy.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const minMins = Math.round(parseFloat(minHours) * 60);
    const maxMins = Math.round(parseFloat(maxHours) * 60);
    const depositCents = Math.round(parseFloat(depositDollars) * 100);
    const overstayCents = Math.round(parseFloat(overstayDollarsPerHour) * 100);

    if (isNaN(minMins) || minMins < 15) {
      setErrorMessage('Minimum booking duration must be at least 15 minutes.');
      return;
    }
    if (isNaN(maxMins) || maxMins < minMins) {
      setErrorMessage('Maximum booking duration cannot be less than minimum duration.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await apiClient.updatePricingPolicy(hostId, {
        facilityId: selectedFacilityId,
        minDurationMinutes: minMins,
        maxDurationMinutes: maxMins,
        bookingIncrementMinutes: parseInt(incrementMins, 10) || 30,
        transitionBufferMinutes: parseInt(bufferMins, 10) || 15,
        cancellationPolicyTier: cancellationTier,
        securityDepositCents: depositCents,
        overstayPenaltyPerHourCents: overstayCents,
      });

      setPolicy(updated);
      setSuccessMessage('Pricing rules and duration policies saved successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save pricing policy.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  return (
    <div
      data-screen-id="pe_hw_03_05"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/host')}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center shrink-0">
              H
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Host Studio
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">
                ParkEazy Host Hub
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400 font-semibold">{currentUser?.email}</span>
          <button
            type="button"
            onClick={onLogout}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      <HostSubNav
        currentPath="/host/pricing/rules"
        onNavigate={onNavigate}
        activeModule="pricing"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Host Portal</span>
              <span>/</span>
              <span>Pricing &amp; Policies</span>
              <span>/</span>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                pe_hw_03_05
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Booking Duration &amp; Pricing Policies
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Set minimum and maximum duration bounds, cancellation policy refund tiers, security deposit escrow, and overstay terms.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Building2 className="w-4 h-4 text-slate-400" />
              <label htmlFor="facility-rules-select" className="text-slate-500 font-medium">Facility:</label>
              <select
                id="facility-rules-select"
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.address.city})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSavePolicy} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Duration & Schedule Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Duration Boundaries &amp; Increments</h2>
                  <p className="text-xs text-slate-500">Defines valid search and reservation windows for drivers.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Minimum Booking Duration (Hours)
                  </label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.25"
                    max="24"
                    value={minHours}
                    onChange={(e) => setMinHours(e.target.value)}
                    className="font-mono text-xs"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Standard marketplace minimum: 1 hour</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Maximum Booking Duration (Hours)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    max="168"
                    value={maxHours}
                    onChange={(e) => setMaxHours(e.target.value)}
                    className="font-mono text-xs"
                    required
                  />
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Standard marketplace maximum: 72 hours (3 days)</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Scheduling Increment (Minutes)
                  </label>
                  <select
                    value={incrementMins}
                    onChange={(e) => setIncrementMins(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes (Standard)</option>
                    <option value="60">60 minutes (Hourly only)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Transition Cleaning/Inspection Buffer (Minutes)
                  </label>
                  <select
                    value={bufferMins}
                    onChange={(e) => setBufferMins(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="0">0 minutes (Instant handover)</option>
                    <option value="15">15 minutes (Standard invariant)</option>
                    <option value="30">30 minutes (Extended)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cancellation Policy Tier Card */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Cancellation Policy &amp; Refund Tier</h2>
                  <p className="text-xs text-slate-500">Governs driver cancellations, refunds, and host cancellation compensation.</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <label
                  onClick={() => setCancellationTier('FLEXIBLE_24H')}
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    cancellationTier === 'FLEXIBLE_24H'
                      ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationTier"
                    checked={cancellationTier === 'FLEXIBLE_24H'}
                    onChange={() => setCancellationTier('FLEXIBLE_24H')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-sm">Flexible 24-Hour Policy</div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      100% full refund if canceled up to 24 hours before reservation start; 50% refund thereafter.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setCancellationTier('STANDARD_48H')}
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    cancellationTier === 'STANDARD_48H'
                      ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationTier"
                    checked={cancellationTier === 'STANDARD_48H'}
                    onChange={() => setCancellationTier('STANDARD_48H')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-sm">Standard 48-Hour Policy (Recommended)</div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      100% refund up to 48 hours prior; 50% refund up to 12 hours prior; non-refundable under 12 hours.
                    </p>
                  </div>
                </label>

                <label
                  onClick={() => setCancellationTier('STRICT_7D')}
                  className={`p-4 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    cancellationTier === 'STRICT_7D'
                      ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancellationTier"
                    checked={cancellationTier === 'STRICT_7D'}
                    onChange={() => setCancellationTier('STRICT_7D')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-sm">Strict 7-Day Policy</div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      100% refund up to 7 days prior; 50% refund up to 48 hours prior; zero refund under 48 hours.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Escrow & Overstay Fees */}
          <div className="space-y-6">
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5 text-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Financial Escrow &amp; Penalties</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Refundable Security Deposit (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono">$</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={depositDollars}
                    onChange={(e) => setDepositDollars(e.target.value)}
                    className="pl-7 font-mono"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Escrowed on double-entry ledger upon driver checkout; automatically released post-checkout if no damage or overstay is reported.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Overstay Penalty Rate (USD / Hour)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-mono">$</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={overstayDollarsPerHour}
                    onChange={(e) => setOverstayDollarsPerHour(e.target.value)}
                    className="pl-7 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Authoritative rate applied when a driver exceeds their confirmed checkout timestamp without requesting an extension.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-2">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ledger Compliance Notice</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Security deposits are segregated from platform commission and host revenue accounts, preserving financial invariant integrity.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                themeContext="host"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Policy Rules'}</span>
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};
