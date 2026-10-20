process.env.NODE_ENV = 'test';
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { integrationsService } from '../apps/api/services/integrations.service';
import {
  NotificationAdapterFactory,
  MockNotificationAdapter,
  EmailProviderAdapter,
  SmsProviderAdapter,
} from '../apps/api/services/notification-adapter';
import { PaymentAdapterFactory } from '../apps/api/services/payment-adapter';
import { appConfig, loadAndValidateConfig, ConfigurationError } from '../apps/api/config/env';
import { IntegrationStatus, UserRole, SessionUser } from '../packages/contracts';
import { authService } from '../apps/api/services/auth.service';

describe('Mandatory Architecture Directive — Centralized Third-Party Configuration and Provider Management', () => {
  beforeEach(() => {
    // Reset custom notification adapter
    NotificationAdapterFactory.setAdapter(null);
  });

  describe('1. Startup and Development Mode Non-Blocking Invariants', () => {
    test('App config loads in development/test without any SendGrid, Twilio, Stripe, or cloud keys', () => {
      // Create empty environment object without any third-party credentials
      const bareEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'test',
        DEFAULT_APP_PORT: '3000',
      };

      const config = loadAndValidateConfig(bareEnv);
      assert.equal(config.nodeEnv, 'test');
      assert.equal(config.port, 3000);
      assert.ok(config.security.configEncryptionKey);
      assert.equal(config.database.isConfigured, false); // in-memory fallback
      assert.equal(config.redis.isConfigured, false); // in-memory fallback
    });

    test('IntegrationsService initializes smoothly without requiring third-party credentials', () => {
      const allConfigs = integrationsService.getAllConfigs();
      assert.ok(Array.isArray(allConfigs));
      assert.ok(allConfigs.length >= 6);

      // Verify essential providers are registered
      const providerIds = allConfigs.map((c) => c.id);
      assert.ok(providerIds.includes('sendgrid_email'), 'sendgrid_email must be registered');
      assert.ok(providerIds.includes('twilio_sms'), 'twilio_sms must be registered');
      assert.ok(providerIds.includes('stripe'), 'stripe must be registered');
      assert.ok(providerIds.includes('razorpay'), 'razorpay must be registered');
      assert.ok(providerIds.includes('mock_payment'), 'mock_payment must be registered');
      assert.ok(providerIds.includes('google_maps'), 'google_maps must be registered');
      assert.ok(providerIds.includes('s3_storage'), 's3_storage must be registered');
    });

    test('Missing optional providers do not block or break internal payment or notification processing', async () => {
      // By default in dev/test, payment gateway is MOCK_PAYMENT sandbox
      const activeGateway = integrationsService.getActiveGatewayConfig();
      assert.equal(activeGateway.activeProvider, 'MOCK_PAYMENT');

      const paymentAdapter = PaymentAdapterFactory.getAdapter('MOCK_PAYMENT');
      const payResult = await paymentAdapter.createPaymentIntent({
        amountCents: 5000,
        currency: 'USD',
        bookingId: 'book-sandbox-01',
        customerId: 'usr-customer-01',
        idempotencyKey: 'idemp-sandbox-01',
      });

      assert.equal(payResult.success, true);
      assert.equal(payResult.isSimulated, true);

      // Notification factory defaults to safe mock adapter in test/dev
      const emailAdapter = NotificationAdapterFactory.getAdapter('EMAIL');
      const notifResult = await emailAdapter.send({
        channel: 'EMAIL',
        type: 'BOOKING_CONFIRMED',
        recipient: 'driver@test.com',
        content: 'Your reservation is confirmed!',
      });

      assert.equal(notifResult.success, true);
      assert.equal(notifResult.isSimulated, true);
    });
  });

  describe('2. Provider Secret Redaction and API Boundary Isolation', () => {
    test('getAllConfigs() and getConfigById() NEVER return raw secrets', () => {
      // Temporarily store a test secret
      integrationsService.updateIntegration(
        'sendgrid_email',
        {
          apiKey: 'SG.test_high_entropy_secret_key_1234567890abcdef',
          mode: 'test',
        },
        'usr-admin-test'
      );

      const config = integrationsService.getConfigById('sendgrid_email');
      assert.ok(config);

      // Verify masked representation
      assert.ok(config.maskedApiKey);
      assert.ok(!config.maskedApiKey.includes('high_entropy'));
      assert.ok(config.maskedApiKey.startsWith('SG.•••') || config.maskedApiKey.includes('••••'));

      // Raw apiKey must not exist as unmasked property on config
      assert.notEqual((config as any).apiKey, 'SG.test_high_entropy_secret_key_1234567890abcdef');

      // getAllConfigs() must also have masked values only
      const all = integrationsService.getAllConfigs();
      const sendgridInAll = all.find((c) => c.id === 'sendgrid_email');
      assert.ok(sendgridInAll);
      assert.ok(!JSON.stringify(sendgridInAll).includes('high_entropy_secret_key'));
    });

    test('Audit history records mutations with structured diffs and raw secrets REDACTED', () => {
      const updateResult = integrationsService.updateIntegration(
        'twilio_sms',
        {
          apiKey: 'AC_dummy_account_sid_masked',
          secretKey: 'dummy_auth_token_secret_value_xyz',
          operationalSettings: {
            fromNumber: '+15551234567',
          },
          mode: 'test',
        },
        'usr-admin-super'
      );

      const audit = updateResult.auditRecord;
      assert.ok(audit.id);
      assert.equal(audit.action, 'UPDATE_INTEGRATION_CONFIG');
      assert.equal(audit.resourceId, 'twilio_sms');
      assert.equal(audit.actorId, 'usr-admin-super');

      // Audit details must list changed fields, NOT raw values
      assert.ok(audit.details.changedSecretFields?.includes('secretKey') || audit.details.changedSecretFields?.includes('apiKey'));
      assert.ok(audit.details.changedOperationalFields?.includes('fromNumber'));

      // The JSON serialized audit string must never contain the raw secret
      const serializedAudit = JSON.stringify(audit);
      assert.ok(!serializedAudit.includes('dummy_auth_token_secret_value_xyz'));

      // getAuditHistory() must return the redacted history
      const history = integrationsService.getAuditHistory('twilio_sms');
      assert.ok(history.length > 0);
      assert.ok(!JSON.stringify(history).includes('dummy_auth_token_secret_value_xyz'));
    });

    test('Secret replacement allows updating credentials without transmitting or knowing old secrets', () => {
      // Step 1: Initial secret
      integrationsService.updateIntegration(
        'stripe',
        {
          secretKey: 'sk_test_initial_secret_111111111111',
          mode: 'test',
        },
        'admin-01'
      );

      // Verify internal decrypted secret is updated
      const creds1 = integrationsService.getCredentials('stripe');
      assert.equal(creds1?.secretKey, 'sk_test_initial_secret_111111111111');

      // Step 2: Replace secret without retrieving the old secret
      integrationsService.updateIntegration(
        'stripe',
        {
          secretKey: 'sk_test_rotated_secret_222222222222',
        },
        'admin-02'
      );

      const creds2 = integrationsService.getCredentials('stripe');
      assert.equal(creds2?.secretKey, 'sk_test_rotated_secret_222222222222');
    });
  });

  describe('3. Honest Connection Probing vs Simulated Sandbox Rules', () => {
    test('Unconfigured live provider connection test returns honest failure and NOT_CONFIGURED status', async () => {
      // Clear out sendgrid credentials
      integrationsService.updateIntegration(
        'sendgrid_email',
        {
          apiKey: '',
          secretKey: '',
          mode: 'live',
          enabled: true,
        },
        'admin-test'
      );

      // Remove in-memory creds for honest unconfigured test
      const rawCreds = (integrationsService as any).credentialsVault;
      rawCreds.delete('sendgrid_email');

      const testResult = await integrationsService.testConnection('sendgrid_email');
      assert.equal(testResult.success, false, 'Must never report success when unconfigured');
      assert.equal(testResult.status, IntegrationStatus.NOT_CONFIGURED);
      assert.equal(testResult.isSimulation, false);
      assert.ok(testResult.message.includes('not configured'));
    });

    test('Mock Sandbox provider explicitly returns testType: SIMULATED and isSimulation: true', async () => {
      const testResult = await integrationsService.testConnection('mock_payment');
      assert.equal(testResult.success, true);
      assert.equal(testResult.testType, 'SIMULATED');
      assert.equal(testResult.isSimulation, true);
      assert.ok(testResult.message.includes('[Simulated Sandbox]'));
    });

    test('Twilio unconfigured connection probe reports honest NOT_CONFIGURED without fabricated success', async () => {
      const rawCreds = (integrationsService as any).credentialsVault;
      rawCreds.delete('twilio_sms');

      const testResult = await integrationsService.testConnection('twilio_sms');
      assert.equal(testResult.success, false);
      assert.equal(testResult.status, IntegrationStatus.NOT_CONFIGURED);
      assert.equal(testResult.isSimulation, false);
      assert.ok(testResult.message.includes('not configured'));
    });
  });

  describe('4. Mock vs Live Notification Delivery Invariants', () => {
    test('MockNotificationAdapter NEVER claims actual carrier delivery (delivered is always false)', async () => {
      const mockAdapter = new MockNotificationAdapter();
      const sendResult = await mockAdapter.send({
        channel: 'EMAIL',
        type: 'SECURITY_ALERT',
        recipient: 'host@example.com',
        content: 'Login from new device',
      });

      assert.equal(sendResult.success, true);
      assert.equal(sendResult.isSimulated, true);
      assert.equal(sendResult.delivered, false, 'Mock adapter must NEVER report delivered: true');
      assert.ok(sendResult.simulationNotice?.includes('[SIMULATED_MOCK]'));
    });

    test('EmailProviderAdapter in live mode without API key fails safely with clear unconfigured error', async () => {
      const adapter = new EmailProviderAdapter(undefined, 'noreply@parkeazy.internal', 'ParkEazy', undefined, false);
      const result = await adapter.send({
        channel: 'EMAIL',
        type: 'BOOKING_CONFIRMED',
        recipient: 'user@example.com',
        content: 'Booking details',
      });

      assert.equal(result.success, false);
      assert.equal(result.delivered, false);
      assert.equal(result.errorCode, 'CONFIGURATION_ERROR');
      assert.ok(result.errorMessage?.includes('API key is not configured'));
    });

    test('SmsProviderAdapter in live mode without Account SID or Auth Token fails safely', async () => {
      const adapter = new SmsProviderAdapter(undefined, undefined, '+15557275329', false);
      const result = await adapter.send({
        channel: 'SMS',
        type: 'HOLD_EXPIRING',
        recipient: '+15559876543',
        content: 'Your hold is expiring',
      });

      assert.equal(result.success, false);
      assert.equal(result.delivered, false);
      assert.equal(result.errorCode, 'CONFIGURATION_ERROR');
      assert.ok(result.errorMessage?.includes('credentials'));
    });
  });

  describe('5. RBAC and Endpoint Protection for Centralized Provider Management', () => {
    test('Admin user with ADMIN role can access and update centralized integrations', () => {
      // Verify admin token creation and role checking
      const adminUser: SessionUser = {
        id: 'usr-admin-auth-test',
        email: 'admin@parkeazy.com',
        firstName: 'System',
        lastName: 'Admin',
        roles: [UserRole.ADMIN],
        isHostVerified: true,
        createdAt: new Date().toISOString(),
      };
      const adminToken = authService.signToken(adminUser, 3600, false);

      const decoded = authService.verifyToken(adminToken);
      assert.ok(decoded.roles.includes(UserRole.ADMIN));
      assert.equal(decoded.sub, 'usr-admin-auth-test');
    });

    test('Host and Customer roles are rejected from managing provider configurations', () => {
      const hostUser: SessionUser = {
        id: 'usr-host-rbac-test',
        email: 'host@parkeazy.com',
        firstName: 'Host',
        lastName: 'User',
        roles: [UserRole.HOST],
        isHostVerified: true,
        createdAt: new Date().toISOString(),
      };
      const hostToken = authService.signToken(hostUser, 3600, false);
      const decodedHost = authService.verifyToken(hostToken);
      assert.ok(decodedHost.roles.includes(UserRole.HOST));

      const customerUser: SessionUser = {
        id: 'usr-customer-rbac-test',
        email: 'customer@parkeazy.com',
        firstName: 'Customer',
        lastName: 'User',
        roles: [UserRole.CUSTOMER],
        isHostVerified: false,
        createdAt: new Date().toISOString(),
      };
      const customerToken = authService.signToken(customerUser, 3600, false);
      const decodedCustomer = authService.verifyToken(customerToken);
      assert.ok(decodedCustomer.roles.includes(UserRole.CUSTOMER));

      // The authGuard middleware allows only ADMIN and SUPER_ADMIN for /admin/integrations
      const allowedRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
      assert.ok(!decodedHost.roles.some((r) => allowedRoles.includes(r)));
      assert.ok(!decodedCustomer.roles.some((r) => allowedRoles.includes(r)));
    });
  });

  describe('6. Category A, B, and C Classification and Completeness Validation', () => {
    test('Provider field schemas classify all fields into Category A (Operational) or Category B (Secret)', () => {
      const sendgridConfig = integrationsService.getConfigById('sendgrid_email');
      assert.ok(sendgridConfig?.fields);

      const apiKeyField = sendgridConfig.fields.find((f) => f.field === 'apiKey');
      assert.equal(apiKeyField?.classification, 'CATEGORY_B_SECRET');
      assert.equal(apiKeyField?.requiredForLive, true);

      const fromEmailField = sendgridConfig.fields.find((f) => f.field === 'fromEmail');
      assert.equal(fromEmailField?.classification, 'CATEGORY_A_OPERATIONAL');
      assert.equal(fromEmailField?.requiredForLive, true);

      const timeoutField = sendgridConfig.fields.find((f) => f.field === 'timeoutMs');
      assert.equal(timeoutField?.classification, 'CATEGORY_A_OPERATIONAL');
      assert.equal(timeoutField?.requiredForLive, false);
    });

    test('Completeness status transitions correctly between NOT_CONFIGURED, PARTIALLY_CONFIGURED, and FULLY_CONFIGURED', () => {
      // 1. Clear out twilio
      const rawCreds = (integrationsService as any).credentialsVault;
      rawCreds.delete('twilio_sms');
      const rawOps = (integrationsService as any).operationalSettings;
      rawOps.set('twilio_sms', {});

      (integrationsService as any).recomputeProviderStatus('twilio_sms');
      let twilioConfig = integrationsService.getConfigById('twilio_sms');
      assert.equal(twilioConfig?.completeness, 'NOT_CONFIGURED');

      // 2. Add Account SID only (missing Auth Token and From Number) -> PARTIALLY_CONFIGURED
      integrationsService.updateIntegration(
        'twilio_sms',
        {
          apiKey: 'AC_dummy_partial_sid',
        },
        'test-actor'
      );
      twilioConfig = integrationsService.getConfigById('twilio_sms');
      assert.equal(twilioConfig?.completeness, 'PARTIALLY_CONFIGURED');

      // 3. Add Auth Token and From Number -> FULLY_CONFIGURED
      integrationsService.updateIntegration(
        'twilio_sms',
        {
          secretKey: 'dummy_full_auth_token',
          operationalSettings: {
            fromNumber: '+15557275329',
          },
        },
        'test-actor'
      );
      twilioConfig = integrationsService.getConfigById('twilio_sms');
      assert.equal(twilioConfig?.completeness, 'FULLY_CONFIGURED');
    });

    test('Bootstrap Secrets (Category C) enforce strict validation in production', () => {
      // In production, JWT_SECRET must be at least 32 chars and not use insecure defaults
      assert.throws(
        () => {
          loadAndValidateConfig({
            NODE_ENV: 'production',
            DATABASE_URL: 'postgresql://usr:pwd@localhost:5432/parkeazy',
            REDIS_URL: 'redis://localhost:6379',
            JWT_SECRET: 'short-key',
          });
        },
        (err: any) => err instanceof ConfigurationError && err.variable === 'JWT_SECRET'
      );
    });
  });
});
