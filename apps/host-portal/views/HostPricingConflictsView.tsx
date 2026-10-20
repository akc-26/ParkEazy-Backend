import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  PricingConflict,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostPricingConflictsViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostPricingConflictsView: React.FC<HostPricingConflictsViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [conflicts, setConflicts] = useState<PricingConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadConflicts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getPricingConflicts(hostId);
      setConflicts(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load conflicts.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  return (
    <div
      data-screen-id="pe_hw_03_08"
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
        currentPath="/host/pricing/conflicts"
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
                pe_hw_03_08
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Pricing &amp; Availability Conflicts Center
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Identifies overlaps between host closures, maintenance blocks, and protected customer reservations.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadConflicts}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Re-scan Invariants</span>
          </Button>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Protection Contract Explanation */}
        <div className="p-4 bg-slate-900 text-white rounded-xl flex items-start gap-3 text-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-white text-sm">Automated Concurrency Protection Rules</div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Confirmed driver bookings and active 10-minute checkout holds are protected from host schedule overwrites.
              If a host attempts to close a facility or space during an active reservation window, the backend transaction rejects
              the mutation with a 409 conflict and preserves driver bookings.
            </p>
          </div>
        </div>

        {/* Conflicts List */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-sm">Scanning facilities and reservation schedules...</p>
          </div>
        ) : conflicts.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Zero Invariant Conflicts Detected</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All active rate schedules, closures, maintenance blocks, and confirmed driver reservations are mutually compatible.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {conflicts.map((cnf) => (
              <div
                key={cnf.id}
                className="p-5 bg-white rounded-xl border border-amber-300 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-bold text-sm text-slate-900">{cnf.facilityName}</span>
                    {cnf.spaceNumber && (
                      <span className="font-mono text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        Space #{cnf.spaceNumber}
                      </span>
                    )}
                  </div>
                  <Badge variant="warning">{cnf.severity}</Badge>
                </div>

                <p className="text-xs text-slate-700 font-medium">{cnf.message}</p>

                <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 font-mono text-slate-600 border border-slate-200">
                  <div>Conflict Window: {cnf.startTimeUtc} &rarr; {cnf.endTimeUtc}</div>
                  {cnf.bookingReference && <div>Booking Reference: {cnf.bookingReference}</div>}
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <div className="text-emerald-800 font-medium">
                    Recommended Action: {cnf.suggestedAction}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('/host/pricing/closures')}
                    className="text-xs"
                  >
                    Adjust Closures
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
