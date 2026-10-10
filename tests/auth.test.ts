import { describe, it, expect, beforeEach } from 'vitest';
import { hashPassword, verifyPassword } from '../services/api/src/modules/auth/password.util';
import { signJwt, verifyJwt, decodeJwt, validateJwtSecret } from '../services/api/src/modules/auth/jwt.util';
import {
  isValidOtp,
  isValidPassword,
  isValidPan,
  isValidGstin,
  isValidIfsc,
  validateLoginPayload,
  validateSignupPayload,
  validateHostKycPayload,
} from '../packages/validation/src';
import { AuthService } from '../services/api/src/modules/auth/auth.service';
import { DatabaseService } from '../services/api/src/database/database.service';
import { DatabaseConfigService } from '../services/api/src/database/database.config';
import { JwtPayload } from '../packages/shared-types/src';

describe('Part 04: Authentication, Accounts, Roles & Tenancy Tests', () => {
  const TEST_SECRET = 'test-secret-key-for-vitest-auth-suite-2026-must-be-long!';

  describe('1. Cryptographic Password Hashing (PBKDF2 + Salt)', () => {
    it('should hash a password and verify it successfully', () => {
      const plaintext = 'SecurePass@2026';
      const hash = hashPassword(plaintext);
      expect(hash).toContain(':');
      const isValid = verifyPassword(plaintext, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect passwords', () => {
      const hash = hashPassword('CorrectPassword123!');
      expect(verifyPassword('WrongPassword123!', hash)).toBe(false);
    });

    it('should generate unique salts for identical passwords', () => {
      const pass = 'IdenticalPassword99!';
      const hash1 = hashPassword(pass);
      const hash2 = hashPassword(pass);
      expect(hash1).not.toBe(hash2);
      expect(verifyPassword(pass, hash1)).toBe(true);
      expect(verifyPassword(pass, hash2)).toBe(true);
    });
  });

  describe('2. Multi-Tenant JWT Token Issuance & Verification', () => {
    it('should sign and verify valid JWT tokens', () => {
      const payload: JwtPayload = {
        sub: '00000000-0000-4000-a000-000000000003',
        tenantId: 'default',
        email: 'driver.arun@parkeazy.com',
        roles: ['customer'],
        fullName: 'Arun Kumar',
        isEmailVerified: true,
        isPhoneVerified: true,
      };

      const token = signJwt(payload, TEST_SECRET, 3600);
      expect(token.split('.').length).toBe(3);

      const verified = verifyJwt(token, TEST_SECRET);
      expect(verified.sub).toBe(payload.sub);
      expect(verified.tenantId).toBe('default');
      expect(verified.roles).toContain('customer');
    });

    it('should reject tokens with tampered signatures', () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        tenantId: 'default',
        email: 'test@parkeazy.com',
        roles: ['customer'],
        isEmailVerified: true,
        isPhoneVerified: false,
      };
      const token = signJwt(payload, TEST_SECRET, 3600);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyJwt(tamperedToken, TEST_SECRET)).toThrow(/signature/i);
    });

    it('should reject expired tokens', () => {
      const payload: JwtPayload = {
        sub: 'user-1',
        tenantId: 'default',
        email: 'test@parkeazy.com',
        roles: ['customer'],
        isEmailVerified: true,
        isPhoneVerified: false,
      };
      const token = signJwt(payload, TEST_SECRET, -10);
      expect(() => verifyJwt(token, TEST_SECRET)).toThrow(/expired/i);
    });

    it('should decode JWT payloads without verifying signature', () => {
      const payload: JwtPayload = {
        sub: 'user-99',
        tenantId: 'custom-tenant',
        email: 'test@example.com',
        roles: ['host'],
        isEmailVerified: true,
        isPhoneVerified: true,
      };
      const token = signJwt(payload, TEST_SECRET, 3600);
      const decoded = decodeJwt(token);
      expect(decoded?.sub).toBe('user-99');
      expect(decoded?.tenantId).toBe('custom-tenant');
    });
  });

  describe('3. Validation Schemas (Auth, Credentials & KYC)', () => {
    it('should validate 6-digit OTP codes', () => {
      expect(isValidOtp('123456')).toBe(true);
      expect(isValidOtp('000000')).toBe(true);
      expect(isValidOtp('12345')).toBe(false);
      expect(isValidOtp('1234567')).toBe(false);
      expect(isValidOtp('abcdef')).toBe(false);
    });

    it('should validate strong password requirements', () => {
      const strong = isValidPassword('ParkEazy@2026');
      expect(strong.valid).toBe(true);
      const weak = isValidPassword('simple');
      expect(weak.valid).toBe(false);
      expect(weak.errors.length).toBeGreaterThan(0);
    });

    it('should validate Indian PAN, GSTIN, and IFSC formats', () => {
      expect(isValidPan('ABCDE1234F')).toBe(true);
      expect(isValidPan('INVALID123')).toBe(false);
      expect(isValidGstin('33AAACR1234F1Z5')).toBe(true);
      expect(isValidGstin('12345')).toBe(false);
      expect(isValidIfsc('HDFC0001089')).toBe(true);
      expect(isValidIfsc('BADIFSC1')).toBe(false);
    });

    it('should validate signup payloads', () => {
      const valid = validateSignupPayload({
        email: 'test.driver@example.com',
        fullName: 'Test Driver',
        phone: '+919876543210',
        password: 'Password@123',
        tenantId: 'default',
        role: 'customer',
      });
      expect(valid.success).toBe(true);
      expect(valid.data?.email).toBe('test.driver@example.com');

      const invalid = validateSignupPayload({
        email: 'not-an-email',
        fullName: 'A',
      });
      expect(invalid.success).toBe(false);
      expect(invalid.errors?.length).toBeGreaterThan(0);
    });

    it('should validate host commercial KYC payloads', () => {
      const valid = validateHostKycPayload({
        panNumber: 'AAACR1234F',
        gstin: '33AAACR1234F1Z5',
        bankAccountNumber: '918273645019',
        bankIfsc: 'HDFC0001089',
        bankName: 'HDFC Bank, Anna Nagar',
        businessName: 'Chennai Parking Ops',
      });
      expect(valid.success).toBe(true);

      const invalid = validateHostKycPayload({
        panNumber: 'INVALID_PAN',
        bankAccountNumber: '123',
        bankIfsc: 'BAD',
        bankName: '',
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe('4. AuthService Authentication & Registration Workflows', () => {
    let authService: AuthService;

    beforeEach(() => {
      const configService = new DatabaseConfigService();
      const databaseService = new DatabaseService(configService);
      authService = new AuthService(databaseService);
    });

    it('should register a new customer account', async () => {
      const email = `new.driver.${Date.now()}@parkeazy.com`;
      const res = await authService.register({
        email,
        fullName: 'New Registered Driver',
        password: 'ParkEazy@2026',
        tenantId: 'default',
        role: 'customer',
      });

      expect(res.user.email).toBe(email);
      expect(res.user.roles).toContain('customer');
      expect(res.tokens.accessToken).toBeDefined();
      expect(res.tokens.refreshToken).toBeDefined();
    });

    it('should prevent duplicate registration with the same email', async () => {
      const email = `duplicate.${Date.now()}@parkeazy.com`;
      await authService.register({
        email,
        fullName: 'First Driver',
        password: 'ParkEazy@2026',
        tenantId: 'default',
      });

      await expect(
        authService.register({
          email,
          fullName: 'Second Driver',
          password: 'ParkEazy@2026',
          tenantId: 'default',
        })
      ).rejects.toThrow(/already registered/i);
    });

    it('should authenticate user with valid credentials', async () => {
      const email = `login.test.${Date.now()}@parkeazy.com`;
      await authService.register({
        email,
        fullName: 'Login Test User',
        password: 'SecretPass@2026',
        tenantId: 'default',
      });

      const loginRes = await authService.login({
        email,
        password: 'SecretPass@2026',
        tenantId: 'default',
      });

      expect(loginRes.user.email).toBe(email);
      expect(loginRes.tokens.accessToken).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const email = `wrong.pass.${Date.now()}@parkeazy.com`;
      await authService.register({
        email,
        fullName: 'Wrong Pass User',
        password: 'SecretPass@2026',
        tenantId: 'default',
      });

      await expect(
        authService.login({
          email,
          password: 'IncorrectPassword!99',
          tenantId: 'default',
        })
      ).rejects.toThrow(/invalid email or password/i);
    });
  });

  describe('5. OTP Challenge Issuance & Verification Lifecycle', () => {
    let authService: AuthService;

    beforeEach(() => {
      const configService = new DatabaseConfigService();
      const databaseService = new DatabaseService(configService);
      authService = new AuthService(databaseService);
    });

    it('should issue an unpredictable 6-digit OTP challenge', async () => {
      const destination = '+919876543210';
      const challenge = await authService.sendOtp({
        destination,
        channel: 'sms',
        purpose: 'login',
        tenantId: 'default',
      });

      expect(challenge.challengeId).toBeDefined();
      expect(challenge.destinationMasked).toContain('+91');
      expect(challenge.destinationMasked).toContain('3210');
      expect(challenge.expiresInSeconds).toBe(300);
      expect(challenge.mockCodeNotice).toBeDefined();
    });

    it('should verify OTP and activate user account', async () => {
      const destination = `+9198765${Math.floor(10000 + Math.random() * 90000)}`;
      const challenge = await authService.sendOtp({
        destination,
        channel: 'sms',
        purpose: 'signup',
        tenantId: 'default',
      });

      const codeMatch = challenge.mockCodeNotice?.match(/\d{6}/);
      const code = codeMatch ? codeMatch[0] : '123456';

      const verifyRes = await authService.verifyOtp({
        challengeId: challenge.challengeId,
        code,
        destination,
        tenantId: 'default',
      });

      expect(verifyRes.user.isPhoneVerified).toBe(true);
      expect(verifyRes.tokens.accessToken).toBeDefined();
    });

    it('should reject incorrect OTP code', async () => {
      const challenge = await authService.sendOtp({
        destination: '+919999988888',
        channel: 'sms',
        purpose: 'login',
        tenantId: 'default',
      });

      await expect(
        authService.verifyOtp({
          challengeId: challenge.challengeId,
          code: '000000',
          destination: '+919999988888',
          tenantId: 'default',
        })
      ).rejects.toThrow(/incorrect verification code/i);
    });
  });

  describe('6. Password Recovery & Enumeration-Safe Reset', () => {
    let authService: AuthService;

    beforeEach(() => {
      const configService = new DatabaseConfigService();
      const databaseService = new DatabaseService(configService);
      authService = new AuthService(databaseService);
    });

    it('should return enumeration-safe uniform response for forgot-password', async () => {
      const res = await authService.forgotPassword({
        email: 'nonexistent.user.999@example.com',
        tenantId: 'default',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('If an account exists');
    });

    it('should complete password reset with valid token and invalidate old credentials', async () => {
      const email = `reset.flow.${Date.now()}@parkeazy.com`;
      await authService.register({
        email,
        fullName: 'Reset User',
        password: 'OldPassword@2026',
        tenantId: 'default',
      });

      const forgotRes = await authService.forgotPassword({
        email,
        tenantId: 'default',
      });

      expect(forgotRes.resetToken).toBeDefined();

      const resetRes = await authService.resetPassword({
        token: forgotRes.resetToken!,
        newPassword: 'BrandNewPassword@2026',
        tenantId: 'default',
      });

      expect(resetRes.success).toBe(true);

      // Old password must fail
      await expect(
        authService.login({
          email,
          password: 'OldPassword@2026',
          tenantId: 'default',
        })
      ).rejects.toThrow();

      // New password must succeed
      const newLogin = await authService.login({
        email,
        password: 'BrandNewPassword@2026',
        tenantId: 'default',
      });
      expect(newLogin.user.email).toBe(email);
    });
  });

  describe('7. Security Remediation Guarantees', () => {
    it('should halt on insecure JWT secrets in production', () => {
      const origEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        expect(() => validateJwtSecret('')).toThrow(/production requires/i);
        expect(() => validateJwtSecret('parkeazy-development-super-secret-key-2026!')).toThrow(/known development/i);
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });
});
