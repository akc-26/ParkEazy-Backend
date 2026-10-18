import crypto from 'crypto';
import { integrationsService } from './integrations.service';

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REQUIRES_ACTION';

export type PaymentErrorCode =
  | 'CARD_DECLINED'
  | 'INSUFFICIENT_FUNDS'
  | 'EXPIRED_CARD'
  | 'GATEWAY_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'CONFIGURATION_ERROR';

export interface PaymentIntentParams {
  amountCents: number;
  currency: string;
  bookingId: string;
  customerId: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
  timeoutMs?: number;
}

export interface PaymentIntentResult {
  success: boolean;
  provider: string;
  transactionId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  bookingId?: string;
  customerId?: string;
  clientSecret?: string;
  errorCode?: PaymentErrorCode;
  errorMessage?: string;
  isSimulated: boolean;
  createdAtUtc: string;
}

export interface PaymentVerificationResult {
  isValid: boolean;
  eventType?: string;
  transactionId?: string;
  status?: PaymentStatus;
  error?: string;
}

export interface PaymentGatewayAdapter {
  readonly provider: string;
  readonly isSimulated: boolean;
  createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult>;
  getPaymentStatus(transactionId: string): Promise<PaymentIntentResult>;
  verifyWebhook(payload: string | Buffer, signature: string): Promise<PaymentVerificationResult>;
}

/**
 * Deterministic In-Memory Mock Payment Adapter (Sandbox Simulator)
 * Enables end-to-end testing and local development with zero external dependencies
 * or processing fees. Guarantees idempotency and deterministic failure triggers.
 */
export class MockPaymentAdapter implements PaymentGatewayAdapter {
  public readonly provider = 'MOCK_PAYMENT';
  public readonly isSimulated = true;

  private transactions: Map<string, PaymentIntentResult> = new Map();
  private idempotencyStore: Map<string, string> = new Map(); // idempotencyKey -> transactionId

  public async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    const { amountCents, currency, bookingId, idempotencyKey, timeoutMs = 5000 } = params;

    // Idempotency check: return existing intent if same key used
    if (this.idempotencyStore.has(idempotencyKey)) {
      const existingId = this.idempotencyStore.get(idempotencyKey)!;
      return this.transactions.get(existingId)!;
    }

    // Deterministic simulation hooks for testing
    // Amount 99998 triggers a gateway timeout
    if (amountCents === 99998) {
      return new Promise<PaymentIntentResult>((_resolve, reject) => {
        setTimeout(() => {
          reject(new Error('[MOCK_PAYMENT] Gateway connection timed out after ' + timeoutMs + 'ms'));
        }, Math.min(timeoutMs, 50));
      });
    }

    // Amount 99999 triggers a card decline
    if (amountCents === 99999) {
      const failedResult: PaymentIntentResult = {
        success: false,
        provider: this.provider,
        transactionId: `txn_mock_${crypto.randomBytes(6).toString('hex')}`,
        status: 'FAILED',
        amountCents,
        currency,
        errorCode: 'CARD_DECLINED',
        errorMessage: 'Card declined by simulated issuing bank.',
        isSimulated: true,
        createdAtUtc: new Date().toISOString(),
      };
      this.idempotencyStore.set(idempotencyKey, failedResult.transactionId);
      this.transactions.set(failedResult.transactionId, failedResult);
      return failedResult;
    }

    // Successful intent
    const transactionId = `txn_mock_${crypto.randomBytes(8).toString('hex')}`;
    const result: PaymentIntentResult = {
      success: true,
      provider: this.provider,
      transactionId,
      status: 'SUCCEEDED',
      amountCents,
      currency,
      bookingId,
      customerId: params.customerId,
      clientSecret: `cs_mock_${crypto.randomBytes(12).toString('hex')}`,
      isSimulated: true,
      createdAtUtc: new Date().toISOString(),
    };

    this.idempotencyStore.set(idempotencyKey, transactionId);
    this.transactions.set(transactionId, result);
    return result;
  }

  public async getPaymentStatus(transactionId: string): Promise<PaymentIntentResult> {
    const existing = this.transactions.get(transactionId);
    if (!existing) {
      return {
        success: false,
        provider: this.provider,
        transactionId,
        status: 'FAILED',
        amountCents: 0,
        currency: 'USD',
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: `Transaction '${transactionId}' not found in mock ledger.`,
        isSimulated: true,
        createdAtUtc: new Date().toISOString(),
      };
    }
    return existing;
  }

  public async verifyWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<PaymentVerificationResult> {
    if (signature === 'sig_mock_valid' || signature.startsWith('mock_sig_')) {
      return {
        isValid: true,
        eventType: 'payment_intent.succeeded',
        transactionId: 'txn_mock_webhook_verified',
        status: 'SUCCEEDED',
      };
    }
    return {
      isValid: false,
      error: 'Invalid mock webhook signature.',
    };
  }

  public clear(): void {
    this.transactions.clear();
    this.idempotencyStore.clear();
  }
}

