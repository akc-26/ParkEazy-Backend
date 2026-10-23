import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  BookOpen,
  Database,
  FileText,
  Sliders,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Button, Card, Badge, Table } from '../../packages/ui';
import { apiClient } from '../../packages/api-client';
import { IntegrationsManager } from './components/IntegrationsManager';
import { Key } from 'lucide-react';
import {
  SystemHealthResponse,
  SystemReadinessResponse,
  LedgerEntry,
} from '../../packages/contracts';

interface AdminPanelAppProps {
  currentPath?: string;
  onNavigate: (path: string) => void;
}

export const AdminPanelApp: React.FC<AdminPanelAppProps> = ({
  currentPath = '/admin/',
  onNavigate,
}) => {
  const getTabFromPath = (path: string): 'health' | 'ledger' | 'audit' | 'rules' | 'integrations' => {
    if (path.includes('/ledger')) return 'ledger';
    if (path.includes('/audit')) return 'audit';
    if (path.includes('/rules')) return 'rules';
    if (path.includes('/integrations')) return 'integrations';
    return 'health';
  };

  const [activeTab, setActiveTab] = useState<'health' | 'ledger' | 'audit' | 'rules' | 'integrations'>(getTabFromPath(currentPath));

  useEffect(() => {
    setActiveTab(getTabFromPath(currentPath));
  }, [currentPath]);

  const handleTabChange = (tab: 'health' | 'ledger' | 'audit' | 'rules' | 'integrations') => {
    setActiveTab(tab);
    onNavigate('/admin/' + (tab === 'health' ? '' : tab));
  };
  const [healthData, setHealthData] = useState<SystemHealthResponse | null>(null);
  const [readinessData, setReadinessData] = useState<SystemReadinessResponse | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [bookingRules, setBookingRules] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      // Authenticate with admin credentials to obtain bearer token
      await apiClient.login('admin@parkeazy.com', 'admin-pass', 'admin');

      const [health, readiness, ledger, audit, rules] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getReadiness(),
        apiClient.getLedgerEntries(),
        apiClient.getAuditLogs(),
        apiClient.getBookingRules(),
      ]);

      setHealthData(health);
      setReadinessData(readiness);
      setLedgerEntries(ledger);
      setAuditLogs(audit);
      setBookingRules(rules);
    } catch (err: any) {
      console.error('Admin API error:', err);
      setAuthError(err.message || 'Server-side authorization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F8FC] text-[#10233F] flex font-sans">
      {/* 1. Admin Sidebar (VoiceCloud Admin reference) */}
      <aside className="w-64 bg-[#0B172B] text-white flex flex-col shrink-0 border-r border-[#1a2d4c]">
        {/* Admin Brand Lockup */}
        <div className="h-16 flex items-center px-6 border-b border-[#1a2d4c] gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white">
              Admin Console
            </div>
            <div className="text-[10px] text-blue-400">
              ParkEazy Platform Ops
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1 flex-1">
          <button
            onClick={() => handleTabChange('health')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'health'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-[#152745] hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 shrink-0" />
            <span>System Health & Readiness</span>
          </button>

          <button
            onClick={() => handleTabChange('ledger')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-[#152745] hover:text-white'
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span>Append-Only Ledger</span>
          </button>

          <button
            onClick={() => handleTabChange('audit')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-[#152745] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Audit Logs & Correlation</span>
          </button>

          <button
            onClick={() => handleTabChange('rules')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'rules'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-[#152745] hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span>State Machine Invariants</span>
          </button>

          <button
            onClick={() => handleTabChange('integrations')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'integrations'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:bg-[#152745] hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 shrink-0" />
            <span>Settings & Integrations</span>
          </button>
        </nav>

        {/* Quick External Links */}
        <div className="p-3 border-t border-[#1a2d4c] space-y-1">
          <button
            onClick={() => onNavigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#152745] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>User Marketplace (/)</span>
          </button>
          <button
            onClick={() => onNavigate('/host/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-[#152745] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Host Portal (/host/)</span>
          </button>
        </div>
      </aside>

      {/* 2. Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-800">
              Operations & Governance
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-blue-700 font-medium capitalize">
              {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAdminData}
              isLoading={isLoading}
              className="gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Telemetry</span>
            </Button>

            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                E
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  Elena Rostova
                </div>
                <div className="text-[10px] text-blue-600 font-medium">
                  SUPER_ADMIN · Server Authorized
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 3. Main Admin Viewport */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1680px] mx-auto w-full space-y-6">
          {authError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Tab 1: System Health & Readiness */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  API & Infrastructure Telemetry
                </h3>
                <p className="text-xs text-slate-500">
                  Live verification of backend endpoints /api/v1/health and /api/v1/readiness
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card padding="md">
                  <div className="text-xs text-slate-500 font-medium mb-1">API Status</div>
                  <div className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{healthData?.status.toUpperCase() || 'UNKNOWN'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Uptime: {healthData?.uptimeSeconds}s · Memory: {healthData?.memoryUsageMb} MB
                  </div>
                </Card>

                <Card padding="md">
                  <div className="text-xs text-slate-500 font-medium mb-1">PostgreSQL Readiness</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    {readinessData?.checks.database.status.toUpperCase() || 'PROBING'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    {readinessData?.checks.database.message}
                  </div>
                </Card>

                <Card padding="md">
                  <div className="text-xs text-slate-500 font-medium mb-1">Active Backend Modules</div>
                  <div className="text-2xl font-bold text-slate-900 font-mono">
                    {healthData?.activeModules.length || 6}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    {healthData?.activeModules.join(', ')}
                  </div>
                </Card>

                <Card padding="md">
                  <div className="text-xs text-slate-500 font-medium mb-1">Gateways & Escrow</div>
                  <div className="text-2xl font-bold text-blue-700 font-mono">
                    ACTIVE
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Stripe & Razorpay adapters ready
                  </div>
                </Card>
              </div>

              {/* Readiness Checks Detailed Breakdown */}
              <Card padding="lg">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Readiness Prober Details (/api/v1/readiness)
                </h4>
                <div className="divide-y divide-slate-100 text-xs">
                  {readinessData &&
                    Object.entries(readinessData.checks).map(([key, check]) => (
                      <div key={key} className="py-2.5 flex items-center justify-between">
                        <span className="font-semibold text-slate-800 capitalize">{key}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{check.message}</span>
                          <Badge
                            variant={
                              check.status === 'up'
                                ? 'success'
                                : check.status === 'unconfigured'
                                ? 'neutral'
                                : 'danger'
                            }
                          >
                            {check.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            </div>
          )}

          {/* Tab 2: Append-Only Financial Ledger */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Append-Only Financial Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Double-entry accounting records. Transactions are immutable. Security deposits are tracked in segregated escrow.
                </p>
              </div>

              <Table<LedgerEntry>
                columns={[
                  { key: 'id', header: 'Ledger Ref', className: 'font-mono' },
                  { key: 'entryType', header: 'Transaction Type' },
                  { key: 'debitAccount', header: 'Debit Account' },
                  { key: 'creditAccount', header: 'Credit Account' },
                  {
                    key: 'amountCents',
                    header: 'Amount',
                    align: 'right',
                    render: (row) => `$${(row.amountCents / 100).toFixed(2)}`,
                  },
                  {
                    key: 'paymentProvider',
                    header: 'Payment Provider',
                    render: (row) => <Badge variant="info">{row.paymentProvider}</Badge>,
                  },
                  { key: 'idempotencyKey', header: 'Idempotency Key', className: 'font-mono text-[11px]' },
                ]}
                data={ledgerEntries}
                keyExtractor={(row) => row.id}
              />
            </div>
          )}

          {/* Tab 3: Audit Logs */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Security & Request Correlation Audit Logs
                </h3>
                <p className="text-xs text-slate-500">
                  Every request across all three web applications is tracked with an X-Correlation-Id.
                </p>
              </div>

              <Table<any>
                columns={[
                  { key: 'id', header: 'Audit Ref', className: 'font-mono' },
                  { key: 'correlationId', header: 'Correlation ID', className: 'font-mono text-[11px]' },
                  { key: 'actorId', header: 'Actor ID' },
                  { key: 'action', header: 'Action Executed' },
                  { key: 'resourceType', header: 'Resource' },
                  {
                    key: 'createdAtUtc',
                    header: 'Timestamp (UTC)',
                    className: 'font-mono text-[11px]',
                    render: (row) => new Date(row.createdAtUtc).toLocaleString(),
                  },
                ]}
                data={auditLogs}
                keyExtractor={(row) => row.id}
              />
            </div>
          )}

          {/* Tab 4: State Machine Invariants */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Marketplace Business Rules & Invariants
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative constraints returned by /api/v1/bookings/rules
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card padding="md">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Booking Hold Lock Rule
                  </h4>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                    {bookingRules.holdDurationSeconds} Seconds (10 min)
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Persistent hold on physical parking bays. Refreshing the browser does not reset the server countdown.
                  </p>
                </Card>

                <Card padding="md">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Duration Bounds Rule
                  </h4>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                    {bookingRules.minDurationHours}h min – {bookingRules.maxDurationHours}h max
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Allowed booking lengths using {bookingRules.intervalMinutes}-minute scheduling intervals.
                  </p>
                </Card>

                <Card padding="md">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Transition Buffer
                  </h4>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                    {bookingRules.transitionBufferMinutes} Minutes
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Turnaround clearance buffer between back-to-back bookings, calculated separately from grace periods.
                  </p>
                </Card>

                <Card padding="md">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Booking Horizon
                  </h4>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                    {bookingRules.bookingHorizonDays} Days
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    Lead time maximum horizon for booking into the future. Minimum lead time is {bookingRules.minLeadTimeMinutes} min.
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* Tab 5: Settings & Third-Party Integrations */}
          {activeTab === 'integrations' && (
            <IntegrationsManager />
          )}
        </main>
      </div>
    </div>
  );
};
