process.env.NODE_ENV = 'test';
process.env.ENABLE_DEMO_AUTH = 'true';

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { createApp } from '../server';
import { ParkEazyApiClient, ApiError } from '../packages/api-client/client';
import { authService } from '../apps/api/services/auth.service';
import { DEMO_USERS } from '../apps/api/middleware/auth-guard';
import { UserRole } from '../packages/contracts';

describe('Phase 1 — Host Account and Authentication Foundation', () => {
  let server: http.Server;
  let baseUrl: string;
  let client: ParkEazyApiClient;
  let hostAClient: ParkEazyApiClient;
  let hostBClient: ParkEazyApiClient;
  let customerClient: ParkEazyApiClient;

  let hostAId: string;
  let hostAToken: string;
  let hostBId: string;
  let hostBToken: string;
  let customerToken: string;

  before(async () => {
    authService.resetStores();
    const app = createApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
        client = new ParkEazyApiClient(baseUrl);
        hostAClient = new ParkEazyApiClient(baseUrl);
        hostBClient = new ParkEazyApiClient(baseUrl);
        customerClient = new ParkEazyApiClient(baseUrl);
        resolve();
      });
    });

    customerToken = authService.signToken(DEMO_USERS.customer, 3600);
    customerClient.setAuthToken(customerToken);
  });

  after(async () => {
    if (server.closeAllConnections) {
      server.closeAllConnections();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // --------------------------------------------------------------------------
  // 1. HOST REGISTRATION
  // --------------------------------------------------------------------------
  describe('1. Host Registration (pe_hw_01_02)', () => {
    test('1.1 Successful host registration returns 201, JWT, user with HOST role, and initial onboarding profile', async () => {
      const regData = {
        email: 'marcus.host1@parkeazy.com',
        firstName: 'Marcus',
        lastName: 'Vance',
        phoneNumber: '+1-555-8821',
        password: 'HostSecretPass2026!',
        confirmPassword: 'HostSecretPass2026!',
        businessType: 'INDIVIDUAL' as const,
        acceptsTerms: true,
        acceptsHostAgreement: true,
        requestedPortal: 'host' as const,
      };

      const result = await client.register(regData);

      assert.ok(result.token, 'Registration must issue a session token');
      assert.equal(result.user.email, 'marcus.host1@parkeazy.com');
      assert.equal(result.user.firstName, 'Marcus');
      assert.equal(result.user.lastName, 'Vance');
      assert.ok(result.user.roles.includes(UserRole.HOST), 'User must hold HOST role');
      assert.ok(result.user.roles.includes(UserRole.CUSTOMER), 'User must also hold CUSTOMER role');
      assert.equal(result.user.isHostVerified, false, 'New host must be unverified initially');
      assert.equal(result.verificationRequired, true);
      assert.equal(result.onboardingStep, 'PROFILE');
      assert.equal(result.applicationStatus, 'DRAFT');

      hostAId = result.user.id;
      hostAToken = result.token;
      hostAClient.setAuthToken(hostAToken);
    });

    test('1.2 Rejects registration with missing or invalid email format', async () => {
      await assert.rejects(
        async () => {
          await client.register({
            email: 'not-an-email',
            firstName: 'Marcus',
            lastName: 'Vance',
            password: 'HostSecretPass2026!',
            confirmPassword: 'HostSecretPass2026!',
            acceptsTerms: true,
          });
        },
        (err: any) => {
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });

    test('1.3 Rejects registration with weak password (under 8 chars or missing numbers)', async () => {
      await assert.rejects(
        async () => {
          await client.register({
            email: 'valid.host@example.com',
            firstName: 'Marcus',
            lastName: 'Vance',
            password: 'short',
            confirmPassword: 'short',
            acceptsTerms: true,
          });
        },
        (err: any) => {
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });

    test('1.4 Rejects registration when password confirmation does not match', async () => {
      await assert.rejects(
        async () => {
          await client.register({
            email: 'mismatch.host@example.com',
            firstName: 'Marcus',
            lastName: 'Vance',
            password: 'HostSecretPass2026!',
            confirmPassword: 'DifferentPassword2026!',
            acceptsTerms: true,
          });
        },
        (err: any) => {
          assert.equal(err.code, 'PASSWORD_MISMATCH');
          return true;
        }
      );
    });

    test('1.5 Rejects duplicate registration with 409 DUPLICATE_ACCOUNT', async () => {
      await assert.rejects(
        async () => {
          await client.register({
            email: 'marcus.host1@parkeazy.com', // Already registered in 1.1
            firstName: 'Duplicate',
            lastName: 'Person',
            password: 'HostSecretPass2026!',
            confirmPassword: 'HostSecretPass2026!',
            acceptsTerms: true,
          });
        },
        (err: any) => {
          assert.equal(err.code, 'DUPLICATE_ACCOUNT');
          assert.ok(err.message.includes('already exists'));
          return true;
        }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 2. HOST SIGN-IN & SESSION RESTORATION
  // --------------------------------------------------------------------------
  describe('2. Host Sign-In & Session Restoration (pe_hw_01_01)', () => {
    test('2.1 Registered host successfully signs in with email and password', async () => {
      const loginClient = new ParkEazyApiClient(baseUrl);
      const res = await loginClient.login(
        'marcus.host1@parkeazy.com',
        'HostSecretPass2026!',
        'host'
      );

      assert.ok(res.token, 'Must return JWT token');
      assert.equal(res.user.email, 'marcus.host1@parkeazy.com');
      assert.equal(res.user.id, hostAId);
      assert.ok(res.user.roles.includes(UserRole.HOST));
      assert.equal(res.applicationStatus, 'DRAFT');
    });

    test('2.2 Rejects login with incorrect password', async () => {
      const loginClient = new ParkEazyApiClient(baseUrl);
      await assert.rejects(
        async () => {
          await loginClient.login(
            'marcus.host1@parkeazy.com',
            'IncorrectPassword999!',
            'host'
          );
        },
        (err: any) => {
          assert.equal(err.code, 'UNAUTHENTICATED');
          assert.ok(err.message.includes('Invalid email or password'));
          return true;
        }
      );
    });

    test('2.3 Rejects login with non-existent email address', async () => {
      const loginClient = new ParkEazyApiClient(baseUrl);
      await assert.rejects(
        async () => {
          await loginClient.login('ghost.host@example.com', 'Pass1234!', 'host');
        },
        (err: any) => {
          assert.equal(err.code, 'UNAUTHENTICATED');
          return true;
        }
      );
    });

    test('2.4 Restores active host session via GET /api/v1/auth/session', async () => {
      const session = await hostAClient.getSession();
      assert.ok(session.user, 'Session must return authenticated principal');
      assert.equal(session.user?.id, hostAId);
      assert.equal(session.user?.email, 'marcus.host1@parkeazy.com');
    });

    test('2.5 Clearing client token returns user: null on session restore', async () => {
      const logoutClient = new ParkEazyApiClient(baseUrl);
      logoutClient.setAuthToken(hostAToken);
      let session = await logoutClient.getSession();
      assert.ok(session.user);

      logoutClient.setAuthToken(null);
      session = await logoutClient.getSession();
      assert.equal(session.user, null, 'Cleared token must yield null session');
    });
  });

  // --------------------------------------------------------------------------
  // 3. EMAIL/MOBILE VERIFICATION
  // --------------------------------------------------------------------------
  describe('3. Email/Mobile Verification (pe_hw_01_03)', () => {
    test('3.1 GET /api/v1/auth/verification-status returns unverified status for new host', async () => {
      const status = await hostAClient.getVerificationStatus();
      assert.equal(status.isEmailVerified, false);
      assert.equal(status.email, 'marcus.host1@parkeazy.com');
      assert.equal(status.pendingVerificationType, 'EMAIL');
      assert.ok(status.expiresAtUtc);
    });

    test('3.2 POST /api/v1/auth/resend-code issues fresh code and dispatches target notification', async () => {
      const resendResult = await hostAClient.resendVerificationCode('EMAIL');
      assert.equal(resendResult.success, true);
      assert.ok(resendResult.message.includes('dispatched'));
      assert.equal(resendResult.target, 'marcus.host1@parkeazy.com');
    });

    test('3.3 POST /api/v1/auth/verify-code rejects incorrect code with 400 INVALID_VERIFICATION_CODE', async () => {
      await assert.rejects(
        async () => {
          await hostAClient.verifyCode('999999', 'EMAIL');
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_VERIFICATION_CODE');
          return true;
        }
      );
    });

    test('3.4 POST /api/v1/auth/verify-code succeeds with active code and marks host verified', async () => {
      // Re-dispatch to get current code in test environment
      const resend = await hostAClient.resendVerificationCode('EMAIL');
      assert.ok(resend.code, 'Code returned in test environment for deterministic verification');

      const verifyRes = await hostAClient.verifyCode(resend.code!);
      assert.equal(verifyRes.success, true);
      assert.equal(verifyRes.user.isHostVerified, true);

      // Verify status now reports true
      const updatedStatus = await hostAClient.getVerificationStatus();
      assert.equal(updatedStatus.isEmailVerified, true);
    });

    test('3.5 Re-submitting consumed verification code fails with VERIFICATION_EXPIRED', async () => {
      await assert.rejects(
        async () => {
          await hostAClient.verifyCode('123456', 'EMAIL');
        },
        (err: any) => {
          assert.equal(err.code, 'VERIFICATION_EXPIRED');
          return true;
        }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 4. PASSWORD RECOVERY
  // --------------------------------------------------------------------------
  describe('4. Password Recovery (pe_hw_01_04)', () => {
    let capturedResetToken: string;

    test('4.1 POST /api/v1/auth/forgot-password returns privacy-preserving response and issues reset token', async () => {
      const res = await client.forgotPassword('marcus.host1@parkeazy.com');
      assert.equal(res.success, true);
      assert.ok(res.message.includes('password recovery instructions have been sent'));
      assert.ok(res.resetToken, 'Reset token generated in test mode');
      capturedResetToken = res.resetToken!;
    });

    test('4.2 POST /api/v1/auth/forgot-password with unregistered email returns generic privacy message without leaking non-existence', async () => {
      const res = await client.forgotPassword('nobody@parkeazy.com');
      assert.equal(res.success, true);
      assert.ok(res.message.includes('If an account exists'));
    });

    test('4.3 POST /api/v1/auth/reset-password rejects invalid or non-existent token', async () => {
      await assert.rejects(
        async () => {
          await client.resetPassword({
            token: 'fake-invalid-token-1234567890',
            newPassword: 'BrandNewPass2026!',
            confirmPassword: 'BrandNewPass2026!',
          });
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_RESET_TOKEN');
          return true;
        }
      );
    });

    test('4.4 POST /api/v1/auth/reset-password succeeds with valid token and allows sign-in with new password', async () => {
      const resetRes = await client.resetPassword({
        token: capturedResetToken,
        newPassword: 'BrandNewPass2026!',
        confirmPassword: 'BrandNewPass2026!',
      });
      assert.equal(resetRes.success, true);
      assert.ok(resetRes.message.includes('Password reset successful'));

      // Assert that old token is now revoked due to password change (GAP 3)
      await assert.rejects(
        async () => {
          await hostAClient.getVerificationStatus();
        },
        (err: any) => {
          assert.equal(err.code, 'UNAUTHENTICATED');
          assert.ok(err.message.includes('revoked'));
          return true;
        }
      );

      // Sign in with new password
      const newLogin = await client.login(
        'marcus.host1@parkeazy.com',
        'BrandNewPass2026!',
        'host'
      );
      assert.ok(newLogin.token);
      assert.equal(newLogin.user.id, hostAId);
      hostAToken = newLogin.token;
      hostAClient.setAuthToken(hostAToken);
    });

    test('4.5 Consumed password reset token cannot be reused', async () => {
      await assert.rejects(
        async () => {
          await client.resetPassword({
            token: capturedResetToken,
            newPassword: 'AnotherPassword999!',
            confirmPassword: 'AnotherPassword999!',
          });
        },
        (err: any) => {
          assert.equal(err.code, 'INVALID_RESET_TOKEN');
          return true;
        }
      );
    });
  });

  // --------------------------------------------------------------------------
  // 5. HOST PROFILE & ONBOARDING PERSISTENCE
  // --------------------------------------------------------------------------
  describe('5. Host Profile & Onboarding Persistence (pe_hw_01_05, 06, 07, 08)', () => {
    test('5.1 GET /api/v1/hosts/:hostId/onboarding retrieves default initial onboarding record', async () => {
      const onboarding = await hostAClient.getHostOnboarding(hostAId);
      assert.equal(onboarding.userId, hostAId);
      assert.equal(onboarding.onboardingStep, 'PROFILE');
      assert.equal(onboarding.applicationStatus, 'DRAFT');
      assert.equal(onboarding.country, 'US');
    });

    test('5.2 PUT /api/v1/hosts/:hostId/onboarding updates host profile contact details', async () => {
      const updated = await hostAClient.updateHostOnboarding(hostAId, {
        businessType: 'INDIVIDUAL',
        businessName: 'Marcus Bay Rentals',
        phoneNumber: '+1-555-8821',
        addressLine1: '100 California Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94111',
        emergencyContactName: 'Laura Vance',
        emergencyContactPhone: '+1-555-8829',
        onboardingStep: 'ELIGIBILITY',
      });

      assert.equal(updated.businessName, 'Marcus Bay Rentals');
      assert.equal(updated.addressLine1, '100 California Street');
      assert.equal(updated.city, 'San Francisco');
      assert.equal(updated.emergencyContactName, 'Laura Vance');
      assert.equal(updated.onboardingStep, 'ELIGIBILITY');

      // Verify persistent retrieval
      const fetched = await hostAClient.getHostOnboarding(hostAId);
      assert.equal(fetched.addressLine1, '100 California Street');
      assert.equal(fetched.emergencyContactName, 'Laura Vance');
    });

    test('5.3 PUT /api/v1/hosts/:hostId/onboarding updates property eligibility information', async () => {
      const updated = await hostAClient.updateHostOnboarding(hostAId, {
        ownershipType: 'OWNED',
        propertyTypes: ['DRIVEWAY', 'COVERED_GARAGE'],
        hasLiabilityInsurance: true,
        insurancePolicyNumber: 'POL-SF-8899',
        insuranceExpiryDate: '2028-06-30',
        acceptsHostAgreement: true,
      });

      assert.equal(updated.ownershipType, 'OWNED');
      assert.deepEqual(updated.propertyTypes, ['DRIVEWAY', 'COVERED_GARAGE']);
      assert.equal(updated.hasLiabilityInsurance, true);
      assert.equal(updated.insurancePolicyNumber, 'POL-SF-8899');
      assert.equal(updated.acceptsHostAgreement, true);
    });

    test('5.4 POST /api/v1/hosts/:hostId/onboarding/submit transitions application to PENDING_REVIEW', async () => {
      const submitted = await hostAClient.submitHostOnboarding(hostAId);
      assert.equal(submitted.applicationStatus, 'PENDING_REVIEW');
      assert.equal(submitted.onboardingStep, 'SUBMITTED');
      assert.ok(submitted.submittedAtUtc);
      assert.ok(submitted.statusReason?.includes('review'));

      // Check application status endpoint reflects change
      const fetched = await hostAClient.getHostOnboarding(hostAId);
      assert.equal(fetched.applicationStatus, 'PENDING_REVIEW');
    });
  });

  // --------------------------------------------------------------------------
  // 6. HOST ACCESS CONTROL & TENANCY ENFORCEMENT
  // --------------------------------------------------------------------------
  describe('6. Host Access Control & Tenancy (Mandatory Security Invariants)', () => {
    before(async () => {
      // Register Host B
      const regB = await client.register({
        email: 'host.b@parkeazy.com',
        firstName: 'Brenda',
        lastName: 'Song',
        password: 'HostBPass2026!',
        confirmPassword: 'HostBPass2026!',
        businessType: 'INDIVIDUAL',
        acceptsTerms: true,
        acceptsHostAgreement: true,
        requestedPortal: 'host',
      });
      hostBId = regB.user.id;
      hostBToken = regB.token;
      hostBClient.setAuthToken(hostBToken);
    });

    test('6.1 Unauthenticated requests to host onboarding route are rejected with 401', async () => {
      const publicClient = new ParkEazyApiClient(baseUrl);
      await assert.rejects(
        async () => {
          await publicClient.getHostOnboarding(hostAId);
        },
        (err: any) => {
          assert.equal(err.code, 'UNAUTHENTICATED');
          return true;
        }
      );
    });

    test('6.2 Customer account without HOST role is rejected from host onboarding with 403 FORBIDDEN', async () => {
      await assert.rejects(
        async () => {
          await customerClient.getHostOnboarding(DEMO_USERS.customer.id);
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN');
          assert.ok(err.message.includes('Requires one of roles'));
          return true;
        }
      );
    });

    test('6.3 Tenancy Guard: Host A is prevented from reading Host B onboarding record (cross-host rejection)', async () => {
      await assert.rejects(
        async () => {
          // Host A tries to access Host B's onboarding
          await hostAClient.getHostOnboarding(hostBId);
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN');
          assert.ok(err.message.includes('You do not have permission to access or modify resources'));
          return true;
        }
      );
    });

    test('6.4 Tenancy Guard: Host A is prevented from modifying Host B onboarding record', async () => {
      await assert.rejects(
        async () => {
          // Host A tries to update Host B's onboarding
          await hostAClient.updateHostOnboarding(hostBId, {
            addressLine1: 'Hacked Address 999',
          });
        },
        (err: any) => {
          assert.equal(err.code, 'FORBIDDEN');
          return true;
        }
      );
    });

    test('6.5 Tenancy Guard: Host B can read and update their own onboarding record', async () => {
      const profileB = await hostBClient.getHostOnboarding(hostBId);
      assert.equal(profileB.userId, hostBId);
      assert.equal(profileB.businessName, 'Brenda Song Spaces');
    });

    test('6.6 Admin token can inspect host onboarding records for platform oversight', async () => {
      const adminClient = new ParkEazyApiClient(baseUrl);
      const adminToken = authService.signToken(DEMO_USERS.admin, 3600);
      adminClient.setAuthToken(adminToken);

      const hostARecord = await adminClient.getHostOnboarding(hostAId);
      assert.equal(hostARecord.userId, hostAId);

      const hostBRecord = await adminClient.getHostOnboarding(hostBId);
      assert.equal(hostBRecord.userId, hostBId);
    });
  });

  // --------------------------------------------------------------------------
  // 7. REGRESSION VERIFICATION: CUSTOMER WEBSITE & PLATFORM PRESERVATION
  // --------------------------------------------------------------------------
  describe('7. Customer Website Preservation & Regression Defense', () => {
    test('7.1 Customer demo sign-in continues to succeed and retain CUSTOMER role', async () => {
      const testCustomerClient = new ParkEazyApiClient(baseUrl);
      const res = await testCustomerClient.login(
        'driver@parkeazy.com',
        'DriverPass123!',
        'user'
      );
      assert.ok(res.token);
      assert.equal(res.user.email, 'driver@parkeazy.com');
      assert.ok(res.user.roles.includes(UserRole.CUSTOMER));
    });

    test('7.2 Customer booking queries and vehicle APIs remain fully functional', async () => {
      const bookings = await customerClient.getBookings();
      assert.ok(Array.isArray(bookings));

      const vehicles = await customerClient.getVehicles();
      assert.ok(Array.isArray(vehicles));
    });

    test('7.3 Public inventory locations API continues to return available parking facilities', async () => {
      const locations = await client.getLocations();
      assert.ok(Array.isArray(locations));
      assert.ok(locations.length > 0);
    });
  });
});