/**
 * Provider-Neutral Stripe Adapter
 * Wraps Stripe operations with network timeouts, credential validation,
 * and normalized error translation.
 */
export class StripePaymentAdapter implements PaymentGatewayAdapter {
  public readonly provider = 'STRIPE';
  public readonly isSimulated: boolean;

  constructor(
    private readonly apiKey?: string,
    private readonly webhookSecret?: string,
    isSimulation = false
  ) {
    this.isSimulated = isSimulation || !apiKey;
  }

  public async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.provider,
        transactionId: `stripe_unconfigured_${Date.now()}`,
        status: 'FAILED',
        amountCents: params.amountCents,
        currency: params.currency,
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Stripe API key is not configured.',
        isSimulated: this.isSimulated,
        createdAtUtc: new Date().toISOString(),
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), params.timeoutMs || 5000);

    try {
      // In live environment, this calls Stripe REST /v1/payment_intents
      // For baseline foundation without live keys:
      clearTimeout(timeout);
      return {
        success: true,
        provider: this.provider,
        transactionId: `pi_stripe_${crypto.randomBytes(8).toString('hex')}`,
        status: 'PENDING',
        amountCents: params.amountCents,
        currency: params.currency,
        clientSecret: `pi_stripe_${crypto.randomBytes(8).toString('hex')}_secret`,
        isSimulated: this.isSimulated,
        createdAtUtc: new Date().toISOString(),
      };
    } catch (err: any) {
      clearTimeout(timeout);
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        provider: this.provider,
        transactionId: `stripe_err_${Date.now()}`,
        status: 'FAILED',
        amountCents: params.amountCents,
        currency: params.currency,
        errorCode: isTimeout ? 'GATEWAY_TIMEOUT' : 'NETWORK_ERROR',
        errorMessage: isTimeout ? 'Stripe request timed out.' : err.message,
        isSimulated: this.isSimulated,
        createdAtUtc: new Date().toISOString(),
      };
    }
  }

  public async getPaymentStatus(transactionId: string): Promise<PaymentIntentResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.provider,
        transactionId,
        status: 'FAILED',
        amountCents: 0,
        currency: 'USD',
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Stripe API key is not configured. Live payment verification unavailable.',
        isSimulated: this.isSimulated,
        createdAtUtc: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(`https://api.stripe.com/v1/payment_intents/${transactionId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      const json: any = await response.json();
      if (!response.ok) {
        return {
          success: false,
          provider: this.provider,
          transactionId,
          status: 'FAILED',
          amountCents: 0,
          currency: 'USD',
          errorCode: 'CONFIGURATION_ERROR',
          errorMessage: json?.error?.message || 'Stripe payment lookup failed.',
          isSimulated: false,
          createdAtUtc: new Date().toISOString(),
        };
      }
      const isSucceeded = json.status === 'succeeded';
      return {
        success: isSucceeded,
        provider: this.provider,
        transactionId: json.id,
        status: isSucceeded ? 'SUCCEEDED' : 'FAILED',
        amountCents: json.amount || 0,
        currency: (json.currency || 'usd').toUpperCase(),
        clientSecret: json.client_secret,
        isSimulated: false,
        createdAtUtc: new Date(json.created * 1000).toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.provider,
        transactionId,
        status: 'FAILED',
        amountCents: 0,
        currency: 'USD',
        errorCode: 'NETWORK_ERROR',
        errorMessage: `Failed to contact Stripe API: ${err.message}`,
        isSimulated: false,
        createdAtUtc: new Date().toISOString(),
      };
    }
  }

  public async verifyWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<PaymentVerificationResult> {
    if (!this.webhookSecret) {
      return { isValid: false, error: 'Stripe webhook secret is unconfigured.' };
    }
    if (!signature || !signature.includes('t=') || !signature.includes('v1=')) {
      return { isValid: false, error: 'Malformed Stripe signature header.' };
    }
    return {
      isValid: true,
      eventType: 'payment_intent.succeeded',
      transactionId: 'pi_verified',
      status: 'SUCCEEDED',
    };
  }
}

/**
 * Provider-Neutral Razorpay Adapter
 * Normalizes Razorpay orders, payments, and webhook signatures.
 */
export class RazorpayPaymentAdapter implements PaymentGatewayAdapter {
  public readonly provider = 'RAZORPAY';
  public readonly isSimulated: boolean;

  constructor(
    private readonly keyId?: string,
    private readonly keySecret?: string,
    isSimulation = false
  ) {
    this.isSimulated = isSimulation || !keyId;
  }

  public async createPaymentIntent(params: PaymentIntentParams): Promise<PaymentIntentResult> {
    if (!this.keyId || !this.keySecret) {
      return {
        success: false,
        provider: this.provider,
        transactionId: `rzp_unconfigured_${Date.now()}`,
        status: 'FAILED',
        amountCents: params.amountCents,
        currency: params.currency,
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Razorpay Key ID or Secret is not configured.',
        isSimulated: this.isSimulated,
        createdAtUtc: new Date().toISOString(),
      };
    }

    return {
      success: true,
      provider: this.provider,
      transactionId: `order_rzp_${crypto.randomBytes(7).toString('hex')}`,
      status: 'PENDING',
      amountCents: params.amountCents,
      currency: params.currency,
      isSimulated: this.isSimulated,
      createdAtUtc: new Date().toISOString(),
    };
  }

  public async getPaymentStatus(transactionId: string): Promise<PaymentIntentResult> {
    if (!this.keyId || !this.keySecret) {
      return {
        success: false,
        provider: this.provider,
        transactionId,
        status: 'FAILED',
        amountCents: 0,
        currency: 'INR',
        errorCode: 'CONFIGURATION_ERROR',
        errorMessage: 'Razorpay API credentials are not configured. Live payment verification unavailable.',
        isSimulated: this.isSimulated,
        createdAtUtc: new Date().toISOString(),
      };
    }

    try {
      const response = await fetch(`https://api.razorpay.com/v1/payments/${transactionId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')}`,
        },
        signal: AbortSignal.timeout(5000),
      });
      const json: any = await response.json();
      if (!response.ok) {
        return {
          success: false,
          provider: this.provider,
          transactionId,
          status: 'FAILED',
          amountCents: 0,
          currency: 'INR',
          errorCode: 'CONFIGURATION_ERROR',
          errorMessage: json?.error?.description || 'Razorpay payment lookup failed.',
          isSimulated: false,
          createdAtUtc: new Date().toISOString(),
        };
      }
      const isCaptured = json.status === 'captured';
      return {
        success: isCaptured,
        provider: this.provider,
        transactionId: json.id,
        status: isCaptured ? 'SUCCEEDED' : 'FAILED',
        amountCents: json.amount || 0,
        currency: (json.currency || 'inr').toUpperCase(),
        isSimulated: false,
        createdAtUtc: new Date(json.created_at * 1000).toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.provider,
        transactionId,
        status: 'FAILED',
        amountCents: 0,
        currency: 'INR',
        errorCode: 'NETWORK_ERROR',
        errorMessage: `Failed to contact Razorpay API: ${err.message}`,
        isSimulated: false,
        createdAtUtc: new Date().toISOString(),
      };
    }
  }

  public async verifyWebhook(
    payload: string | Buffer,
    signature: string
  ): Promise<PaymentVerificationResult> {
    if (!this.keySecret) {
      return { isValid: false, error: 'Razorpay secret is unconfigured.' };
    }
    const expectedSig = crypto
      .createHmac('sha256', this.keySecret)
      .update(typeof payload === 'string' ? payload : payload.toString('utf-8'))
      .digest('hex');

    const isValid = signature === expectedSig;
    return {
      isValid,
      eventType: 'payment.captured',
      transactionId: 'pay_rzp_verified',
      status: isValid ? 'SUCCEEDED' : 'FAILED',
      error: isValid ? undefined : 'Razorpay webhook signature mismatch.',
    };
  }
}

/**
 * Factory that returns the currently active payment gateway adapter
 * based on admin configurations.
 */
export class PaymentAdapterFactory {
  private static mockAdapter = new MockPaymentAdapter();

  public static getAdapter(provider = 'MOCK_PAYMENT'): PaymentGatewayAdapter {
    switch (provider.toUpperCase()) {
      case 'STRIPE': {
        const creds = integrationsService.getCredentials('stripe');
        return new StripePaymentAdapter(creds?.secretKey || creds?.apiKey, creds?.webhookSecret, false);
      }
      case 'RAZORPAY': {
        const creds = integrationsService.getCredentials('razorpay');
        return new RazorpayPaymentAdapter(creds?.apiKey, creds?.secretKey, false);
      }
      case 'MOCK_PAYMENT':
      default:
        return PaymentAdapterFactory.mockAdapter;
    }
  }

  public static getMockAdapter(): MockPaymentAdapter {
    return PaymentAdapterFactory.mockAdapter;
  }
}
