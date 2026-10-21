import { describe, it, expect } from 'vitest';
import { db } from '../server/db';
import { User } from '../server/types';

describe('Micro-Phase 2: Payout and Financial Integrity Verification', () => {
  const createTestHost = async (suffix: string, initialBalance = 100.0) => {
    const hostId = `usr_test_host_fin_${suffix}`;
    const testHost: User = {
      id: hostId,
      email: `host.fin.${suffix}@parkeazy.com`,
      fullName: `Fin Host ${suffix}`,
      role: 'host',
      status: 'active',
      passwordHash: 'hashed_pw',
      phone: '+1 555-0199',
      isEmailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      businessDetails: {
        businessName: `Fin Test Parking ${suffix} LLC`,
        registrationNumber: 'REG-19283',
        taxId: 'TAX-91028',
        payoutBankName: 'JPMorgan Chase',
        payoutAccountNumber: '9988776655',
        payoutRoutingNumber: '021000021',
        isVerified: true
      }
    };

    await db.persistEntity('users', testHost.id, testHost);

    await db.recordLedgerEntry({
      idempotencyKey: `test_income_seed_${suffix}`,
      hostId: testHost.id,
      type: 'booking_income',
      amount: initialBalance,
      currency: 'USD',
      description: 'Completed booking net proceeds',
      status: 'completed'
    });

    return testHost;
  };

  it('1. Safe payout lifecycle: Never marks paid merely on request; starts in processing', async () => {
    const host = await createTestHost('lifecycle');
    const payout = await db.requestPayout(
      host.id,
      30.0,
      'ach_bank_transfer',
      '9988776655',
      host,
      'test_idem_lifecycle_01'
    );

    expect(payout.status).toBe('processing');
    expect(payout.amount).toBe(30.0);
    expect(payout.completedAt).toBeUndefined();

    // Check ledger entry
    const ledger = await db.getLedger(host.id);
    const payoutLedger = ledger.find(l => l.idempotencyKey === 'payout_tx_' + payout.id);
    expect(payoutLedger).toBeDefined();
    expect(payoutLedger?.status).toBe('pending');
    expect(payoutLedger?.amount).toBe(-30.0);
  });

  it('2. Atomic balance reservation: Reserves funds so available balance decreases and double-spend is blocked', async () => {
    const host = await createTestHost('reservation', 100.0);
    const balanceBefore = await db.getHostAvailableBalance(host.id);
    expect(balanceBefore).toBe(100.0);

    // Request $40 payout
    await db.requestPayout(
      host.id,
      40.0,
      'ach_bank_transfer',
      '9988776655',
      host,
      'test_idem_reservation_01'
    );

    // Available balance must immediately reflect the $40 reservation
    const balanceAfter = await db.getHostAvailableBalance(host.id);
    expect(balanceAfter).toBe(60.0);

    // Attempting to withdraw remaining ($60) + $10 must fail with Insufficient available balance
    await expect(
      db.requestPayout(
        host.id,
        70.0,
        'ach_bank_transfer',
        '9988776655',
        host,
        'test_idem_reservation_overshoot'
      )
    ).rejects.toThrow(/Insufficient available balance/);
  });

  it('3. Durable Idempotency: Duplicate client requests return identical payout without double reservation', async () => {
    const host = await createTestHost('idempotency', 100.0);
    const idemKey = 'test_idempotent_key_dup_01';
    const balanceStart = await db.getHostAvailableBalance(host.id);
    expect(balanceStart).toBe(100.0);

    const first = await db.requestPayout(
      host.id,
      25.0,
      'ach_bank_transfer',
      '9988776655',
      host,
      idemKey
    );

    const balanceAfterFirst = await db.getHostAvailableBalance(host.id);
    expect(balanceAfterFirst).toBe(75.0);

    // Repeat with identical key
    const second = await db.requestPayout(
      host.id,
      25.0,
      'ach_bank_transfer',
      '9988776655',
      host,
      idemKey
    );

    expect(second.id).toBe(first.id);
    expect(second.referenceNumber).toBe(first.referenceNumber);

    // Balance must NOT be debited again
    const balanceAfterSecond = await db.getHostAvailableBalance(host.id);
    expect(balanceAfterSecond).toBe(75.0);

    // Key reuse with conflicting parameters must be rejected
    await expect(
      db.requestPayout(
        host.id,
        50.0,
        'ach_bank_transfer',
        '9988776655',
        host,
        idemKey
      )
    ).rejects.toThrow(/Idempotency conflict/);
  });

  it('4. Host ownership and eligibility guards: Ineligible or unauthorized users cannot request payouts', async () => {
    const host = await createTestHost('guards', 100.0);
    const unauthorizedActor: User = {
      ...host,
      id: 'usr_stranger_host',
      role: 'host'
    };

    // Stranger cannot request payout for host
    await expect(
      db.requestPayout(
        host.id,
        20.0,
        'ach_bank_transfer',
        '9988776655',
        unauthorizedActor
      )
    ).rejects.toThrow(/Forbidden/);

    // Suspended host cannot request payouts
    const suspendedHost: User = {
      ...host,
      id: 'usr_suspended_host',
      status: 'suspended'
    };
    await db.persistEntity('users', suspendedHost.id, suspendedHost);

    await expect(
      db.requestPayout(
        suspendedHost.id,
        20.0,
        'ach_bank_transfer',
        '9988776655',
        suspendedHost
      )
    ).rejects.toThrow(/Only active host accounts are eligible/);
  });

  it('5. Provider confirmation lifecycle: Confirm marks paid and ledger completed', async () => {
    const host = await createTestHost('confirmation', 100.0);
    const payout = await db.requestPayout(
      host.id,
      20.0,
      'ach_bank_transfer',
      '9988776655',
      host,
      'test_idem_confirm_01'
    );
    expect(payout.status).toBe('processing');

    const confirmed = await db.confirmPayout(payout.id, 'tr_stripe_test_123');
    expect(confirmed.status).toBe('paid');
    expect(confirmed.completedAt).toBeDefined();

    // Ledger entry is now completed
    const ledger = await db.getLedger(host.id);
    const ledgerEntry = ledger.find(l => l.idempotencyKey === 'payout_tx_' + payout.id);
    expect(ledgerEntry?.status).toBe('completed');
  });

  it('6. Cancellation and failure releases balance reservation cleanly', async () => {
    const host = await createTestHost('cancellation', 100.0);
    const balanceInitial = await db.getHostAvailableBalance(host.id);
    expect(balanceInitial).toBe(100.0);

    const payout = await db.requestPayout(
      host.id,
      35.0,
      'ach_bank_transfer',
      '9988776655',
      host,
      'test_idem_cancel_01'
    );

    const balanceDuring = await db.getHostAvailableBalance(host.id);
    expect(balanceDuring).toBe(65.0);

    // Cancel payout
    const cancelled = await db.cancelPayout(payout.id, host, 'User cancelled');
    expect(cancelled.status).toBe('failed');

    // Balance reservation must be cleanly released back
    const balanceReleased = await db.getHostAvailableBalance(host.id);
    expect(balanceReleased).toBe(100.0);

    // Ledger entry is marked failed
    const ledger = await db.getLedger(host.id);
    const ledgerEntry = ledger.find(l => l.idempotencyKey === 'payout_tx_' + payout.id);
    expect(ledgerEntry?.status).toBe('failed');
  });

  it('7. Status reconciliation reports unconfigured credentials as blocker without fabricating success', async () => {
    const host = await createTestHost('reconciliation', 100.0);
    const payout = await db.requestPayout(
      host.id,
      15.0,
      'ach_bank_transfer',
      '9988776655',
      host,
      'test_idem_reconcile_01'
    );

    const reconcileResult = await db.reconcilePayout(payout.id, host);
    expect(reconcileResult.reconciled).toBe(false);
    expect(reconcileResult.blocker).toBe('STRIPE_CREDENTIALS_UNCONFIGURED');
    expect(reconcileResult.payout.status).toBe('processing');
  });

  it('8. Concurrency protection: Simultaneous concurrent requests cannot double-spend available balance', async () => {
    // Host has exactly $50 available
    const host = await createTestHost('race_condition', 50.0);

    // Two concurrent requests for $40 each (total $80 > $50 available)
    const results = await Promise.allSettled([
      db.requestPayout(host.id, 40.0, 'ach_bank_transfer', '9988776655', host, 'race_req_1'),
      db.requestPayout(host.id, 40.0, 'ach_bank_transfer', '9988776655', host, 'race_req_2')
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // Exactly one must succeed and one must be rejected
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Remaining available balance must be $10, not negative
    const finalBalance = await db.getHostAvailableBalance(host.id);
    expect(finalBalance).toBe(10.0);
  });

  it('9. Webhook deduplication and status settlement: Duplicate provider callbacks are idempotent', async () => {
    const host = await createTestHost('webhook_dedup', 80.0);
    const payout = await db.requestPayout(
      host.id,
      30.0,
      'ach_bank_transfer',
      '9988776655',
      host,
      'webhook_payout_01'
    );

    const eventId = 'evt_test_transfer_paid_123';
    const payload = {
      id: eventId,
      type: 'transfer.paid',
      data: {
        object: {
          id: 'tr_test_9999',
          reference_number: payout.referenceNumber
        }
      }
    };

    // First webhook delivery
    const firstDelivery = await db.processProviderWebhook('stripe', payload);
    expect(firstDelivery.success).toBe(true);
    expect(firstDelivery.duplicate).toBeUndefined();

    // Check payout is paid
    const payouts = await db.getPayouts(host.id);
    const settledPayout = payouts.find(p => p.id === payout.id);
    expect(settledPayout?.status).toBe('paid');

    // Duplicate webhook delivery with same event ID
    const duplicateDelivery = await db.processProviderWebhook('stripe', payload);
    expect(duplicateDelivery.success).toBe(true);
    expect(duplicateDelivery.duplicate).toBe(true);
  });
});
