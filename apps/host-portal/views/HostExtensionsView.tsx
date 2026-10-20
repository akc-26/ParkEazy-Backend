import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Layers,
  ArrowRight,
  User,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import { Button, Badge, Card } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser } from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostExtensionsViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostExtensionsView: React.FC<HostExtensionsViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const data = await apiClient.getHostExtensionRequests(hostId);
      setRequests(data);
    } catch (err: any) {
      console.error('Failed to load extension requests:', err);
      setFeedback({ type: 'error', message: err.message || 'Could not load extension requests' });
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleDecision = async (requestId: string, decision: 'APPROVE' | 'REJECT') => {
    setActionInProgress(requestId);
    setFeedback(null);
    try {
      await apiClient.decideExtensionRequest(hostId, requestId, decision);
      setFeedback({
        type: 'success',
        message: `Extension request ${decision === 'APPROVE' ? 'approved' : 'rejected'} successfully.`,
      });
      await loadRequests();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || `Failed to ${decision.toLowerCase()} extension request.`,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const pastRequests = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="min-h-screen bg-[#F0F4F3] text-[#132A24] font-sans">
      <header className="h-16 bg-[#12211C] border-b border-[#1e342d] px-8 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center">
            H
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">Host Studio</span>
            <span className="text-[10px] text-emerald-400 block -mt-0.5">Booking Extension Requests</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => onNavigate('/host')}>
            Back to Dashboard
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Sign Out
          </Button>
        </div>
      </header>

      <HostSubNav activeSection="extensions" onNavigate={onNavigate} />

      <main className="max-w-6xl mx-auto p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-emerald-600" />
              Booking Extension Requests Queue
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Drivers currently parked in your facilities who have requested additional hours before expiration.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadRequests} disabled={isLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-medium ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Section 1: Pending Extension Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              Pending Decisions ({pendingRequests.length})
            </h2>
            <span className="text-[11px] text-slate-500">15-minute transition conflict check active</span>
          </div>

          {pendingRequests.length === 0 ? (
            <Card className="p-8 text-center bg-white border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h3 className="font-bold text-sm text-slate-800">No Pending Requests</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                All customer extension requests have been processed. New requests will appear here in real time.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map((req) => (
                <Card key={req.id} className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs text-emerald-700 font-bold block">{req.id}</span>
                      <h4 className="font-bold text-sm text-slate-900 mt-0.5">{req.facility_name}</h4>
                      <span className="text-xs text-slate-500 font-mono">Bay {req.bay_number}</span>
                    </div>
                    <Badge variant="warning">Action Required</Badge>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Customer:</span>
                      <span className="font-medium text-slate-800">
                        {req.customer_first_name} {req.customer_last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Requested Extension:</span>
                      <span className="font-bold text-emerald-700 font-mono">+{req.requested_additional_hours} Hour(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Additional Charge:</span>
                      <span className="font-bold text-slate-900 font-mono">${((req.additional_price_cents || 500) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current End Time:</span>
                      <span className="font-mono text-slate-700">{new Date(req.end_time_utc).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      disabled={actionInProgress === req.id}
                      onClick={() => handleDecision(req.id, 'APPROVE')}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve Extension
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
                      disabled={actionInProgress === req.id}
                      onClick={() => handleDecision(req.id, 'REJECT')}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Historical Decision Log */}
        {pastRequests.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Resolved Extension History ({pastRequests.length})
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Request ID</th>
                    <th className="p-3">Facility &amp; Bay</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Decision Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-slate-500">{r.id}</td>
                      <td className="p-3 font-medium text-slate-800">
                        {r.facility_name} ({r.bay_number})
                      </td>
                      <td className="p-3 text-slate-600">
                        {r.customer_first_name} {r.customer_last_name}
                      </td>
                      <td className="p-3 font-mono font-medium text-slate-700">+{r.requested_additional_hours}h</td>
                      <td className="p-3">
                        <Badge variant={r.status === 'APPROVED' ? 'success' : 'neutral'}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right text-slate-500 font-mono">
                        {r.decision_at_utc ? new Date(r.decision_at_utc).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
