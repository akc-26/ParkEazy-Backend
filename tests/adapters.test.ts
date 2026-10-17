process.env.NODE_ENV = 'test';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PaymentAdapterFactory,
  MockPaymentAdapter,
  StripePaymentAdapter,
  RazorpayPaymentAdapter,
} from '../apps/api/services/payment-adapter';
import {
  NotificationAdapterFactory,
  MockNotificationAdapter,
  EmailProviderAdapter,
  SmsProviderAdapter,
} from '../apps/api/services/notification-adapter';

describe('Workstream 2.6 - Provider-Neutral Payment and Notification Adapters', () => {
  describe('Payment Adapter', () => {
    test('MockPaymentAdapter creates payment intent and enforces idempotency', async () => {
      const adapter = new MockPaymentAdapter();
      const idempotencyKey = 'idemp_test_' + Date.now();

      const result1 = await adapter.createPaymentIntent({
        amountCents: 4500,
        currency: 'USD',
        bookingId: 'book-001',
        customerId: 'usr-customer-001',
        idempotencyKey,
      });

      assert.equal(result1.success, true);
      assert.equal(result1.status, 'SUCCEEDED');
      assert.equal(result1.amountCents, 4500);
      assert.equal(result1.currency, 'USD');
      assert.equal(result1.isSimulated, true);
      assert.ok(result1.transactionId.startsWith('txn_mock_'));
      assert.ok(result1.clientSecret);

      // Repeat with same idempotency key must return exact same transaction
      const result2 = await adapter.createPaymentIntent({
        amountCents: 4500,
        currency: 'USD',
        bookingId: 'book-001',
        customerId: 'usr-customer-001',
        idempotencyKey,
      });

      assert.equal(result2.transactionId, result1.transactionId);
      assert.equal(result2.createdAtUtc, result1.createdAtUtc);
    });

    test('MockPaymentAdapter simulates CARD_DECLINED failure deterministically for amount 99999', async () => {
      const adapter = new MockPaymentAdapter();
      const result = await adapter.createPaymentIntent({
        amountCents: 99999, // Special simulation trigger
        currency: 'USD',
        bookingId: 'book-002',
        customerId: 'usr-customer-001',
        idempotencyKey: 'idemp_fail_' + Date.now(),
      });

      assert.equal(result.success, false);
      assert.equal(result.status, 'FAILED');
      assert.equal(result.errorCode, 'CARD_DECLINED');
      assert.ok(result.errorMessage?.includes('Card declined'));
    });

    test('MockPaymentAdapter simulates GATEWAY_TIMEOUT deterministically for amount 99998', async () => {
      const adapter = new MockPaymentAdapter();
      await assert.rejects(
        async () => {
          await adapter.createPaymentIntent({
            amountCents: 99998, // Special timeout simulation trigger
            currency: 'USD',
            bookingId: 'book-003',
            customerId: 'usr-customer-001',
            idempotencyKey: 'idemp_timeout_' + Date.now(),
            timeoutMs: 20,
          });
        },
        (err: any) => err.message.includes('timed out')
      );
    });

    test('MockPaymentAdapter verifies webhook signature', async () => {
      const adapter = new MockPaymentAdapter();
      const valid = await adapter.verifyWebhook('{}', 'sig_mock_valid');
      assert.equal(valid.isValid, true);
      assert.equal(valid.status, 'SUCCEEDED');

      const invalid = await adapter.verifyWebhook('{}', 'invalid_signature_xyz');
      assert.equal(invalid.isValid, false);
      assert.ok(invalid.error);
    });

    test('Stripe and Razorpay adapters fail safely when unconfigured without leaking secrets', async () => {
      const stripe = new StripePaymentAdapter(undefined, undefined, true);
      const stripeRes = await stripe.createPaymentIntent({
        amountCents: 2000,
        currency: 'USD',
        bookingId: 'book-004',
        customerId: 'usr-001',
        idempotencyKey: 'stripe_test',
      });

      assert.equal(stripeRes.success, false);
      assert.equal(stripeRes.errorCode, 'CONFIGURATION_ERROR');

      const razorpay = new RazorpayPaymentAdapter(undefined, undefined, true);
      const rzpRes = await razorpay.createPaymentIntent({
        amountCents: 2000,
        currency: 'INR',
        bookingId: 'book-005',
        customerId: 'usr-001',
        idempotencyKey: 'rzp_test',
      });

      assert.equal(rzpRes.success, false);
      assert.equal(rzpRes.errorCode, 'CONFIGURATION_ERROR');
    });
  });

  describe('Notification Adapter', () => {
    test('MockNotificationAdapter captures notifications in-memory without real network traffic', async () => {
      const adapter = new MockNotificationAdapter();
      adapter.clearHistory();

      const result = await adapter.send({
        channel: 'EMAIL',
        type: 'BOOKING_CONFIRMED',
        recipient: 'alex@example.com',
        subject: 'Your Parking Bay is Confirmed!',
        content: 'Bay B2-30 at Financial Tower is reserved.',
      });

      assert.equal(result.success, true);
      assert.equal(result.channel, 'EMAIL');
      assert.equal(result.isSimulated, true);
      assert.ok(result.notificationId.startsWith('notif_'));

      const history = adapter.getHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].recipient, 'alex@example.com');
      assert.equal(history[0].type, 'BOOKING_CONFIRMED');
    });

    test('MockNotificationAdapter normalizes invalid recipient failure', async () => {
      const adapter = new MockNotificationAdapter();
      const result = await adapter.send({
        channel: 'SMS',
        type: 'HOLD_EXPIRING',
        recipient: '',
        content: 'Hold expiring',
      });

      assert.equal(result.success, false);
      assert.equal(result.errorCode, 'INVALID_RECIPIENT');
    });

    test('MockNotificationAdapter simulates carrier failure for fail@test.com', async () => {
      const adapter = new MockNotificationAdapter();
      const result = await adapter.send({
        channel: 'EMAIL',
        type: 'SECURITY_ALERT',
        recipient: 'fail@test.com',
        content: 'Security alert',
      });

      assert.equal(result.success, false);
      assert.equal(result.errorCode, 'PROVIDER_UNAVAILABLE');
    });

    test('MockNotificationAdapter simulates dispatch timeout for timeout@test.com', async () => {
      const adapter = new MockNotificationAdapter();
      await assert.rejects(
        async () => {
          await adapter.send({
            channel: 'EMAIL',
            type: 'PAYMENT_RECEIPT',
            recipient: 'timeout@test.com',
            content: 'Payment receipt',
            timeoutMs: 20,
          });
        },
        (err: any) => err.message.includes('timed out')
      );
    });

    test('Email and SMS adapters report configuration error when credentials are not supplied', async () => {
      const email = new EmailProviderAdapter(undefined, true);
      const emailRes = await email.send({
        channel: 'EMAIL',
        type: 'BOOKING_CONFIRMED',
        recipient: 'test@example.com',
        content: 'Test content',
      });
      assert.equal(emailRes.success, false);
      assert.equal(emailRes.errorCode, 'CONFIGURATION_ERROR');

      const sms = new SmsProviderAdapter(undefined, undefined, true);
      const smsRes = await sms.send({
        channel: 'SMS',
        type: 'HOLD_EXPIRING',
        recipient: '+15550199',
        content: 'Test content',
      });
      assert.equal(smsRes.success, false);
      assert.equal(smsRes.errorCode, 'CONFIGURATION_ERROR');
    });
  });
});
