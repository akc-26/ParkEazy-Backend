import React, { useState, useEffect } from 'react';
import {
  Shield,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  Zap,
  Activity,
  History,
  UserCheck,
  CreditCard,
  MessageSquare,
  Lock,
  Unlock,
  Radio,
  FileText
} from 'lucide-react';
import { Facility, ThirdPartyProviderConfig, AuditLog, User, DisputeTicket } from '../../types';
import { api } from '../../api';

interface AdminConsoleProps {
  currentUser: User;
  onRefreshAll?: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({ currentUser, onRefreshAll }) => {
  const [activeTab, setActiveTab] = useState<'moderation' | 'providers' | 'hosts' | 'disputes' | 'audit'>('moderation');

  // Facilities Moderation
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Third-Party Providers
  const [providers, setProviders] = useState<ThirdPartyProviderConfig[]>([]);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; latencyMs: number; message: string }>>({});

  // Hosts
  const [hosts, setHosts] = useState<User[]>([]);

  // Disputes
  const [disputes, setDisputes] = useState<DisputeTicket[]>([]);
  const [disputeNotes, setDisputeNotes] = useState('');
  const [disputeRefund, setDisputeRefund] = useState('25.00');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'moderation') {
        const facs = await api.getAdminFacilities();
        setFacilities(facs);
      } else if (activeTab === 'providers') {
        const provs = await api.getProviders();
        setProviders(provs);
      } else if (activeTab === 'hosts') {
        const hs = await api.getAdminHosts();
        setHosts(hs);
      } else if (activeTab === 'disputes') {
        const disps = await api.getDisputes();
        setDisputes(disps);
      } else if (activeTab === 'audit') {
        const logs = await api.getAuditLogs();
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModerate = async (facilityId: string, approved: boolean) => {
    const notes = moderationNotes[facilityId] || (approved ? 'Facility passed compliance and gate clearance inspection.' : 'Missing required emergency access documentation.');
    try {
      setActionLoading(facilityId);
      await api.moderateFacility(facilityId, approved, notes);
      await loadData();
      onRefreshAll?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleProvider = async (provider: ThirdPartyProviderConfig) => {
    try {
      await api.updateProvider(provider.id, { isEnabled: !provider.isEnabled });
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    try {
      setTestingProviderId(providerId);
      const res = await api.testProvider(providerId);
      setTestResult(prev => ({ ...prev, [providerId]: res }));
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTestingProviderId(null);
    }
  };

  const handleToggleHostStatus = async (hostId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.updateHostStatus(hostId, nextStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveDispute = async (disputeId: string, decision: string) => {
    try {
      await api.resolveDispute(
        disputeId,
        decision,
        decision === 'resolved_refunded' ? parseFloat(disputeRefund) : 0,
        disputeNotes || 'Admin reviewed telemetry and processed resolution'
      );
      await loadData();
      alert('Dispute resolved successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin Title Banner */}
      <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
              System Administrator Mode
            </span>
            <span className="text-xs text-slate-400">Authority: Level 1 Superuser</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            ParkEazy Governance & Moderation Console
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Review host submissions, manage third-party integration gateways, resolve disputes, and audit immutable system transactions.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'moderation' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Moderation ({facilities.filter(f => f.status === 'under_review').length})
          </button>
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'providers' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Integrations
          </button>
          <button
            onClick={() => setActiveTab('hosts')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'hosts' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Hosts
          </button>
          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'disputes' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Disputes ({disputes.filter(d => d.status === 'open').length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              activeTab === 'audit' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Audit Logs
          </button>
        </div>
      </div>

      {/* Tab 1: Moderation Queue */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Reviewing facilities submitted by host operators</span>
            <span>All status changes trigger automatic host notifications</span>
          </div>

          <div className="space-y-4">
            {facilities.map(fac => {
              const isPending = fac.status === 'under_review';
              return (
                <div
                  key={fac.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all ${
                    isPending ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-base">{fac.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                            fac.status === 'approved' || fac.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : fac.status === 'under_review'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {fac.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        {fac.address}, {fac.city}, {fac.state} · Host ID: <span className="font-mono">{fac.hostId}</span>
                      </div>

                      <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                        {fac.description}
                      </p>

                      <div className="flex flex-wrap gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span>Total Bays: <strong>{fac.totalBays}</strong></span>
                        <span>Clearance: <strong>{fac.clearanceHeightMeters}m</strong></span>
                        <span>Gate Type: <strong className="capitalize">{fac.gateType.replace(/_/g, ' ')}</strong></span>
                        <span>Hours: <strong>{fac.operatingHours.is24x7 ? '24/7' : 'Standard'}</strong></span>
                      </div>
                    </div>

                    {/* Moderation Controls */}
                    <div className="w-full md:w-80 space-y-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Reviewer Feedback Note
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Approved after inspection / Missing permit"
                          value={moderationNotes[fac.id] || ''}
                          onChange={e => setModerationNotes({ ...moderationNotes, [fac.id]: e.target.value })}
                          className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          disabled={actionLoading === fac.id}
                          onClick={() => handleModerate(fac.id, true)}
                          className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          disabled={actionLoading === fac.id}
                          onClick={() => handleModerate(fac.id, false)}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Third-Party Provider Integrations */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Third-Party Service Providers & Cloud Gateways
            </h3>
            <p className="text-xs text-slate-500">
              Admin-managed configuration for parking barrier controllers, payment gateways, payouts, mapping, communications, and media storage. Secrets are securely masked.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map(prov => (
              <div
                key={prov.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                      {prov.category.replace(/_/g, ' ')}
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">{prov.name}</h4>
                    <span className="text-xs text-slate-400">{prov.provider}</span>
                  </div>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleToggleProvider(prov)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      prov.isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        prov.isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Masked Settings */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-mono space-y-1.5">
                  {Object.entries(prov.settings).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-sans">{key}:</span>
                      <span className="text-slate-800 font-semibold">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Diagnostics & Test Connection */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px]">
                    {prov.testMessage ? (
                      <span className="text-slate-600 flex items-center gap-1 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {prov.testMessage}
                      </span>
                    ) : (
                      <span className="text-slate-400">Not tested in this session</span>
                    )}
                  </div>

                  <button
                    disabled={testingProviderId === prov.id}
                    onClick={() => handleTestProvider(prov.id)}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>{testingProviderId === prov.id ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Hosts Management */}
      {activeTab === 'hosts' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Registered Parking Hosts</h3>
            <p className="text-xs text-slate-500">Commercial operators and verified facility partners.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Host Name</th>
                  <th className="py-3 px-4">Business Entity</th>
                  <th className="py-3 px-4">Tax ID / Reg #</th>
                  <th className="py-3 px-4">Payout Account</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hosts.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {h.fullName}
                      <div className="text-[11px] text-slate-400 font-normal">{h.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {h.businessDetails?.businessName || 'Individual Host'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {h.businessDetails?.taxId || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      {h.businessDetails?.payoutBankName} ({h.businessDetails?.payoutAccountNumber})
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                          h.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleHostStatus(h.id, h.status)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                          h.status === 'active'
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {h.status === 'active' ? 'Suspend Host' : 'Activate Host'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Disputes & Support */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Customer Support & Dispute Mediation
            </h3>
            <p className="text-xs text-slate-500">
              Review driver complaints (barrier gate failures, occupied bays) and issue authorized refunds with automated ledger debits.
            </p>
          </div>

          <div className="space-y-3">
            {disputes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
                No disputes filed yet. All customer sessions are operating normally.
              </div>
            ) : (
              disputes.map(d => (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-900 text-sm">{d.ticketNumber}</span>
                      <span className="text-xs text-slate-400 ml-2">Booking: {d.bookingId}</span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                        d.status.startsWith('resolved') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {d.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-900 block mb-1">
                      Reason: <span className="capitalize">{d.reason.replace(/_/g, ' ')}</span>
                    </span>
                    "{d.customerStatement}"
                  </div>

                  {d.status === 'open' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Refund Amount ($):</span>
                        <input
                          type="number"
                          step="0.5"
                          value={disputeRefund}
                          onChange={e => setDisputeRefund(e.target.value)}
                          className="w-20 px-2 py-1 border border-slate-300 rounded-lg font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleResolveDispute(d.id, 'resolved_dismissed')}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                        >
                          Dismiss Dispute
                        </button>
                        <button
                          onClick={() => handleResolveDispute(d.id, 'resolved_refunded')}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs"
                        >
                          Approve Refund & Debit Host
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Immutable Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Immutable System Audit Trail</h3>
            <span className="text-xs text-slate-400 font-mono">Forensic Activity Log</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-800">
                      {log.actorName} ({log.actorRole})
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900">
                      {log.action}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-700 max-w-sm truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
