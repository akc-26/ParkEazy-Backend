import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Calculator,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Percent,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  PriceEstimateResponse,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostPriceEstimateViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostPriceEstimateView: React.FC<HostPriceEstimateViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [selectedBayId, setSelectedBayId] = useState<string>('');

  // Start & End datetimes (defaults: tomorrow 10:00 to 14:00)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = tomorrow.toISOString().substring(0, 11) + '10:00';
  const defaultEnd = tomorrow.toISOString().substring(0, 11) + '14:00';

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);

  const [estimate, setEstimate] = useState<PriceEstimateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFacilities = useCallback(async () => {
    try {
      const facs = await apiClient.getHostFacilities(hostId);
      setFacilities(facs);
      if (facs.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(facs[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load facilities.');
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const loadBays = useCallback(async () => {
    if (!selectedFacilityId) return;
    try {
      const data = await apiClient.getHostFacilityBays(selectedFacilityId, hostId);
      setBays(data);
    } catch {
      setBays([]);
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadBays();
  }, [loadBays]);

  const handleCalculateEstimate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedFacilityId || !startTime || !endTime) return;

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const startUtc = new Date(startTime).toISOString();
      const endUtc = new Date(endTime).toISOString();

      const result = await apiClient.calculateEstimate(hostId, {
        facilityId: selectedFacilityId,
        bayId: selectedBayId || undefined,
        startTimeUtc: startUtc,
        endTimeUtc: endUtc,
      });
      setEstimate(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to calculate price estimate.');
      setEstimate(null);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  return (
    <div
      data-screen-id="pe_hw_03_06"
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
        currentPath="/host/pricing/estimate"
        onNavigate={onNavigate}
        activeModule="pricing"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Host Portal</span>
            <span>/</span>
            <span>Pricing &amp; Policies</span>
            <span>/</span>
            <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              pe_hw_03_06
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Authoritative Price Estimation &amp; Breakdown Engine
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Test and preview real-time quotes, multi-day daily rate capping, fees, and driver payable totals.
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Parameters */}
          <div className="lg:col-span-5 space-y-5">
            <form onSubmit={handleCalculateEstimate} className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>Simulation Parameters</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Facility</label>
                <select
                  value={selectedFacilityId}
                  onChange={(e) => {
                    setSelectedFacilityId(e.target.value);
                    setSelectedBayId('');
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} ({fac.address.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Specific Bay (Optional)</label>
                <select
                  value={selectedBayId}
                  onChange={(e) => setSelectedBayId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Any Bay (Use Facility Default Rate)</option>
                  {bays.map((bay) => (
                    <option key={bay.id} value={bay.id}>
                      Bay {bay.bayNumber} ({bay.bayType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date &amp; Time</label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Date &amp; Time</label>
                <Input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                themeContext="host"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4" />
                )}
                <span>{isLoading ? 'Calculating...' : 'Compute Price Quote'}</span>
              </Button>
            </form>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs space-y-2">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>Estimate Disclaimer</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                This calculation produces an authoritative pricing quote snapshot. It does not reserve inventory, lock bays, or initiate payment transactions. Driver holds are established separately upon customer checkout.
              </p>
            </div>
          </div>

          {/* Result Card Breakdown */}
          <div className="lg:col-span-7">
            {estimate ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <span className="font-mono text-[11px] text-slate-400">Quote ID: {estimate.quoteId}</span>
                    <h3 className="font-bold text-base text-slate-900">{estimate.facilityName}</h3>
                    {estimate.bayNumber && (
                      <span className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Bay #{estimate.bayNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge variant="success">Tier: {estimate.rateTierApplied}</Badge>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      {estimate.durationMinutes} mins ({estimate.billableHours} hrs)
                    </div>
                  </div>
                </div>

                {/* Big Total Banner */}
                <div className="p-5 bg-gradient-to-r from-emerald-950 to-slate-900 text-white rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-emerald-400 font-mono uppercase tracking-wider block">
                      Total Driver Payable
                    </span>
                    <div className="text-3xl font-extrabold font-mono tracking-tight text-white mt-0.5">
                      ${(estimate.totalPayableCents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[11px] text-slate-400 block">Host Est. Net Share (85%)</span>
                    <span className="text-lg font-bold text-emerald-400">
                      ${((estimate.baseAmountCents * 0.85) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Itemized Line Items */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Itemized Financial Breakdown
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {estimate.breakdown.map((item, i) => (
                      <div key={i} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/50">
                        <span className="text-slate-700 font-medium">{item.description}</span>
                        <span className="font-mono font-bold text-slate-900">
                          ${(item.amountCents / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <div className="p-3.5 flex items-center justify-between bg-emerald-50/40 font-bold">
                      <span className="text-slate-900">Grand Total Payable:</span>
                      <span className="font-mono text-emerald-800 text-sm">
                        ${(estimate.totalPayableCents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Cancellation Policy: <strong className="text-slate-800">{estimate.cancellationPolicyTier}</strong></span>
                  <span className="font-mono text-[11px]">Computed: {new Date(estimate.quotedAtUtc).toLocaleTimeString()}</span>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 space-y-3">
                <Calculator className="w-8 h-8 mx-auto text-slate-300" />
                <div className="text-sm font-semibold text-slate-700">No Estimate Computed Yet</div>
                <p className="text-xs max-w-sm mx-auto">
                  Select a facility and date range on the left, then click <strong>Compute Price Quote</strong> to evaluate the authoritative pricing rules.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
