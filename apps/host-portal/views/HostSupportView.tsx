import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser, ParkingLocation } from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostSupportViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostSupportView: React.FC<HostSupportViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';
  const [disputes, setDisputes] = useState<any[]>([]);
  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDispute, setNewDispute] = useState({
    category: 'OVERSTAY',
    facilityId: '',
    bookingId: '',
    description: '',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const [dispRes, facRes] = await Promise.all([
        apiClient.getHostDisputes(hostId),
        apiClient.getHostFacilities(hostId).catch(() => []),
      ]);
      setDisputes(dispRes);
      setFacilities(facRes);
      if (facRes.length > 0 && !newDispute.facilityId) {
        setNewDispute((prev) => ({ ...prev, facilityId: facRes[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load support disputes:', err);
      setFeedback({ type: 'error', message: err.message || 'Could not load disputes' });
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDispute.description.trim()) return;

    try {
      await apiClient.createHostDispute(hostId, newDispute);
      setShowModal(false);
      setNewDispute({ category: 'OVERSTAY', facilityId: facilities[0]?.id || '', bookingId: '', description: '' });
      setFeedback({ type: 'success', message: 'Support dispute opened and assigned a mediator.' });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit dispute' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F3] text-[#132A24] font-sans">
      <header className="h-16 bg-[#12211C] border-b border-[#1e342d] px-8 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center">
            H
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">Host Studio</span>
            <span className="text-[10px] text-emerald-400 block -mt-0.5">Support &amp; Dispute Mediation</span>
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

      <HostSubNav activeSection="support" onNavigate={onNavigate} />

      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-6 h-6 text-emerald-600" />
              Support &amp; Operational Disputes
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Mediation for driver overstay, gate access issues, vehicle damage, or account support.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Open Dispute / Ticket
            </Button>
            <Button variant="secondary" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
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

        {disputes.length === 0 ? (
          <Card className="p-8 text-center bg-white border-slate-200">
            <ShieldAlert className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-70" />
            <h3 className="font-bold text-sm text-slate-800">No Active Disputes</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              You currently have no open disputes or unresolved support claims. If an overstay or operational issue occurs, click &ldquo;Open Dispute / Ticket&rdquo;.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => (
              <Card key={d.id} className="p-5 bg-white border-slate-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-slate-500">{d.id}</span>
                    <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                      {d.category.replace('_', ' ')}: {d.facility_name || 'Host Account'}
                    </h4>
                  </div>
                  <Badge variant={d.status === 'RESOLVED' ? 'success' : 'warning'}>
                    {d.status}
                  </Badge>
                </div>

                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {d.description}
                </p>

                {d.resolution_notes && (
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-emerald-800">Resolution Notes:</span>
                    <p className="text-slate-700">{d.resolution_notes}</p>
                  </div>
                )}

                <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-1">
                  <span>Logged: {d.created_at_utc ? new Date(d.created_at_utc).toLocaleString() : ''}</span>
                  {d.booking_id && <span>Booking Ref: {d.booking_id}</span>}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-base text-slate-900">Open Dispute / Support Ticket</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Issue Category</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                    value={newDispute.category}
                    onChange={(e) => setNewDispute({ ...newDispute, category: e.target.value })}
                  >
                    <option value="OVERSTAY">Driver Overstay / Non-departure</option>
                    <option value="UNAUTHORIZED_PARKING">Unauthorized Vehicle in Bay</option>
                    <option value="DAMAGE_CLAIM">Facility Damage / Incident</option>
                    <option value="GATE_FAILURE">Access Control / Gate Malfunction</option>
                    <option value="BILLING_PAYOUT">Payout / Commission Inquiry</option>
                    <option value="OTHER">Other Operational Issue</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Facility</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                    value={newDispute.facilityId}
                    onChange={(e) => setNewDispute({ ...newDispute, facilityId: e.target.value })}
                  >
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Booking Reference ID (Optional)</label>
                  <Input
                    placeholder="e.g. bk-2026-9810"
                    value={newDispute.bookingId}
                    onChange={(e) => setNewDispute({ ...newDispute, bookingId: e.target.value })}
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Detailed Description</label>
                  <textarea
                    rows={4}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                    placeholder="Describe the incident, timestamps, and requested remedy..."
                    value={newDispute.description}
                    onChange={(e) => setNewDispute({ ...newDispute, description: e.target.value })}
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    Submit Dispute
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
