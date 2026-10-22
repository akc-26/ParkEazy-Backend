import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Key,
  ShieldCheck,
  Zap,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Lock,
  Radio,
  Sliders,
  Check,
  History,
  Mail,
  MessageSquare,
  MapPin,
  HardDrive,
  FileText,
  X,
} from 'lucide-react';
import { Card, Button, Badge, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  IntegrationConfig,
  IntegrationStatus,
  ActivePaymentGatewayConfig,
  IntegrationAuditRecord,
} from '../../../packages/contracts';

export const IntegrationsManager: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [activeGateway, setActiveGateway] = useState<ActivePaymentGatewayConfig | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<
      string,
      {
        message: string;
        success: boolean;
        latencyMs?: number;
        testType?: 'SIMULATED' | 'REAL_PROBE';
        isSimulation?: boolean;
      }
    >
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

  // Form states for replacing credentials & operational settings
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [fromEmailInput, setFromEmailInput] = useState('');
  const [fromNumberInput, setFromNumberInput] = useState('');
  const [modeInput, setModeInput] = useState<'test' | 'live'>('test');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Audit history state
  const [auditHistory, setAuditHistory] = useState<IntegrationAuditRecord[]>([]);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [configs, gateway] = await Promise.all([
        apiClient.getIntegrations(),
        apiClient.getActiveGateway(),
      ]);
      setIntegrations(configs);
      setActiveGateway(gateway);
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditHistory = async (providerId?: string) => {
    setLoadingAudit(true);
    try {
      const logs = await apiClient.getIntegrationAuditHistory(providerId);
      setAuditHistory(logs);
      setShowAuditModal(true);
    } catch (err) {
      console.error('Failed to load audit history:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSwitchActiveGateway = async (provider: 'STRIPE' | 'RAZORPAY' | 'MOCK_PAYMENT') => {
    try {
      const updated = await apiClient.setActiveGateway(provider);
      setActiveGateway(updated);
      setSaveSuccessMsg(`Active marketplace payment provider switched to ${provider}.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to switch active gateway');
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await apiClient.testIntegration(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          message: res.message,
          success: res.success,
          latencyMs: res.latencyMs,
          testType: res.testType,
          isSimulation: res.isSimulation,
        },
      }));
      // Refresh integration status
      const configs = await apiClient.getIntegrations();
      setIntegrations(configs);
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { message: err.message || 'Connection test failed', success: false },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenEdit = (integ: IntegrationConfig) => {
    setEditingId(integ.id);
    setApiKeyInput('');
    setSecretKeyInput('');
    setWebhookSecretInput('');
    setFromEmailInput(integ.operationalSettings?.fromEmail || '');
    setFromNumberInput(integ.operationalSettings?.fromNumber || '');
    setModeInput(integ.mode);
  };

  const handleSaveCredentials = async (id: string) => {
    setIsSaving(true);
    try {
      const operationalSettings: Record<string, any> = {};
      if (fromEmailInput.trim()) operationalSettings.fromEmail = fromEmailInput.trim();
      if (fromNumberInput.trim()) operationalSettings.fromNumber = fromNumberInput.trim();

      await apiClient.updateIntegration(id, {
        apiKey: apiKeyInput.trim() || undefined,
        secretKey: secretKeyInput.trim() || undefined,
        webhookSecret: webhookSecretInput.trim() || undefined,
        mode: modeInput,
        operationalSettings: Object.keys(operationalSettings).length > 0 ? operationalSettings : undefined,
      });

      setSaveSuccessMsg(`Configuration for ${id.toUpperCase()} safely updated and encrypted.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
      setEditingId(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEnabled = async (integ: IntegrationConfig) => {
    try {
      await apiClient.updateIntegration(integ.id, {
        enabled: !integ.enabled,
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle integration.');
    }
  };

  const handleCopyWebhook = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    setCopiedWebhook(url);
    setTimeout(() => setCopiedWebhook(null), 2500);
  };

  const filteredIntegrations = integrations.filter((i) => {
    if (selectedCategory === 'ALL') return true;
    return i.category === selectedCategory;
  });

  return (
    <div className="space-y-8">
      {/* Header and Context Notice */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <span>Centralized Third-Party Configuration & Provider Vault</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage SendGrid, Twilio, Stripe, Razorpay, and storage adapters. Category B secrets are AES-256-GCM encrypted at rest on the server and never exposed in browser state.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAuditHistory()}
              isLoading={loadingAudit}
            >
              <History className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Audit Log
            </Button>
            <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Refresh
            </Button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 1. Active Platform Payment Provider Selection */}
      <Card padding="lg" className="border-blue-200 bg-gradient-to-r from-blue-50/60 to-white">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span>Platform Payment Gateway Router</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">
              Active Marketplace Driver Checkout Provider
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Select which gateway handles driver reservation authorization holds and automated payouts.
            </p>
          </div>

          <Badge variant="info">
            Current: {activeGateway?.activeProvider || 'MOCK_PAYMENT'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Option A: Internal Sandbox (Zero Keys Required) */}
          <button
            type="button"
            onClick={() => handleSwitchActiveGateway('MOCK_PAYMENT')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeGateway?.activeProvider === 'MOCK_PAYMENT'
                ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-900">
                  Sandbox Simulator
                </span>
                {activeGateway?.activeProvider === 'MOCK_PAYMENT' && (
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Zero third-party setup. Generates real ledger entries and simulates holds without live cards.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono font-semibold text-emerald-600">
              Stage 1 Default (Ready)
            </div>
          </button>

          {/* Option B: Stripe */}
          <button
            type="button"
            onClick={() => handleSwitchActiveGateway('STRIPE')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeGateway?.activeProvider === 'STRIPE'
                ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-900">Stripe Payments</span>
                {activeGateway?.activeProvider === 'STRIPE' && (
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Global credit/debit card holds, 3D Secure, and automated escrow deposit deductions.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono text-slate-500">
              Test & Live Mode Supported
            </div>
          </button>

          {/* Option C: Razorpay */}
          <button
            type="button"
            onClick={() => handleSwitchActiveGateway('RAZORPAY')}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
              activeGateway?.activeProvider === 'RAZORPAY'
                ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-xs'
                : 'border-slate-200 bg-white/70 hover:bg-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-slate-900">Razorpay Gateway</span>
                {activeGateway?.activeProvider === 'RAZORPAY' && (
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                UPI payments, net banking, and regional card settlement with webhook verification.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono text-slate-500">
              Test & Live Mode Supported
            </div>
          </button>
        </div>
      </Card>

      {/* 2. Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
        {[
          { id: 'ALL', label: 'All Providers' },
          { id: 'EMAIL', label: 'Email (SendGrid)' },
          { id: 'SMS', label: 'SMS (Twilio)' },
          { id: 'PAYMENT', label: 'Payment Gateways' },
          { id: 'MAPS', label: 'Maps & Geo' },
          { id: 'STORAGE', label: 'Cloud Storage' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              selectedCategory === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Integration Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredIntegrations.map((integ) => {
          const testRes = testResults[integ.id];
          const isEditing = editingId === integ.id;

          const getStatusBadge = () => {
            switch (integ.status) {
              case IntegrationStatus.CONNECTED:
                return <Badge variant="success">Connected</Badge>;
              case IntegrationStatus.TEST_MODE:
                return <Badge variant="info">Test Mode</Badge>;
              case IntegrationStatus.NOT_CONFIGURED:
              default:
                return <Badge variant="neutral">Not Configured</Badge>;
            }
          };

          const getCompletenessBadge = () => {
            switch (integ.completeness) {
              case 'FULLY_CONFIGURED':
                return <Badge variant="success">Fully Configured</Badge>;
              case 'PARTIALLY_CONFIGURED':
                return <Badge variant="warning">Partially Configured</Badge>;
              case 'NOT_CONFIGURED':
              default:
                return <Badge variant="neutral">Missing Secrets</Badge>;
            }
          };

          const getCategoryIcon = () => {
            switch (integ.category) {
              case 'EMAIL':
                return <Mail className="w-4 h-4 text-purple-600" />;
              case 'SMS':
                return <MessageSquare className="w-4 h-4 text-emerald-600" />;
              case 'PAYMENT':
                return <CreditCard className="w-4 h-4 text-blue-600" />;
              case 'MAPS':
                return <MapPin className="w-4 h-4 text-amber-600" />;
              case 'STORAGE':
                return <HardDrive className="w-4 h-4 text-indigo-600" />;
              default:
                return <Key className="w-4 h-4 text-slate-600" />;
            }
          };

          return (
            <Card key={integ.id} padding="lg" className="flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon()}
                      <h4 className="text-sm font-bold text-slate-900">{integ.name}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      {getStatusBadge()}
                      {getCompletenessBadge()}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      provider: {integ.provider} · mode: {integ.mode}
                    </div>
                  </div>

                  {/* Enable / Disable Switch */}
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={integ.enabled}
                      onChange={() => handleToggleEnabled(integ)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {integ.description}
                </p>

                {/* Masked Credentials & Operational Settings Display */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs mb-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Configuration Status
                  </div>

                  {/* Operational Category A settings */}
                  {integ.operationalSettings?.fromEmail && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">From Email (Category A):</span>
                      <span className="font-mono text-slate-700">
                        {integ.operationalSettings.fromEmail}
                      </span>
                    </div>
                  )}

                  {integ.operationalSettings?.fromNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">From Phone (Category A):</span>
                      <span className="font-mono text-slate-700">
                        {integ.operationalSettings.fromNumber}
                      </span>
                    </div>
                  )}

                  {/* Masked Category B secrets */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">API / Client Key:</span>
                    <span className="font-mono text-slate-700">
                      {integ.maskedApiKey || (
                        <span className="text-slate-400 italic">Unconfigured</span>
                      )}
                    </span>
                  </div>

                  {integ.maskedSecretKey !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Secret Key:</span>
                      <span className="font-mono text-slate-700">
                        {integ.maskedSecretKey || (
                          <span className="text-slate-400 italic">Unconfigured</span>
                        )}
                      </span>
                    </div>
                  )}

                  {integ.webhookUrl && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500 font-medium">Webhook Endpoint:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-600">
                          {integ.webhookUrl}
                        </span>
                        <button
                          onClick={() => handleCopyWebhook(integ.webhookUrl!)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500"
                          title="Copy full webhook URL"
                        >
                          {copiedWebhook === integ.webhookUrl ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Test Connection Result Box */}
                {testRes && (
                  <div
                    className={`p-3.5 rounded-xl text-xs mb-4 space-y-2 ${
                      testRes.success
                        ? 'bg-emerald-50/90 border border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/90 border border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                        {testRes.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <span>{testRes.success ? 'Verification Passed' : 'Verification Alert'}</span>
                      </div>
                      <Badge
                        variant={
                          testRes.isSimulation
                            ? 'neutral'
                            : testRes.success
                            ? 'success'
                            : 'danger'
                        }
                      >
                        {testRes.isSimulation ? 'SIMULATED TEST' : 'REAL PROVIDER PROBE'}
                      </Badge>
                    </div>

                    <div className="text-xs leading-relaxed text-slate-800">
                      {testRes.message}
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60 text-slate-500 font-mono">
                      <span>
                        Type:{' '}
                        {testRes.isSimulation
                          ? 'Internal Sandbox Mock'
                          : 'Live HTTPS Network Probe'}
                      </span>
                      {testRes.latencyMs !== undefined && (
                        <span>Round-trip: {testRes.latencyMs}ms</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Safe Credential Replacement Form Accordion */}
                {isEditing && (
                  <div className="p-4 bg-white border border-blue-200 rounded-xl mb-4 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Update Provider Settings</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">
                        AES-256-GCM Encrypted
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Environment Mode
                      </label>
                      <select
                        value={modeInput}
                        onChange={(e) => setModeInput(e.target.value as 'test' | 'live')}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="test">Test Mode (Sandbox / Non-live)</option>
                        <option value="live">Live Mode (Production Traffic)</option>
                      </select>
                    </div>

                    {/* Operational Category A fields */}
                    {integ.category === 'EMAIL' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Sender Email (Category A - Operational)
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. notifications@parkeazy.internal"
                          value={fromEmailInput}
                          onChange={(e) => setFromEmailInput(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg placeholder:text-slate-400"
                        />
                      </div>
                    )}

                    {integ.category === 'SMS' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Sender Phone Number (Category A - Operational)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. +15557275329"
                          value={fromNumberInput}
                          onChange={(e) => setFromNumberInput(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg placeholder:text-slate-400"
                        />
                      </div>
                    )}

                    {/* Category B Secret fields */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        API Key / Key ID / Account SID (Category B - Secret)
                      </label>
                      <input
                        type="text"
                        placeholder="Leave blank to preserve existing secret"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Secret Key / Auth Token (Category B - Secret)
                      </label>
                      <input
                        type="password"
                        placeholder="Leave blank to preserve existing secret"
                        value={secretKeyInput}
                        onChange={(e) => setSecretKeyInput(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Webhook Signing Secret (Category B - Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="e.g. whsec_... (optional)"
                        value={webhookSecretInput}
                        onChange={(e) => setWebhookSecretInput(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg placeholder:text-slate-400"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        isLoading={isSaving}
                        onClick={() => handleSaveCredentials(integ.id)}
                      >
                        Save Securely
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEdit(integ)}
                >
                  Configure Settings
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={testingId === integ.id}
                  onClick={() => handleTestConnection(integ.id)}
                >
                  Test Connection
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 4. Audit History Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Provider Configuration Audit Trail
                </h4>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {auditHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No configuration mutations recorded yet.
                </div>
              ) : (
                auditHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{item.action}</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(item.createdAtUtc).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px] flex items-center gap-2">
                      <span>Provider: <strong className="font-mono">{item.provider}</strong></span>
                      <span>·</span>
                      <span>Actor: <strong className="font-mono">{item.actorId}</strong></span>
                    </div>
                    {item.details && (
                      <div className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200">
                        {Boolean(item.details.changedSecretFields && item.details.changedSecretFields.length > 0) && (
                          <div>
                            Secret fields updated: [
                            {item.details.changedSecretFields!.join(', ')}]
                            <span className="text-emerald-600 text-[10px] ml-1">
                              (values redacted & encrypted)
                            </span>
                          </div>
                        )}
                        {Boolean(item.details.changedOperationalFields && item.details.changedOperationalFields.length > 0) && (
                          <div>
                            Operational fields updated: [
                            {item.details.changedOperationalFields!.join(', ')}]
                          </div>
                        )}
                        <div>Mode: {item.details.mode || 'unchanged'} · Status: {item.details.status || 'unchanged'}</div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-slate-200 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuditModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
