process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { authService } from '../apps/api/services/auth.service';
import { ledgerService } from '../apps/api/services/ledger.service';
import { BookingStatus, UserRole, LedgerEntryType } from '../packages/contracts';

describe('Phase 5 Module 5 — Backend Booking Lifecycle & Payment Integration', () => {
  let server: http.Server;
  let baseUrl: string;
  let customerToken: string;
  let otherCustomerToken: string;

  before(async () => {
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    customerToken = authService.signToken({
      id: 'usr-customer-001',
      email: 'driver@parkeazy.com',
      firstName: 'Alex',
      lastName: 'Morgan',
      roles: [UserRole.CUSTOMER],
      phoneNumber: '+1-555-0199',
      isHostVerified: false,
      createdAt: '2026-01-15T08:00:00Z',
    });

    otherCustomerToken = authService.signToken({
      id: 'usr-customer-999',
      email: 'other@parkeazy.com',
      firstName: 'Other',
      lastName: 'Driver',
      roles: [UserRole.CUSTOMER],
      phoneNumber: '+1-555-0100',
      isHostVerified: false,
      createdAt: '2026-01-15T08:00:00Z',
    });
  });

  after(async () => {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test('POST /api/v1/bookings/hold creates hold with authoritative quote and 10-minute expiry', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bayId: 'bay-001-b',
        locationId: 'loc-dt-001',
        durationMinutes: 180,
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.holdId.startsWith('hold-'));
    assert.equal(json.data.holdDurationSeconds, 600);
    assert.ok(json.data.quoteSnapshot);
    assert.equal(json.data.quoteSnapshot.durationMinutes, 180);
    assert.ok(json.data.quoteSnapshot.totalPayableCents > 0);
  });

  test('GET /api/v1/bookings/hold/:id retrieves active hold and revalidates expiry', async () => {
    // 1. Create a hold
    const createRes = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bayId: 'bay-003-a',
        locationId: 'loc-hub-003',
        durationMinutes: 120,
      }),
    });
    const { data: hold } = await createRes.json();

    // 2. Fetch hold by ID
    const getRes = await fetch(`${baseUrl}/api/v1/bookings/hold/${hold.holdId}`);
    assert.equal(getRes.status, 200);
    const getJson = await getRes.json();
    assert.equal(getJson.success, true);
    assert.equal(getJson.data.holdId, hold.holdId);
    assert.equal(getJson.data.locationId, 'loc-hub-003');
    assert.equal(getJson.data.quoteSnapshot.totalPayableCents, hold.quoteSnapshot.totalPayableCents);
  });

  test('GET /api/v1/bookings/hold/:id returns 404 for non-existent hold', async () => {
    const res = await fetch(`${baseUrl}/api/v1/bookings/hold/hold-does-not-exist`);
    assert.equal(res.status, 404);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'NOT_FOUND');
  });

  test('Full lifecycle: Hold -> Payment Intent -> Idempotent Booking Confirmation -> Ledger Verification', async () => {
    const initialLedgerCount = ledgerService.getAllEntries().length;

    // 1. Create Hold
    const holdRes = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bayId: 'bay-002-a',
        locationId: 'loc-res-002',
        durationMinutes: 60,
      }),
    });
    assert.equal(holdRes.status, 201);
    const { data: hold } = await holdRes.json();
    const totalAmount = hold.quoteSnapshot.totalPayableCents;

    // 2. Create Payment Intent
    const idempotencyKey = `idemp_m5_${Date.now()}`;
    const intentRes = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        amountCents: totalAmount,
        currency: 'USD',
        bookingId: hold.holdId,
        idempotencyKey,
      }),
    });
    assert.equal(intentRes.status, 201);
    const intentJson = await intentRes.json();
    assert.equal(intentJson.success, true);
    assert.equal(intentJson.data.status, 'SUCCEEDED');
    const transactionId = intentJson.data.transactionId;

    // 3. Confirm Booking from Hold
    const confirmBookingRes = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        holdId: hold.holdId,
        paymentIntentId: transactionId,
        idempotencyKey,
        licensePlate: '9ABC123',
      }),
    });
    assert.equal(confirmBookingRes.status, 201);
    const confirmJson = await confirmBookingRes.json();
    assert.equal(confirmJson.success, true);
    const booking = confirmJson.data;
    assert.ok(booking.id.startsWith('bk-2026-'));
    assert.equal(booking.status, BookingStatus.CONFIRMED);
    assert.equal(booking.licensePlate, '9ABC123');
    assert.ok(booking.gateCode);
    assert.ok(booking.accessInstructions);
    assert.equal(booking.paymentDetails.transactionId, transactionId);

    // 4. Test Idempotency: repeating exact same request must return same booking without creating new one
    const repeatRes = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        holdId: hold.holdId,
        paymentIntentId: transactionId,
        idempotencyKey,
        licensePlate: '9ABC123',
      }),
    });
    assert.equal(repeatRes.status, 201);
    const repeatJson = await repeatRes.json();
    assert.equal(repeatJson.data.id, booking.id);

    // 5. Verify balanced double-entry ledger postings were recorded
    const newLedgerEntries = ledgerService.getAllEntries();
    const createdEntries = newLedgerEntries.filter((e) => e.bookingId === booking.id);
    assert.ok(createdEntries.length >= 2, 'Must create fee collection and escrow deposit entries');
    const feeEntry = createdEntries.find((e) => e.entryType === LedgerEntryType.PARKING_FEE_COLLECTED);
    assert.ok(feeEntry);
    assert.equal(feeEntry.amountCents, totalAmount);

    const depositEntry = createdEntries.find((e) => e.entryType === LedgerEntryType.DEPOSIT_HELD);
    assert.ok(depositEntry);
    assert.equal(depositEntry.amountCents, hold.quoteSnapshot.securityDepositCents);

    // 6. Verify Booking Details lookup
    const lookupRes = await fetch(`${baseUrl}/api/v1/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(lookupRes.status, 200);
    const lookupJson = await lookupRes.json();
    assert.equal(lookupJson.data.id, booking.id);
    assert.equal(lookupJson.data.gateCode, booking.gateCode);

    // 7. Verify Ownership Access Control: Another customer cannot access this booking
    const unauthorizedRes = await fetch(`${baseUrl}/api/v1/bookings/${booking.id}`, {
      headers: { Authorization: `Bearer ${otherCustomerToken}` },
    });
    assert.equal(unauthorizedRes.status, 403);
  });

  test('POST /api/v1/bookings rejects unverified or declined payment with 402 PAYMENT_UNVERIFIED', async () => {
    // 1. Create a hold
    const holdRes = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bayId: 'bay-001-a',
        locationId: 'loc-dt-001',
        durationMinutes: 60,
      }),
    });
    const { data: hold } = await holdRes.json();

    // 2. Trigger CARD_DECLINED simulation (amount 99999)
    const failIntentRes = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        amountCents: 99999, // Trigger card decline in mock adapter
        currency: 'USD',
        bookingId: hold.holdId,
        idempotencyKey: `fail_test_${Date.now()}`,
      }),
    });
    const failIntentJson = await failIntentRes.json();
    const failedTxnId = failIntentJson.data.transactionId;

    // 3. Attempt to confirm booking with failed transaction
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        holdId: hold.holdId,
        paymentIntentId: failedTxnId,
        idempotencyKey: `booking_fail_${Date.now()}`,
        licensePlate: 'FAIL-999',
      }),
    });

    assert.equal(res.status, 402);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'PAYMENT_UNVERIFIED');
  });

  test('POST /api/v1/bookings rejects payment with mismatched currency with 400 PAYMENT_CURRENCY_MISMATCH', async () => {
    // 1. Create a hold with USD quote on bay-001-c
    const holdRes = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bayId: 'bay-001-c',
        locationId: 'loc-dt-001',
        durationMinutes: 60,
      }),
    });
    const { data: hold } = await holdRes.json();

    // 2. Create payment intent with EUR currency
    const eurIntentRes = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        amountCents: hold.quoteSnapshot.totalPayableCents,
        currency: 'EUR', // Mismatched currency
        bookingId: hold.holdId,
        idempotencyKey: `eur_intent_${Date.now()}`,
      }),
    });
    const eurIntentJson = await eurIntentRes.json();
    const txnId = eurIntentJson.data.transactionId;

    // 3. Confirm should be rejected
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        holdId: hold.holdId,
        paymentIntentId: txnId,
        idempotencyKey: `confirm_eur_${Date.now()}`,
        licensePlate: 'EUR-123',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'PAYMENT_CURRENCY_MISMATCH');
  });

  test('POST /api/v1/bookings rejects payment with mismatched amount with 400 PAYMENT_AMOUNT_MISMATCH', async () => {
    const holdRes = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bayId: 'bay-001-d',
        locationId: 'loc-dt-001',
        durationMinutes: 60,
      }),
    });
    const { data: hold } = await holdRes.json();

    // Create payment intent with deliberate underpayment ($10.00 instead of quote total)
    const partialIntentRes = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        amountCents: 1000, // Deliberate underpayment
        currency: 'USD',
        bookingId: hold.holdId,
        idempotencyKey: `partial_intent_${Date.now()}`,
      }),
    });
    const partialIntentJson = await partialIntentRes.json();
    const txnId = partialIntentJson.data.transactionId;

    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        holdId: hold.holdId,
        paymentIntentId: txnId,
        idempotencyKey: `confirm_partial_${Date.now()}`,
        licensePlate: 'PART-123',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'PAYMENT_AMOUNT_MISMATCH');
  });

  test('POST /api/v1/bookings rejects payment reuse across multiple bookings with 409 PAYMENT_ALREADY_USED', async () => {
    // 1. First booking with valid payment on bay-002-b
    const hold1Res = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bayId: 'bay-002-b',
        locationId: 'loc-res-002',
        durationMinutes: 60,
      }),
    });
    const { data: hold1 } = await hold1Res.json();

    const intentRes = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        amountCents: hold1.quoteSnapshot.totalPayableCents,
        currency: 'USD',
        bookingId: hold1.holdId,
        idempotencyKey: `shared_intent_${Date.now()}`,
      }),
    });
    const intentJson = await intentRes.json();
    const reusedTxnId = intentJson.data.transactionId;

    const confirm1Res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        holdId: hold1.holdId,
        paymentIntentId: reusedTxnId,
        idempotencyKey: `confirm1_${Date.now()}`,
        licensePlate: 'PLATE-1',
      }),
    });
    assert.equal(confirm1Res.status, 201);

    // 2. Second hold on bay-003-b attempting to reuse the same payment transaction ID
    const hold2Res = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bayId: 'bay-003-b',
        locationId: 'loc-hub-003',
        durationMinutes: 60,
      }),
    });
    const { data: hold2 } = await hold2Res.json();

    const confirm2Res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        holdId: hold2.holdId,
        paymentIntentId: reusedTxnId, // Reusing previous payment!
        idempotencyKey: `confirm2_${Date.now()}`,
        licensePlate: 'PLATE-2',
      }),
    });

    assert.equal(confirm2Res.status, 409);
    const json2 = await confirm2Res.json();
    assert.equal(json2.success, false);
    assert.equal(json2.error.code, 'PAYMENT_ALREADY_USED');
  });

  test('POST /api/v1/bookings rejects confirming hold created by another user with 403 FORBIDDEN', async () => {
    // 1. Customer 1 creates hold on bay-003-c
    const holdRes = await fetch(`${baseUrl}/api/v1/bookings/hold`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        bayId: 'bay-003-c',
        locationId: 'loc-hub-003',
        durationMinutes: 60,
      }),
    });
    const { data: hold } = await holdRes.json();

    // 2. Other customer creates payment
    const intentRes = await fetch(`${baseUrl}/api/v1/payments/intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherCustomerToken}`,
      },
      body: JSON.stringify({
        amountCents: hold.quoteSnapshot.totalPayableCents,
        currency: 'USD',
        bookingId: hold.holdId,
        idempotencyKey: `other_intent_${Date.now()}`,
      }),
    });
    const intentJson = await intentRes.json();
    const txnId = intentJson.data.transactionId;

    // 3. Other customer attempts to confirm Customer 1's hold
    const res = await fetch(`${baseUrl}/api/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${otherCustomerToken}`,
      },
      body: JSON.stringify({
        holdId: hold.holdId,
        paymentIntentId: txnId,
        idempotencyKey: `hijack_attempt_${Date.now()}`,
        licensePlate: 'HIJACK-1',
      }),
    });

    assert.equal(res.status, 403);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error.code, 'FORBIDDEN');
  });

  test('Mathematical proof of double-entry ledger balance and escrow segregation', () => {
    const integrity = ledgerService.verifyLedgerIntegrity();
    assert.equal(integrity.isBalanced, true, 'Every journal entry must strictly balance debits and credits');
    assert.equal(integrity.totalDebitsCents, integrity.totalCreditsCents);
    assert.ok(integrity.entryCount >= 3);

    // Verify security deposit is segregated in escrow and not treated as platform revenue
    const escrowBalance = integrity.accountBalances['SECURITY_DEPOSIT_ESCROW'];
    assert.ok(escrowBalance);
    assert.ok(escrowBalance.credits > 0);
    assert.ok(escrowBalance.net > 0, 'Escrow must have positive liability credit balance');
  });

  test('GET /api/v1/bookings enforces data privacy across unauthenticated and authenticated roles', async () => {
    // 1. Unauthenticated request must return empty array without leaking customer data
    const publicRes = await fetch(`${baseUrl}/api/v1/bookings`);
    assert.equal(publicRes.status, 200);
    const publicJson = await publicRes.json();
    assert.deepEqual(publicJson.data, []);

    // 2. Customer request returns only customer bookings
    const custRes = await fetch(`${baseUrl}/api/v1/bookings`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.equal(custRes.status, 200);
    const custJson = await custRes.json();
    assert.ok(Array.isArray(custJson.data));
    for (const b of custJson.data) {
      assert.equal(b.userId, 'usr-customer-001');
    }
  });
});
