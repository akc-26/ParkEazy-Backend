import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  ArrowRight,
  AlertTriangle,
  Calendar,
  Layers,
  History,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  Clock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser } from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostPricingOverviewViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostPricingOverviewView: React.FC<HostPricingOverviewViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getPricingOverview(hostId);
      setOverview(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load pricing overview.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div
      data-screen-id="pe_hw_03_01"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      {/* Top Header */}
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
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-slate-400">Signed in as</span>
            <span className="font-semibold text-white">{currentUser?.email}</span>
            <span className="font-mono text-[11px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              HOST
            </span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Sub Navigation */}
      <HostSubNav
        currentPath="/host/pricing"
        onNavigate={onNavigate}
        activeModule="pricing"
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Host Portal</span>
              <span>/</span>
              <span className="text-slate-800 font-medium">Pricing &amp; Policies</span>
              <span>/</span>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                pe_hw_03_01
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pricing &amp; Rate Policy Hub
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Authoritative revenue rates, operating hours, duration bounds, and dynamic price estimates.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/host/pricing/estimate')}
              className="flex items-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Price Calculator</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              themeContext="host"
              onClick={() => onNavigate('/host/pricing/rates')}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Rates</span>
            </Button>
          </div>
        </div>

        {/* Conflict Alert Banner (if unresolved conflicts exist) */}
        {overview?.unresolvedConflictsCount > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-900">
                Action Required: {overview.unresolvedConflictsCount} Schedule Conflict(s) Detected
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                One or more facility closures or schedule changes overlap active confirmed driver reservations.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/host/pricing/conflicts')}
              className="text-amber-800 border-amber-300 hover:bg-amber-100 shrink-0"
            >
              Resolve Conflicts
            </Button>
          </div>
        )}

        {/* Loading / Error States */}
        {isLoading && !overview && (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-sm">Loading pricing records and policy snapshots...</p>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {overview && (
          <>
            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Managed Facilities</span>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {overview.totalFacilities}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Active in host inventory
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Active Rate Plans</span>
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  {overview.activeRatePlansCount}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Authoritative base &amp; space tiers
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Scheduled Closures</span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">
                  {overview.activeClosuresCount}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Maintenance &amp; holiday blocks
                </div>
              </div>

              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
                  <span>Schedule Conflicts</span>
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
                <div className={`text-2xl font-bold font-mono ${overview.unresolvedConflictsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {overview.unresolvedConflictsCount}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {overview.unresolvedConflictsCount === 0 ? 'All bookings protected' : 'Requires host action'}
                </div>
              </div>
            </div>

            {/* Quick Action Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => onNavigate('/host/pricing/rates')}
                className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Rate Plan Configuration</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Set hourly rates, daily caps, minimum billable duration, and vehicle-tier multipliers.
                </p>
                <div className="mt-3 text-[11px] font-mono text-emerald-700 font-medium">
                  Screen pe_hw_03_02 &rarr;
                </div>
              </div>

              <div
                onClick={() => onNavigate('/host/pricing/schedule')}
                className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Weekly Operating Hours</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure daily open/close schedules, overnight intervals crossing midnight, and closed days.
                </p>
                <div className="mt-3 text-[11px] font-mono text-emerald-700 font-medium">
                  Screen pe_hw_03_03 &rarr;
                </div>
              </div>

              <div
                onClick={() => onNavigate('/host/pricing/bulk')}
                className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Bulk Price Updates</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Preview and apply rate adjustments across multiple facilities simultaneously with dry-run conflict checks.
                </p>
                <div className="mt-3 text-[11px] font-mono text-emerald-700 font-medium">
                  Screen pe_hw_03_07 &rarr;
                </div>
              </div>
            </div>

            {/* Facility Rates & Policy Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Facility Pricing &amp; Policy Matrix
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live rates, cancellation tiers, security deposits, and publication statuses.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/host/pricing/history')}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Audit Trail</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-3 px-4">Facility Name</th>
                      <th className="py-3 px-4">Property Type</th>
                      <th className="py-3 px-4">Physical Bays</th>
                      <th className="py-3 px-4 text-right">Hourly Rate</th>
                      <th className="py-3 px-4 text-right">Daily Cap</th>
                      <th className="py-3 px-4 text-right">Deposit</th>
                      <th className="py-3 px-4">Cancellation Tier</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {overview.facilities.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          No facilities registered for this host.
                        </td>
                      </tr>
                    ) : (
                      overview.facilities.map((fac: any) => (
                        <tr key={fac.facilityId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div>{fac.facilityName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{fac.facilityId}</div>
                          </td>
                          <td className="py-3 px-4">{fac.propertyType}</td>
                          <td className="py-3 px-4 font-mono">{fac.totalBays} bays</td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                            ${(fac.hourlyRateCents / 100).toFixed(2)}/hr
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-emerald-700">
                            ${(fac.dailyRateCents / 100).toFixed(2)}/day
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            ${(fac.securityDepositCents / 100).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                              {fac.cancellationPolicyTier}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge variant={fac.status === 'ACTIVE' ? 'success' : 'default'}>
                              {fac.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onNavigate(`/host/pricing/rates?facilityId=${fac.facilityId}`)}
                                className="px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                              >
                                Edit Rates
                              </button>
                              <button
                                type="button"
                                onClick={() => onNavigate(`/host/pricing/rules?facilityId=${fac.facilityId}`)}
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                              >
                                Rules
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
