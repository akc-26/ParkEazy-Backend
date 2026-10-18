import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Building2,
  MapPin,
  KeyRound,
  DollarSign,
  Layers,
  Camera,
  ExternalLink,
  PauseCircle,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import { Button, Card, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  FacilityPublicationValidation,
  LocationStatus,
} from '../../../packages/contracts';

interface HostFacilityPublishViewProps {
  currentUser: SessionUser | null;
  facilityId: string;
  onNavigate: (path: string) => void;
}

export const HostFacilityPublishView: React.FC<HostFacilityPublishViewProps> = ({
  currentUser,
  facilityId,
  onNavigate,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [facility, setFacility] = useState<ParkingLocation | null>(null);
  const [validation, setValidation] = useState<FacilityPublicationValidation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [fac, val] = await Promise.all([
        apiClient.getHostFacility(hostId, facilityId),
        apiClient.getPublicationReadiness(hostId, facilityId),
      ]);
      setFacility(fac);
      setValidation(val);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to check publication readiness.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, facilityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePublish = async () => {
    if (!validation?.isReady) {
      setErrorMessage('Please satisfy all required conditions before publishing.');
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);
    setActionSuccessMsg(null);
    try {
      const res = await apiClient.publishHostFacility(hostId, facilityId);
      setFacility(res.facility);
      setValidation(res.validation);
      setActionSuccessMsg('Facility listing published successfully! It is now live on the ParkEazy marketplace.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish facility listing.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!window.confirm('Are you sure you want to pause / unpublish this listing? It will no longer be visible to drivers searching for spaces.')) {
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);
    setActionSuccessMsg(null);
    try {
      const unpub = await apiClient.unpublishHostFacility(hostId, facilityId);
      setFacility(unpub);
      const val = await apiClient.getPublicationReadiness(hostId, facilityId);
      setValidation(val);
      setActionSuccessMsg('Listing moved to DRAFT status.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to unpublish listing.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Evaluating publication readiness...</p>
      </div>
    );
  }

  if (!facility || !validation) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Checklist Unavailable</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">{errorMessage}</p>
        <Button
          variant="primary"
          themeContext="host"
          size="sm"
          onClick={() => onNavigate('/host/spaces')}
          className="mt-4"
        >
          Return to Facilities
        </Button>
      </div>
    );
  }

  const isPublished = facility.status === LocationStatus.ACTIVE;
  const isReady = validation.isReady;

  return (
    <div
      data-screen-id="pe_hw_02_09"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      {/* Top Header */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate(`/host/facilities/${facility.id}`)}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Facility
          </button>
        </div>
        <div className="text-xs font-mono text-emerald-400">
          pe_hw_02_09 • Validation &amp; Publication Readiness
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onNavigate('/host/spaces')}
            className="hover:underline"
          >
            Facilities
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => onNavigate(`/host/facilities/${facility.id}`)}
            className="hover:underline font-semibold"
          >
            {facility.name}
          </button>
          <span>/</span>
          <span className="text-emerald-700 font-bold">Publication Readiness</span>
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#16A34A]">
                Listing Lifecycle
              </span>
              <Badge variant={isPublished ? 'success' : isReady ? 'info' : 'warning'}>
                {isPublished ? '● LIVE / PUBLISHED' : isReady ? 'READY TO PUBLISH' : 'ACTION REQUIRED'}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#132A24] tracking-tight mt-1">
              Publication Readiness Audit
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              ParkEazy rigorously enforces real validation standards before a parking facility is opened to driver reservations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/host/facilities/${facility.id}/preview`)}
              className="text-xs"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Preview Listing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Re-evaluate
            </Button>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center gap-2">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Publication Status Banner */}
        {isPublished ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-emerald-950">
                  Facility is Active &amp; Discoverable
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Published on {facility.publishedAt ? new Date(facility.publishedAt).toLocaleDateString() : 'Active'}. Drivers can search and reserve available bays.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate(`/spaces/${facility.id}`)}
                className="text-xs border-emerald-300 text-emerald-900 hover:bg-emerald-100"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                View in Search
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnpublish}
                disabled={isPublishing}
                className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50"
              >
                <PauseCircle className="w-3.5 h-3.5 mr-1" />
                Pause Listing
              </Button>
            </div>
          </div>
        ) : (
          <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isReady
              ? 'bg-emerald-50/70 border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isReady ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-amber-950'
              }`}>
                {isReady ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isReady
                    ? 'All Requirements Met — Ready to Publish!'
                    : `${validation.missingRequirements.length} Requirement(s) Remaining`}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isReady
                    ? 'Your facility details, discrete bays, access instructions, and photography are verified.'
                    : 'Complete the items flagged below before publishing your listing to the live marketplace.'}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              themeContext="host"
              size="lg"
              disabled={!isReady || isPublishing}
              onClick={handlePublish}
              className={`font-bold px-6 shadow-sm ${
                isReady
                  ? 'bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C]'
                  : 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-500'
              }`}
            >
              <Send className="w-4 h-4 mr-2" />
              {isPublishing ? 'Publishing...' : 'Publish Facility Listing'}
            </Button>
          </div>
        )}

        {/* Real-time Checklist Grid */}
        <Card className="p-6 bg-white border border-[#D8E2DE] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-extrabold text-[#132A24]">
              Mandatory Publication Checks
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {validation.checks.filter((c) => c.passed).length} of {validation.checks.length} passed
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {validation.checks.map((item) => (
              <div
                key={item.key}
                className="py-4 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${item.passed ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {item.passed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#132A24]">
                      {item.label}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {item.message}
                    </p>
                  </div>
                </div>

                {!item.passed && (
                  <div className="shrink-0">
                    {item.key === 'BAY_INVENTORY' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate(`/host/facilities/${facility.id}/layout`)}
                        className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50"
                      >
                        Configure Space &rarr;
                      </Button>
                    ) : item.key === 'PHOTOGRAPHS' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate(`/host/facilities/${facility.id}`)}
                        className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50"
                      >
                        Add Photo &rarr;
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate(`/host/facilities/${facility.id}`)}
                        className="text-xs border-amber-300 text-amber-900 hover:bg-amber-50"
                      >
                        Edit Facility &rarr;
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Summary Details */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">Publication Invariants:</p>
          <p>• Only facilities with active status are visible to customer search queries.</p>
          <p>• At least one physical bay with AVAILABLE status must exist before publication.</p>
          <p>• All mutations are verified against host tenant context and persistent storage.</p>
        </div>
      </main>
    </div>
  );
};
