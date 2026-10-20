/**
 * Financial Ledger and Payment contracts
 * Invariants:
 * - Append-only financial ledger: records are never deleted or mutated, only balanced with offsetting entries.
 * - Security deposits tracked separately from platform revenue and host earnings.
 * - Transactions remain permanently associated with the provider that originally processed them.
 */

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
  INTERNAL_MOCK = 'INTERNAL_MOCK',
}

export enum LedgerAccountType {
  CUSTOMER_PAYABLE = 'CUSTOMER_PAYABLE',
  SECURITY_DEPOSIT_ESCROW = 'SECURITY_DEPOSIT_ESCROW',
  PLATFORM_COMMISSION_REVENUE = 'PLATFORM_COMMISSION_REVENUE',
  HOST_PAYABLE = 'HOST_PAYABLE',
  REFUND_ESCROW = 'REFUND_ESCROW',
  GATEWAY_FEES_EXPENSE = 'GATEWAY_FEES_EXPENSE',
}

export enum LedgerEntryType {
  DEPOSIT_HELD = 'DEPOSIT_HELD',
  DEPOSIT_RELEASED = 'DEPOSIT_RELEASED',
  DEPOSIT_FORFEITED = 'DEPOSIT_FORFEITED',
  PARKING_FEE_COLLECTED = 'PARKING_FEE_COLLECTED',
  HOST_EARNING_ACCRUED = 'HOST_EARNING_ACCRUED',
  PLATFORM_FEE_RECOGNIZED = 'PLATFORM_FEE_RECOGNIZED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  PAYOUT_DISBURSED = 'PAYOUT_DISBURSED',
}

export interface LedgerEntry {
  id: string;
  bookingId: string;
  entryType: LedgerEntryType;
  debitAccount: LedgerAccountType;
  creditAccount: LedgerAccountType;
  amountCents: number;
  currency: string;
  paymentProvider: PaymentProvider;
  providerTransactionId?: string;
  description: string;
  idempotencyKey: string;
  createdAtUtc: string;
}

export interface HostEarningsSummary {
  hostId: string;
  totalAccruedCents: number;
  availableForPayoutCents: number;
  pendingClearanceCents: number;
  securityDepositsHeldCents: number;
  lifetimePayoutsCents: number;
  currency: string;
}
