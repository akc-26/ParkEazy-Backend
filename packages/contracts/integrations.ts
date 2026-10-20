/**
 * Admin-Managed Integrations & Centralized Provider Contracts for ParkEazy
 * All sensitive keys are masked before sending to the client.
 * Enforces Category A (Operational), Category B (Secrets), and Category C (Bootstrap) classification.
 */

export type IntegrationCategory = 'PAYMENT' | 'MAPS' | 'SMS' | 'EMAIL' | 'STORAGE';

export type ConfigClassification =
  | 'CATEGORY_A_OPERATIONAL'
  | 'CATEGORY_B_SECRET'
  | 'CATEGORY_C_BOOTSTRAP';

export type ConfigCompleteness =
  | 'NOT_CONFIGURED'
  | 'PARTIALLY_CONFIGURED'
  | 'FULLY_CONFIGURED';

export enum IntegrationStatus {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  TEST_MODE = 'TEST_MODE',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface ProviderFieldSchema {
  field: string;
  label: string;
  classification: ConfigClassification;
  requiredForLive: boolean;
  description: string;
  valueType: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'url';
  defaultValue?: any;
  placeholder?: string;
}

export interface IntegrationConfig {
  id: string;
  provider:
    | 'STRIPE'
    | 'RAZORPAY'
    | 'MOCK_PAYMENT'
    | 'GOOGLE_MAPS'
    | 'TWILIO_SMS'
    | 'SENDGRID_EMAIL'
    | 'S3_STORAGE';
  name: string;
  category: IntegrationCategory;
  description: string;
  enabled: boolean;
  mode: 'test' | 'live';
  status: IntegrationStatus;
  completeness: ConfigCompleteness;
  fields?: ProviderFieldSchema[];
  operationalSettings?: Record<string, any>;
  maskedSecrets?: Record<string, string>;
  maskedApiKey?: string;
  maskedSecretKey?: string;
  maskedWebhookSecret?: string;
  webhookUrl?: string;
  lastTestedAtUtc?: string;
  lastTestMessage?: string;
  testType?: 'SIMULATED' | 'REAL_PROBE';
  isSimulation?: boolean;
  updatedAtUtc: string;
}

export interface UpdateIntegrationDto {
  enabled?: boolean;
  mode?: 'test' | 'live';
  apiKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  operationalSettings?: Record<string, any>;
  secrets?: Record<string, string>;
}

export interface TestConnectionResult {
  success: boolean;
  status: IntegrationStatus;
  latencyMs: number;
  message: string;
  testedAtUtc: string;
  testType: 'SIMULATED' | 'REAL_PROBE';
  isSimulation: boolean;
  details?: Record<string, any>;
}

export interface ActivePaymentGatewayConfig {
  activeProvider: 'STRIPE' | 'RAZORPAY' | 'MOCK_PAYMENT';
  fallbackToMockInDev: boolean;
  allowCashOnArrival: boolean;
}

export interface IntegrationAuditRecord {
  id: string;
  correlationId?: string;
  actorId: string;
  action: 'UPDATE_INTEGRATION_CONFIG' | 'TEST_INTEGRATION_CONNECTION' | 'SWITCH_PAYMENT_GATEWAY';
  resourceType: 'INTEGRATION';
  resourceId: string;
  provider: string;
  details: {
    enabled?: boolean;
    mode?: 'test' | 'live';
    status?: IntegrationStatus;
    completeness?: ConfigCompleteness;
    changedOperationalFields?: string[];
    changedSecretFields?: string[];
    [key: string]: any;
  };
  createdAtUtc: string;
}
