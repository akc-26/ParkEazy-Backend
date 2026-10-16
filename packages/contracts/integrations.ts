/**
 * Admin-Managed Integrations & Payment Provider Contracts for ParkEazy
 * All sensitive keys are masked before sending to the client.
 */

export type IntegrationCategory = 'PAYMENT' | 'MAPS' | 'SMS' | 'EMAIL' | 'STORAGE';

export enum IntegrationStatus {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  TEST_MODE = 'TEST_MODE',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface IntegrationConfig {
  id: string;
  provider: 'STRIPE' | 'RAZORPAY' | 'MOCK_PAYMENT' | 'GOOGLE_MAPS' | 'TWILIO_SMS' | 'SENDGRID_EMAIL' | 'S3_STORAGE';
  name: string;
  category: IntegrationCategory;
  description: string;
  enabled: boolean;
  mode: 'test' | 'live';
  status: IntegrationStatus;
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
}

export interface TestConnectionResult {
  success: boolean;
  status: IntegrationStatus;
  latencyMs: number;
  message: string;
  testedAtUtc: string;
  testType: 'SIMULATED' | 'REAL_PROBE';
  isSimulation: boolean;
}

export interface ActivePaymentGatewayConfig {
  activeProvider: 'STRIPE' | 'RAZORPAY' | 'MOCK_PAYMENT';
  fallbackToMockInDev: boolean;
  allowCashOnArrival: boolean;
}
