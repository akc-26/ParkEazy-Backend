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
} from 'lucide-react';
import { Card, Button, Badge, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  IntegrationConfig,
  IntegrationStatus,
  ActivePaymentGatewayConfig,
} from '../../../packages/contracts';

export const IntegrationsManager: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [activeGateway, setActiveGateway] = useState<ActivePaymentGatewayConfig | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { message: string; success: boolean; latencyMs?: number }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState<string | null>(null);

  // Form states for replacing credentials
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [modeInput, setModeInput] = useState<'test' | 'live'>('test');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

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
        [id]: { message: res.message, success: res.success, latencyMs: res.latencyMs },
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
    setModeInput(integ.mode);
  };

  const handleSaveCredentials = async (id: string) => {
    setIsSaving(true);
    try {
      await apiClient.updateIntegration(id, {
        apiKey: apiKeyInput.trim() || undefined,
        secretKey: secretKeyInput.trim() || undefined,
        webhookSecret: webhookSecretInput.trim() || undefined,
        mode: modeInput,
      });

      setSaveSuccessMsg(`Credentials for ${id.toUpperCase()} safely updated and encrypted.`);
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Settings & Third-Party Integrations
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select and configure payment gateways, location services, and notification adapters. Sensitive keys are encrypted at rest on the backend and never exposed in browser state.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} isLoading={isLoading}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh Status
          </Button>
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
              Active Driver Checkout Provider
            </h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Select which gateway processes 10-minute hold authorizations and customer checkout in the marketplace.
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
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200 w-fit">
        {[
          { id: 'ALL', label: 'All Adapters' },
          { id: 'PAYMENT', label: 'Payment Gateways' },
          { id: 'MAPS', label: 'Maps & Geo' },
          { id: 'SMS', label: 'Phone & SMS' },
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

          return (
            <Card key={integ.id} padding="lg" className="flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{integ.name}</h4>
                      {getStatusBadge()}
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

                {/* Masked Credentials Display */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">API / Client Key:</span>
                    <span className="font-mono text-slate-700">
                      {integ.maskedApiKey || (
                        <span className="text-slate-400 italic">None provided (Not configured)</span>
                      )}
                    </span>
                  </div>

                  {integ.maskedSecretKey !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Secret Key:</span>
                      <span className="font-mono text-slate-700">
                        {integ.maskedSecretKey || (
                          <span className="text-slate-400 italic">None provided</span>
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
                    className={`p-3 rounded-lg text-xs mb-4 flex items-start gap-2 ${
                      testRes.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-amber-50 border border-amber-200 text-amber-800'
                    }`}
                  >
                    {testRes.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div>{testRes.message}</div>
                      {testRes.latencyMs !== undefined && (
                        <div className="font-mono text-[11px] opacity-80 mt-0.5">
                          Probe latency: {testRes.latencyMs}ms
                        </div>
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
                        <span>Update Provider Credentials</span>
                      </span>
                      <span className="text-[10px] text-slate-400">Encrypted on Server</span>
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
                        <option value="live">Live Mode (Production Charges)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        API Key / Key ID
                      </label>
                      <input
                        type="text"
                        placeholder="Leave blank to preserve existing key"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                        Secret Key
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
                        Webhook Signing Secret
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
                  Configure Keys
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
    </div>
  );
};
