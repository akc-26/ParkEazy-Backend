import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Building2,
  Calendar,
  Clock,
  RefreshCw,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  PricingAuditRecord,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostPricingHistoryViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostPricingHistoryView: React.FC<HostPricingHistoryViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id ?? '';

  const [history, setHistory] = useState<PricingAuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getPricingHistory(hostId);
      setHistory(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load pricing history.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filteredHistory = history.filter((h) => {
    if (actionFilter === 'ALL') return true;
    return h.action === actionFilter;
  });

  return (
    <div
      data-screen-id="pe_hw_03_09"
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
        currentPath="/host/pricing/history"
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
                pe_hw_03_09
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pricing Audit Trail &amp; Change History
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Append-only historical audit events for rate creations, schedule adjustments, policy updates, and closures.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Mutation Actions ({history.length})</option>
              <option value="RATE_CREATED">Rate Created</option>
              <option value="RATE_UPDATED">Rate Updated</option>
              <option value="RATE_DEACTIVATED">Rate Deactivated</option>
              <option value="SCHEDULE_UPDATED">Schedule Updated</option>
              <option value="POLICY_UPDATED">Policy Updated</option>
              <option value="CLOSURE_CREATED">Closure Created</option>
              <option value="CLOSURE_REMOVED">Closure Removed</option>
              <option value="BULK_UPDATE_APPLIED">Bulk Updates</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Recorded Audit Events
            </h2>
            <div className="text-xs text-slate-500 font-mono">
              Immutable Records: {filteredHistory.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Facility Target</th>
                  <th className="py-3 px-4">Change Summary</th>
                  <th className="py-3 px-4 font-mono">Actor &amp; Correlation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      No audit history entries recorded matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {item.createdAtUtc}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            item.action.includes('CREATED') || item.action.includes('APPLIED')
                              ? 'success'
                              : item.action.includes('DEACTIVATED') || item.action.includes('REMOVED')
                              ? 'default'
                              : 'info'
                          }
                          className="font-mono text-[10px]"
                        >
                          {item.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{item.facilityName || item.facilityId}</div>
                        {item.spaceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Space #{item.spaceNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-800">
                        {item.diffSummary}
                      </td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        <div>Actor: {item.actorId}</div>
                        {item.correlationId && (
                          <div className="text-slate-400">{item.correlationId}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
