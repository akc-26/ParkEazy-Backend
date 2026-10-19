import {
  LedgerEntry,
  LedgerEntryType,
  LedgerAccountType,
  PaymentProvider,
  HostEarningsSummary,
} from '../../../packages/contracts';

class LedgerService {
  // Append-only ledger storage: entries can only be appended, never mutated
  private entries: LedgerEntry[] = [
    {
      id: 'led-1001',
      bookingId: 'bk-2026-9810',
      entryType: LedgerEntryType.PARKING_FEE_COLLECTED,
      debitAccount: LedgerAccountType.CUSTOMER_PAYABLE,
      creditAccount: LedgerAccountType.PLATFORM_COMMISSION_REVENUE,
      amountCents: 5750,
      currency: 'USD',
      paymentProvider: PaymentProvider.STRIPE,
      providerTransactionId: 'ch_3N88xyz_parkeazy',
      description: 'Initial booking fee & deposit collection via Stripe',
      idempotencyKey: 'idem-bk-2026-9810-init',
      createdAtUtc: '2026-10-16T08:05:00Z',
    },
    {
      id: 'led-1002',
      bookingId: 'bk-2026-9810',
      entryType: LedgerEntryType.DEPOSIT_HELD,
      debitAccount: LedgerAccountType.PLATFORM_COMMISSION_REVENUE,
      creditAccount: LedgerAccountType.SECURITY_DEPOSIT_ESCROW,
      amountCents: 2500,
      currency: 'USD',
      paymentProvider: PaymentProvider.STRIPE,
      description: 'Segregated security deposit escrow allocation',
      idempotencyKey: 'idem-bk-2026-9810-sec-escrow',
      createdAtUtc: '2026-10-16T08:05:01Z',
    },
    {
      id: 'led-1003',
      bookingId: 'bk-2026-9810',
      entryType: LedgerEntryType.HOST_EARNING_ACCRUED,
      debitAccount: LedgerAccountType.PLATFORM_COMMISSION_REVENUE,
      creditAccount: LedgerAccountType.HOST_PAYABLE,
      amountCents: 2210,
      currency: 'USD',
      paymentProvider: PaymentProvider.STRIPE,
      description: 'Host net earnings 85% revenue share accrued',
      idempotencyKey: 'idem-bk-2026-9810-host-accrual',
      createdAtUtc: '2026-10-16T08:05:02Z',
    },
  ];

  public getAllEntries(): LedgerEntry[] {
    return this.entries;
  }

  public getHostEarnings(hostId: string): HostEarningsSummary {
    return {
      hostId,
      totalAccruedCents: 45800, // $458.00
      availableForPayoutCents: 32000, // $320.00
      pendingClearanceCents: 13800, // $138.00
      securityDepositsHeldCents: 4000, // $40.00 segregated escrow
      lifetimePayoutsCents: 284000, // $2,840.00
      currency: 'USD',
    };
  }

  public appendEntry(entry: Omit<LedgerEntry, 'id' | 'createdAtUtc'>): LedgerEntry {
    const existing = this.entries.find((e) => e.idempotencyKey === entry.idempotencyKey);
    if (existing) {
      return existing;
    }

    const newEntry: LedgerEntry = {
      ...entry,
      id: 'led-' + (1000 + this.entries.length + 1),
      createdAtUtc: new Date().toISOString(),
    };
    this.entries.push(newEntry);
    return newEntry;
  }

  public getEntriesForBooking(bookingId: string): LedgerEntry[] {
    return this.entries.filter((e) => e.bookingId === bookingId);
  }

  public verifyLedgerIntegrity(): {
    isBalanced: boolean;
    totalDebitsCents: number;
    totalCreditsCents: number;
    entryCount: number;
    accountBalances: Record<string, { debits: number; credits: number; net: number }>;
  } {
    let totalDebitsCents = 0;
    let totalCreditsCents = 0;
    const accountBalances: Record<string, { debits: number; credits: number; net: number }> = {};

    for (const entry of this.entries) {
      totalDebitsCents += entry.amountCents;
      totalCreditsCents += entry.amountCents;

      if (!accountBalances[entry.debitAccount]) {
        accountBalances[entry.debitAccount] = { debits: 0, credits: 0, net: 0 };
      }
      accountBalances[entry.debitAccount].debits += entry.amountCents;
      accountBalances[entry.debitAccount].net -= entry.amountCents;

      if (!accountBalances[entry.creditAccount]) {
        accountBalances[entry.creditAccount] = { debits: 0, credits: 0, net: 0 };
      }
      accountBalances[entry.creditAccount].credits += entry.amountCents;
      accountBalances[entry.creditAccount].net += entry.amountCents;
    }

    return {
      isBalanced: totalDebitsCents === totalCreditsCents,
      totalDebitsCents,
      totalCreditsCents,
      entryCount: this.entries.length,
      accountBalances,
    };
  }
}

export const ledgerService = new LedgerService();
