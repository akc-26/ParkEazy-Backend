/**
 * @fileoverview Payment, transaction, fee breakdown, and host settlement domain contracts.
 * Neutral representation respecting unapproved decisions register (DEC-01, DEC-02, DEC-05, DEC-09).
 */

export const PAYMENT_PROVIDERS = ['razorpay', 'stripe', 'mock_gateway'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_STATUSES = ['initiated', 'captured', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SETTLEMENT_STATUSES = ['scheduled', 'processing', 'completed', 'failed'] as const;
export type SettlementStatus = (typeof SETTLEMENT_STATUSES)[number];

export interface PaymentTransaction {
  id: string; // UUID
  bookingId: string;
  tenantId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  providerPaymentId?: string;
  amountInr: number;
  currency: string;
  method?: string; // e.g. 'upi', 'card', 'netbanking'
  status: PaymentStatus;
  webhookPayload?: Record<string, unknown>;
  createdAt: string;
}

export interface PricingBreakdown {
  baseAmountInr: number;
  platformFeeInr: number;
  taxInr: number;
  totalAmountInr: number;
}

export interface HostSettlement {
  id: string; // UUID
  hostId: string;
  tenantId: string;
  settlementReference: string;
  periodStart: string;
  periodEnd: string;
  grossEarningsInr: number;
  platformCommissionInr: number;
  netPayoutInr: number;
  utrNumber?: string;
  status: SettlementStatus;
  disbursedAt?: string;
  createdAt: string;
}
