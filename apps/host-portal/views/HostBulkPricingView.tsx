import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Percent,
  DollarSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  BulkPriceUpdateRequest,
  BulkPriceUpdatePreviewResponse,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostBulkPricingViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostBulkPricingView: React.FC<HostBulkPricingViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id ?? '';

  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [targetType, setTargetType] = useState<'ALL_FACILITIES' | 'SELECTED_FACILITIES'>('ALL_FACILITIES');

  const [adjustmentType, setAdjustmentType] = useState<'PERCENTAGE' | 'FIXED_OFFSET' | 'EXACT'>('PERCENTAGE');
  const [percentValue, setPercentValue] = useState('10'); // +10%
  const [hourlyOffsetDollars, setHourlyOffsetDollars] = useState('1.00');
  const [dailyOffsetDollars, setDailyOffsetDollars] = useState('5.00');
  const [exactHourlyDollars, setExactHourlyDollars] = useState('7.00');
  const [exactDailyDollars, setExactDailyDollars] = useState('40.00');

  const [preview, setPreview] = useState<BulkPriceUpdatePreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadFacilities = useCallback(async () => {
    try {
      const facs = await apiClient.getHostFacilities(hostId);
      setFacilities(facs);
      setSelectedFacilityIds(facs.map((f) => f.id));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load facilities.');
    }
  }, [hostId]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const buildRequest = (): BulkPriceUpdateRequest => {
    let rateAdjustment: BulkPriceUpdateRequest['rateAdjustment'] = { type: adjustmentType };

    if (adjustmentType === 'PERCENTAGE') {
      rateAdjustment = {
        type: 'PERCENTAGE',
        percentageChange: parseFloat(percentValue) || 0,
      };
    } else if (adjustmentType === 'FIXED_OFFSET') {
      rateAdjustment = {
        type: 'FIXED_OFFSET',
        hourlyChangeCents: Math.round((parseFloat(hourlyOffsetDollars) || 0) * 100),
        dailyChangeCents: Math.round((parseFloat(dailyOffsetDollars) || 0) * 100),
      };
    } else if (adjustmentType === 'EXACT') {
      rateAdjustment = {
        type: 'EXACT',
        hourlyRateCents: Math.round((parseFloat(exactHourlyDollars) || 0) * 100),
        dailyRateCents: Math.round((parseFloat(exactDailyDollars) || 0) * 100),
      };
    }

    return {
      targetType,
      facilityIds: targetType === 'SELECTED_FACILITIES' ? selectedFacilityIds : undefined,
      rateAdjustment,
    };
  };

  const handlePreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoadingPreview(true);
    try {
      const req = buildRequest();
      const res = await apiClient.previewBulkPricing(hostId, req);
      setPreview(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate bulk update preview.');
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    if (!preview || preview.conflictingTargetsCount > 0) return;
    if (!window.confirm(`Are you sure you want to apply bulk price changes across ${preview.eligibleTargetsCount} facilities?`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsApplying(true);
    try {
      const req = buildRequest();
      const res = await apiClient.applyBulkPricing(hostId, req);
      setSuccessMessage(res.message);
      setPreview(null);
      await loadFacilities();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply bulk pricing.');
    } finally {
      setIsApplying(false);
    }
  };

  const toggleFacility = (id: string) => {
    setSelectedFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div
      data-screen-id="pe_hw_03_07"
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
        currentPath="/host/pricing/bulk"
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
              pe_hw_03_07
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Bulk Pricing &amp; Schedule Updates
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Safely update pricing tiers across multiple facilities with dry-run conflict analysis and immutable audit trails.
          </p>
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-5">
            <form onSubmit={handlePreview} className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5 text-xs">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 font-bold text-slate-900 text-sm">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                <span>Bulk Update Configuration</span>
              </div>

              {/* Target Scope */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Target Facilities</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTargetType('ALL_FACILITIES')}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-colors ${
                      targetType === 'ALL_FACILITIES'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    All Facilities ({facilities.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('SELECTED_FACILITIES')}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-colors ${
                      targetType === 'SELECTED_FACILITIES'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Select Individually
                  </button>
                </div>

                {targetType === 'SELECTED_FACILITIES' && (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5 bg-slate-50/50">
                    {facilities.map((fac) => (
                      <label key={fac.id} className="flex items-center gap-2 cursor-pointer select-none text-xs">
                        <input
                          type="checkbox"
                          checked={selectedFacilityIds.includes(fac.id)}
                          onChange={() => toggleFacility(fac.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span className="truncate text-slate-800">{fac.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Adjustment Mode */}
              <div>
                <label className="block font-semibold text-slate-700 mb-2">Adjustment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('PERCENTAGE')}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                      adjustmentType === 'PERCENTAGE'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('FIXED_OFFSET')}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                      adjustmentType === 'FIXED_OFFSET'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Fixed Offset ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('EXACT')}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                      adjustmentType === 'EXACT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Exact Rates ($)
                  </button>
                </div>
              </div>

              {/* Adjustment Values */}
              {adjustmentType === 'PERCENTAGE' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Percentage Adjustment (+/- %)
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="1"
                      value={percentValue}
                      onChange={(e) => setPercentValue(e.target.value)}
                      className="font-mono text-xs pr-7"
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-mono">%</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    e.g. +10 increases both hourly and daily rates by 10%.
                  </span>
                </div>
              )}

              {adjustmentType === 'FIXED_OFFSET' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hourly Delta ($)</label>
                    <Input
                      type="number"
                      step="0.25"
                      value={hourlyOffsetDollars}
                      onChange={(e) => setHourlyOffsetDollars(e.target.value)}
                      className="font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Daily Delta ($)</label>
                    <Input
                      type="number"
                      step="0.50"
                      value={dailyOffsetDollars}
                      onChange={(e) => setDailyOffsetDollars(e.target.value)}
                      className="font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              )}

              {adjustmentType === 'EXACT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Set Hourly ($)</label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      value={exactHourlyDollars}
                      onChange={(e) => setExactHourlyDollars(e.target.value)}
                      className="font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Set Daily ($)</label>
                    <Input
                      type="number"
                      step="0.50"
                      min="0"
                      value={exactDailyDollars}
                      onChange={(e) => setExactDailyDollars(e.target.value)}
                      className="font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                themeContext="host"
                disabled={isLoadingPreview}
                className="w-full flex items-center justify-center gap-2"
              >
                {isLoadingPreview ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                <span>{isLoadingPreview ? 'Analyzing Targets...' : 'Generate Update Preview'}</span>
              </Button>
            </form>
          </div>

          {/* Preview & Confirmation Column */}
          <div className="lg:col-span-7">
            {preview ? (
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Proposed Rate Change Preview</h3>
                    <p className="text-xs text-slate-500">{preview.summaryMessage}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="info">{preview.eligibleTargetsCount} Eligible</Badge>
                    {preview.conflictingTargetsCount > 0 && (
                      <Badge variant="warning">{preview.conflictingTargetsCount} Conflicts</Badge>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Facility</th>
                        <th className="py-2.5 px-3 text-right">Current Hourly</th>
                        <th className="py-2.5 px-3 text-right">Proposed Hourly</th>
                        <th className="py-2.5 px-3 text-right">Current Daily</th>
                        <th className="py-2.5 px-3 text-right">Proposed Daily</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                      {preview.targets.map((t) => (
                        <tr key={t.facilityId} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                            {t.facilityName}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            ${(t.currentHourlyRateCents / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ${(t.proposedHourlyRateCents / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500">
                            ${(t.currentDailyRateCents / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            ${(t.proposedDailyRateCents / 100).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {t.hasConflict ? (
                              <Badge variant="warning">Conflict</Badge>
                            ) : (
                              <Badge variant="success">Ready</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreview(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    themeContext="host"
                    disabled={isApplying || preview.conflictingTargetsCount > 0}
                    onClick={handleApply}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isApplying ? 'Applying...' : `Apply Bulk Update to ${preview.eligibleTargetsCount} Facilities`}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-12 bg-white rounded-xl border border-slate-200 text-center text-slate-400 space-y-3">
                <TrendingUp className="w-8 h-8 mx-auto text-slate-300" />
                <div className="text-sm font-semibold text-slate-700">No Preview Generated</div>
                <p className="text-xs max-w-sm mx-auto">
                  Configure your percentage, offset, or exact rate adjustments on the left and click <strong>Generate Update Preview</strong> to review the diff before applying.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
