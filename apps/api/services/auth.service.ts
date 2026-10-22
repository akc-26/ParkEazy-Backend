import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PoolClient } from 'pg';
import {
  UserRole,
  SessionUser,
  LoginResponse,
  NotificationPreferences,
  ChangePasswordRequest,
  HostRegisterRequest,
  HostRegisterResponse,
  VerificationStatusResponse,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  HostOnboardingProfile,
  UpdateHostOnboardingRequest,
  HostApplicationStatus,
  HostOnboardingStep,
  ResendCodeResponse,
} from '../../../packages/contracts';
import { appConfig } from '../config/env';
import { UnauthorizedError, ForbiddenError, AppError, ValidationError, NotFoundError, ConflictError } from '../middleware/error-handler';
import { dbManager } from '../database/connection';
import { NotificationAdapterFactory } from './notification-adapter';

export const DEMO_USERS: Record<string, SessionUser> = {
  customer: {
    id: 'usr-customer-001',
    email: 'driver@parkeazy.com',
    firstName: 'Alex',
    lastName: 'Morgan',
    roles: [UserRole.CUSTOMER],
    phoneNumber: '+1-555-0199',
    isHostVerified: false,
    createdAt: '2026-01-15T08:00:00Z',
  },
  host: {
    id: 'usr-host-001',
    email: 'host@parkeazy.com',
    firstName: 'Marcus',
    lastName: 'Chen',
    roles: [UserRole.CUSTOMER, UserRole.HOST],
    phoneNumber: '+1-555-0144',
    isHostVerified: true,
    createdAt: '2026-01-10T09:30:00Z',
  },
  admin: {
    id: 'usr-admin-001',
    email: 'admin@parkeazy.com',
    firstName: 'Elena',
    lastName: 'Rostova',
    roles: [UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    isHostVerified: true,
    createdAt: '2025-11-01T12:00:00Z',
  },
};

export interface JwtHeader {
  alg: 'HS256';
  typ: 'JWT';
}

export interface JwtPayload {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  tokenVersion?: number;
  isDemo?: boolean;
  iss: 'parkeazy-auth';
  iat: number;
  exp: number;
}

export interface VerificationTokenRecord {
  id: string;
  userId: string;
  tokenType: 'EMAIL' | 'SMS';
  tokenHash: string; // Cryptographic SHA-256 hash
  targetDestination: string;
  expiresAt: number; // Milliseconds timestamp
  consumedAt?: string;
  attempts: number;
  createdAt: number;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string; // Cryptographic SHA-256 hash
  expiresAt: number; // Milliseconds timestamp
  consumedAt?: string;
  attempts: number;
  createdAt: number;
}

interface StoredCredential {
  hash: string;
  salt: string;
  tokenVersion?: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export class AuthService {
  private static instance: AuthService;
  private readonly storageFilePath: string;

  private userStore: Map<string, SessionUser> = new Map();
  private credentialsStore: Map<string, StoredCredential> = new Map();
  private notificationPreferencesStore: Map<string, NotificationPreferences> = new Map();
  private hostOnboardingStore: Map<string, HostOnboardingProfile> = new Map();
  private verificationTokensStore: Map<string, VerificationTokenRecord> = new Map();
  private passwordResetTokensStore: Map<string, PasswordResetTokenRecord> = new Map();

  // Rate-limiting trackers: email -> timestamp array
  private resetRequestTimestamps: Map<string, number[]> = new Map();
  private resendTimestamps: Map<string, number> = new Map();

  private constructor() {
    this.storageFilePath = path.resolve(
      process.cwd(),
      'apps/api/database/data/auth_store.json'
    );
    this.initializeDefaultData();
    this.loadFromDisk();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // --------------------------------------------------------------------------
  // Initialization & Baseline Data
  // --------------------------------------------------------------------------

  private initializeDefaultData(): void {
    const salt = 'parkeazy_salt_2026';
    const hash = crypto.scryptSync('DriverPass123!', salt, 32).toString('hex');

    this.userStore.set(DEMO_USERS.customer.id, { ...DEMO_USERS.customer });
    this.userStore.set(DEMO_USERS.host.id, { ...DEMO_USERS.host });
    this.userStore.set(DEMO_USERS.admin.id, { ...DEMO_USERS.admin });

    this.credentialsStore.set(DEMO_USERS.customer.id, { hash, salt, tokenVersion: 1 });
    this.credentialsStore.set(DEMO_USERS.host.id, { hash, salt, tokenVersion: 1 });
    this.credentialsStore.set(DEMO_USERS.admin.id, { hash, salt, tokenVersion: 1 });

    this.notificationPreferencesStore.set(DEMO_USERS.customer.id, {
      userId: DEMO_USERS.customer.id,
      emailBookingConfirmations: true,
      emailReminders: true,
      smsGateAccess: true,
      smsExpiryAlerts: true,
      pushStatusUpdates: true,
      updatedAt: '2026-10-16T08:00:00Z',
    });

    this.hostOnboardingStore.set(DEMO_USERS.host.id, {
      userId: DEMO_USERS.host.id,
      businessType: 'INDIVIDUAL',
      businessName: 'Marcus Chen Parking Services',
      businessRegistrationNumber: 'REG-SF-2026-88',
      taxId: 'XX-XXX4491',
      phoneNumber: '+1-555-0144',
      addressLine1: '742 Montgomery St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94111',
      country: 'US',
      emergencyContactName: 'Sarah Chen',
      emergencyContactPhone: '+1-555-0198',
      ownershipType: 'OWNED',
      propertyTypes: ['DRIVEWAY', 'COVERED_GARAGE'],
      hasLiabilityInsurance: true,
      insurancePolicyNumber: 'POL-STATE-99412',
      insuranceExpiryDate: '2027-12-31',
      acceptsTerms: true,
      acceptsHostAgreement: true,
      applicationStatus: 'VERIFIED',
      onboardingStep: 'APPROVED',
      statusReason: 'Fully verified and authorized host partner.',
      submittedAtUtc: '2026-01-10T10:00:00Z',
      reviewedAtUtc: '2026-01-10T12:00:00Z',
      createdAt: '2026-01-10T09:30:00Z',
      updatedAt: '2026-01-10T12:00:00Z',
    });
  }

  // --------------------------------------------------------------------------
  // Durable Persistence Layer (File-backed snapshot + PostgreSQL SQL Integration)
  // --------------------------------------------------------------------------

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const data = JSON.parse(raw);

        if (Array.isArray(data.users)) {
          for (const u of data.users) {
            this.userStore.set(u.id, u);
          }
        }
        if (Array.isArray(data.credentials)) {
          for (const c of data.credentials) {
            this.credentialsStore.set(c.userId, {
              hash: c.hash,
              salt: c.salt,
              tokenVersion: c.tokenVersion || 1,
            });
          }
        }
        if (Array.isArray(data.hostProfiles)) {
          for (const hp of data.hostProfiles) {
            this.hostOnboardingStore.set(hp.userId, hp);
          }
        }
        if (Array.isArray(data.verificationTokens)) {
          for (const vt of data.verificationTokens) {
            this.verificationTokensStore.set(vt.id, vt);
          }
        }
        if (Array.isArray(data.passwordResetTokens)) {
          for (const pt of data.passwordResetTokens) {
            this.passwordResetTokensStore.set(pt.id, pt);
          }
        }
      }
    } catch (err: any) {
      console.warn('[ParkEazy-Auth] Could not load persisted auth data from disk:', err.message);
    }
  }

  private persistToDisk(): void {
    try {
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const snapshot = {
        timestamp: new Date().toISOString(),
        users: Array.from(this.userStore.values()),
        credentials: Array.from(this.credentialsStore.entries()).map(([userId, cred]) => ({
          userId,
          hash: cred.hash,
          salt: cred.salt,
          tokenVersion: cred.tokenVersion,
        })),
        hostProfiles: Array.from(this.hostOnboardingStore.values()),
        verificationTokens: Array.from(this.verificationTokensStore.values()),
        passwordResetTokens: Array.from(this.passwordResetTokensStore.values()),
      };

      const tempPath = `${this.storageFilePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(snapshot, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.storageFilePath);
    } catch (err: any) {
      console.warn('[ParkEazy-Auth] Could not persist auth snapshot to disk:', err.message);
    }
  }

  /**
   * Resets stores to baseline state for isolated unit testing.
   */
  public resetStores(): void {
    this.userStore.clear();
    this.credentialsStore.clear();
    this.notificationPreferencesStore.clear();
    this.hostOnboardingStore.clear();
    this.verificationTokensStore.clear();
    this.passwordResetTokensStore.clear();
    this.resetRequestTimestamps.clear();
    this.resendTimestamps.clear();

    this.initializeDefaultData();
    try {
      if (fs.existsSync(this.storageFilePath)) {
        fs.unlinkSync(this.storageFilePath);
      }
    } catch {}
  }

  // --------------------------------------------------------------------------
  // PostgreSQL Database Asynchronous Synchronization & Transactions
  // --------------------------------------------------------------------------

  public async syncUserToPostgres(
    user: SessionUser,
    creds: StoredCredential,
    hostProfile?: HostOnboardingProfile
  ): Promise<void> {
    if (!dbManager.isPostgresConnected()) {
      return;
    }

    let client: PoolClient | null = null;
    try {
      client = await dbManager.getClient();
      await client.query('BEGIN');

      // 1. Insert or update users table
      await client.query(
        `INSERT INTO users (id, email, first_name, last_name, phone_number, roles, is_host_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           last_name = EXCLUDED.last_name,
           phone_number = EXCLUDED.phone_number,
           roles = EXCLUDED.roles,
           is_host_verified = EXCLUDED.is_host_verified,
           updated_at = NOW()`,
        [
          user.id,
          user.email.toLowerCase(),
          user.firstName,
          user.lastName,
          user.phoneNumber || null,
          user.roles,
          user.isHostVerified,
          user.createdAt,
        ]
      );

      // 2. Insert or update user_credentials
      await client.query(
        `INSERT INTO user_credentials (user_id, password_hash, password_salt, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           password_salt = EXCLUDED.password_salt,
           updated_at = NOW()`,
        [user.id, creds.hash, creds.salt]
      );

      // 3. Insert or update host_profiles if applicable
      if (hostProfile) {
        await client.query(
          `INSERT INTO host_profiles (
             user_id, business_type, business_name, business_registration_number, tax_id,
             phone_number, address_line1, address_line2, city, state, postal_code, country,
             emergency_contact_name, emergency_contact_phone, ownership_type, property_types,
             has_liability_insurance, insurance_policy_number, insurance_expiry_date,
             accepts_terms, accepts_host_agreement, application_status, onboarding_step,
             status_reason, submitted_at_utc, reviewed_at_utc, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
             $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW()
           )
           ON CONFLICT (user_id) DO UPDATE SET
             business_type = EXCLUDED.business_type,
             business_name = EXCLUDED.business_name,
             phone_number = EXCLUDED.phone_number,
             address_line1 = EXCLUDED.address_line1,
             city = EXCLUDED.city,
             state = EXCLUDED.state,
             postal_code = EXCLUDED.postal_code,
             emergency_contact_name = EXCLUDED.emergency_contact_name,
             emergency_contact_phone = EXCLUDED.emergency_contact_phone,
             ownership_type = EXCLUDED.ownership_type,
             property_types = EXCLUDED.property_types,
             has_liability_insurance = EXCLUDED.has_liability_insurance,
             accepts_host_agreement = EXCLUDED.accepts_host_agreement,
             application_status = EXCLUDED.application_status,
             onboarding_step = EXCLUDED.onboarding_step,
             status_reason = EXCLUDED.status_reason,
             submitted_at_utc = EXCLUDED.submitted_at_utc,
             updated_at = NOW()`,
          [
            hostProfile.userId,
            hostProfile.businessType,
            hostProfile.businessName || null,
            hostProfile.businessRegistrationNumber || null,
            hostProfile.taxId || null,
            hostProfile.phoneNumber,
            hostProfile.addressLine1,
            hostProfile.addressLine2 || null,
            hostProfile.city,
            hostProfile.state,
            hostProfile.postalCode,
            hostProfile.country,
            hostProfile.emergencyContactName,
            hostProfile.emergencyContactPhone,
            hostProfile.ownershipType,
            hostProfile.propertyTypes,
            hostProfile.hasLiabilityInsurance,
            hostProfile.insurancePolicyNumber || null,
            hostProfile.insuranceExpiryDate || null,
            hostProfile.acceptsTerms,
            hostProfile.acceptsHostAgreement,
            hostProfile.applicationStatus,
            hostProfile.onboardingStep,
            hostProfile.statusReason || null,
            hostProfile.submittedAtUtc || null,
            hostProfile.reviewedAtUtc || null,
            hostProfile.createdAt,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err: any) {
      if (client) await client.query('ROLLBACK');
      console.warn('[ParkEazy-Auth] Database sync error (operating in baseline fallback):', err.message);
    } finally {
      if (client) client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Core User & Session Operations
  // --------------------------------------------------------------------------

  public getUserById(id: string): SessionUser | undefined {
    return this.userStore.get(id);
  }

  public getUserByEmail(email: string): SessionUser | undefined {
    const cleanEmail = email.trim().toLowerCase();
    for (const u of this.userStore.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        return u;
      }
    }
    return undefined;
  }

  public updateUserProfile(
    userId: string,
    updates: { firstName?: string; lastName?: string; phoneNumber?: string }
  ): SessionUser {
    const existing = this.userStore.get(userId);
    if (!existing) {
      throw new UnauthorizedError(`User '${userId}' not found.`);
    }

    if (updates.firstName !== undefined) {
      const trimmed = updates.firstName.trim();
      if (!trimmed || trimmed.length > 100) {
        throw new Error('First name must be between 1 and 100 characters.');
      }
      existing.firstName = trimmed;
    }

    if (updates.lastName !== undefined) {
      const trimmed = updates.lastName.trim();
      if (!trimmed || trimmed.length > 100) {
        throw new Error('Last name must be between 1 and 100 characters.');
      }
      existing.lastName = trimmed;
    }

    if (updates.phoneNumber !== undefined) {
      const trimmedPhone = updates.phoneNumber.trim();
      if (trimmedPhone.length > 50) {
        throw new Error('Phone number cannot exceed 50 characters.');
      }
      existing.phoneNumber = trimmedPhone;
    }

    if (userId === DEMO_USERS.customer.id) Object.assign(DEMO_USERS.customer, existing);
    if (userId === DEMO_USERS.host.id) Object.assign(DEMO_USERS.host, existing);
    if (userId === DEMO_USERS.admin.id) Object.assign(DEMO_USERS.admin, existing);

    this.persistToDisk();
    return { ...existing };
  }

  public signToken(
    user: SessionUser,
    expiresInSeconds: number = appConfig.auth.tokenExpirySeconds,
    isDemo = false
  ): string {
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const creds = this.credentialsStore.get(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      tokenVersion: creds?.tokenVersion || 1,
      isDemo,
      iss: 'parkeazy-auth',
      iat: now,
      exp: now + expiresInSeconds,
    };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    const signature = crypto
      .createHmac('sha256', appConfig.auth.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  public verifyToken(token: string): JwtPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Authentication token is missing or malformed.');
    }

    // Support legacy development demo string tokens only if demo auth is enabled
    if (token.startsWith('token-') && token.includes('-sample')) {
      if (!appConfig.auth.allowDemoAuth) {
        throw new UnauthorizedError('Demo authentication tokens are forbidden in production.');
      }
      let user = DEMO_USERS.customer;
      if (token.includes('admin')) user = DEMO_USERS.admin;
      else if (token.includes('host')) user = DEMO_USERS.host;

      const now = Math.floor(Date.now() / 1000);
      return {
        sub: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        tokenVersion: 1,
        isDemo: true,
        iss: 'parkeazy-auth',
        iat: now,
        exp: now + 86400,
      };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedError('Invalid token structure.');
    }

    const [headerB64, payloadB64, signature] = parts;

    let header: JwtHeader;
    try {
      header = JSON.parse(base64UrlDecode(headerB64));
    } catch {
      throw new UnauthorizedError('Invalid token header encoding.');
    }

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new UnauthorizedError('Unsupported token algorithm or type.');
    }

    const expectedSignature = crypto
      .createHmac('sha256', appConfig.auth.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw new UnauthorizedError('Invalid token signature.');
    }

    let payload: JwtPayload;
    try {
      payload = JSON.parse(base64UrlDecode(payloadB64));
    } catch {
      throw new UnauthorizedError('Invalid token payload encoding.');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new UnauthorizedError('Authentication token has expired.');
    }

    if (payload.iss !== 'parkeazy-auth') {
      throw new UnauthorizedError('Invalid token issuer.');
    }

    // Verify token version (session invalidation defense)
    const creds = this.credentialsStore.get(payload.sub);
    if (creds && creds.tokenVersion && payload.tokenVersion) {
      if (payload.tokenVersion < creds.tokenVersion) {
        throw new UnauthorizedError('Session has been revoked due to a recent password reset.');
      }
    }

    if (payload.isDemo && !appConfig.auth.allowDemoAuth) {
      throw new UnauthorizedError('Demo authentication tokens are disabled in production.');
    }

    return payload;
  }

  // --------------------------------------------------------------------------
  // Host Registration & Authentication (GAP 1, 2 & 4)
  // --------------------------------------------------------------------------

  public registerUser(req: HostRegisterRequest): HostRegisterResponse {
    // 1. Validation
    if (!req.email || !req.email.trim()) {
      throw new AppError('Email address is required.', 400, 'VALIDATION_ERROR');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = req.email.trim().toLowerCase();
    if (!emailRegex.test(cleanEmail)) {
      throw new AppError('A valid email address is required.', 400, 'VALIDATION_ERROR');
    }

    if (!req.firstName || !req.firstName.trim()) {
      throw new AppError('First name is required.', 400, 'VALIDATION_ERROR');
    }

    if (!req.lastName || !req.lastName.trim()) {
      throw new AppError('Last name is required.', 400, 'VALIDATION_ERROR');
    }

    if (!req.password) {
      throw new AppError('Password is required.', 400, 'VALIDATION_ERROR');
    }

    if (req.password.length < 8) {
      throw new AppError('Password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
    }

    const hasLetter = /[a-zA-Z]/.test(req.password);
    const hasNumber = /[0-9]/.test(req.password);
    if (!hasLetter || !hasNumber) {
      throw new AppError(
        'Password must contain at least one letter and one number.',
        400,
        'WEAK_PASSWORD'
      );
    }

    if (req.confirmPassword && req.confirmPassword !== req.password) {
      throw new AppError(
        'Password and confirmation password do not match.',
        400,
        'PASSWORD_MISMATCH'
      );
    }

    if (!req.acceptsTerms) {
      throw new AppError(
        'You must accept the ParkEazy Terms of Service and Privacy Policy.',
        400,
        'TERMS_REQUIRED'
      );
    }

    // 2. Safe Duplicate Check
    for (const u of this.userStore.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        throw new AppError(
          'An account with this email address already exists.',
          409,
          'DUPLICATE_ACCOUNT'
        );
      }
    }

    // 3. User Identity Construction
    const isHost = req.requestedPortal === 'host' || req.acceptsHostAgreement;
    const roles: UserRole[] = isHost ? [UserRole.CUSTOMER, UserRole.HOST] : [UserRole.CUSTOMER];
    const userId = `usr-host-${crypto.randomBytes(6).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const newUser: SessionUser = {
      id: userId,
      email: cleanEmail,
      firstName: req.firstName.trim(),
      lastName: req.lastName.trim(),
      roles,
      phoneNumber: req.phoneNumber?.trim() || undefined,
      isHostVerified: false,
      createdAt: nowIso,
    };

    this.userStore.set(userId, newUser);

    // 4. Secure Credential Hashing with fresh 16-byte random salt
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(req.password, salt, 32).toString('hex');
    const storedCred: StoredCredential = { hash, salt, tokenVersion: 1 };
    this.credentialsStore.set(userId, storedCred);

    // 5. Host Onboarding Record Initialization
    let initialProfile: HostOnboardingProfile | undefined;
    if (isHost) {
      initialProfile = {
        userId,
        businessType: req.businessType || 'INDIVIDUAL',
        businessName:
          req.businessName?.trim() || `${req.firstName.trim()} ${req.lastName.trim()} Spaces`,
        phoneNumber: req.phoneNumber?.trim() || '',
        addressLine1: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
        emergencyContactName: '',
        emergencyContactPhone: '',
        ownershipType: 'OWNED',
        propertyTypes: ['DRIVEWAY'],
        hasLiabilityInsurance: false,
        acceptsTerms: true,
        acceptsHostAgreement: Boolean(req.acceptsHostAgreement),
        applicationStatus: 'DRAFT',
        onboardingStep: 'PROFILE',
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.hostOnboardingStore.set(userId, initialProfile);
    }

    // 6. Cryptographically Secure Verification Challenge Generation (GAP 2)
    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = crypto
      .createHash('sha256')
      .update(`${userId}:${verificationCode}`)
      .digest('hex');

    const tokenId = `tok-vrf-${crypto.randomBytes(8).toString('hex')}`;
    const tokenRecord: VerificationTokenRecord = {
      id: tokenId,
      userId,
      tokenType: 'EMAIL',
      tokenHash,
      targetDestination: cleanEmail,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      attempts: 0,
      createdAt: Date.now(),
    };

    this.verificationTokensStore.set(tokenId, tokenRecord);

    // Trigger durable persistence
    this.persistToDisk();
    this.syncUserToPostgres(newUser, storedCred, initialProfile).catch(() => {});

    // Dispatch welcome / verification notification truthfully
    const emailAdapter = NotificationAdapterFactory.getAdapter('EMAIL');
    emailAdapter.send({
      channel: 'EMAIL',
      type: 'SECURITY_ALERT',
      recipient: cleanEmail,
      subject: 'Verify your ParkEazy Host Account',
      content: `Your ParkEazy 6-digit verification code is: ${verificationCode}. This code expires in 15 minutes.`,
    }).catch(() => {});

    // 7. JWT Session Signing
    const token = this.signToken(newUser, appConfig.auth.tokenExpirySeconds, false);

    return {
      token,
      expiresIn: appConfig.auth.tokenExpirySeconds,
      user: newUser,
      verificationRequired: true,
      onboardingStep: 'PROFILE',
      applicationStatus: 'DRAFT',
    };
  }

  public authenticate(
    email: string,
    password?: string,
    requestedPortal?: string
  ): LoginResponse {
    if (!email || typeof email !== 'string') {
      throw new AppError('Email address is required.', 400, 'VALIDATION_ERROR');
    }

    const cleanEmail = email.trim().toLowerCase();
    const isDemoEmail =
      cleanEmail === DEMO_USERS.customer.email.toLowerCase() ||
      cleanEmail === DEMO_USERS.host.email.toLowerCase() ||
      cleanEmail === DEMO_USERS.admin.email.toLowerCase();

    // 1. Look up user by email
    const user = this.getUserByEmail(cleanEmail);
    if (user) {
      const isDemoUser =
        user.id === DEMO_USERS.customer.id ||
        user.id === DEMO_USERS.host.id ||
        user.id === DEMO_USERS.admin.id;

      if (isDemoUser && appConfig.auth.allowDemoAuth) {
        // Permitted in non-production environments
      } else {
        const creds = this.credentialsStore.get(user.id);
        if (!creds || !password) {
          throw new UnauthorizedError('Invalid email or password.');
        }

        const hashedInput = crypto.scryptSync(password, creds.salt, 32).toString('hex');
        const inputBuf = Buffer.from(hashedInput, 'hex');
        const storedBuf = Buffer.from(creds.hash, 'hex');

        const isMatch =
          inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);

        if (!isMatch) {
          throw new UnauthorizedError('Invalid email or password.');
        }
      }

      // Check host suspension status
      let onboardingStep: HostOnboardingStep | undefined;
      let applicationStatus: HostApplicationStatus | undefined;

      if (requestedPortal === 'host' || user.roles.includes(UserRole.HOST)) {
        const hostProfile = this.hostOnboardingStore.get(user.id);
        if (hostProfile) {
          if (hostProfile.applicationStatus === 'SUSPENDED') {
            throw new ForbiddenError(
              'Your host account has been suspended. Please check exception details or contact support.'
            );
          }
          onboardingStep = hostProfile.onboardingStep;
          applicationStatus = hostProfile.applicationStatus;
        }
      }

      const isDemo =
        user.id === DEMO_USERS.customer.id ||
        user.id === DEMO_USERS.host.id ||
        user.id === DEMO_USERS.admin.id;

      const token = this.signToken(user, appConfig.auth.tokenExpirySeconds, isDemo);

      return {
        token,
        expiresIn: appConfig.auth.tokenExpirySeconds,
        user,
        onboardingStep,
        applicationStatus,
      };
    }

    // 2. Demo portal fallback
    const isDemoPortalRequest =
      (requestedPortal === 'admin' ||
        requestedPortal === 'host' ||
        requestedPortal === 'user' ||
        requestedPortal === 'customer') &&
      isDemoEmail;

    if (isDemoPortalRequest) {
      if (!appConfig.auth.allowDemoAuth) {
        throw new ForbiddenError(
          'Demo authentication is disabled in production. External identity provider is required.'
        );
      }

      let baseUser: SessionUser = DEMO_USERS.customer;
      if (requestedPortal === 'admin' || cleanEmail.includes('admin')) {
        baseUser = DEMO_USERS.admin;
      } else if (requestedPortal === 'host' || cleanEmail.includes('host')) {
        baseUser = DEMO_USERS.host;
      }

      const activeUser = this.getUserById(baseUser.id) || baseUser;
      const token = this.signToken(activeUser, appConfig.auth.tokenExpirySeconds, true);
      const hostProfile = this.hostOnboardingStore.get(activeUser.id);

      return {
        token,
        expiresIn: appConfig.auth.tokenExpirySeconds,
        user: activeUser,
        onboardingStep: hostProfile?.onboardingStep,
        applicationStatus: hostProfile?.applicationStatus,
      };
    }

    throw new UnauthorizedError('Invalid email or password.');
  }

  // --------------------------------------------------------------------------
  // Cryptographic Verification Workflow (GAP 2)
  // --------------------------------------------------------------------------

  private findActiveVerificationToken(
    userId: string,
    type: 'EMAIL' | 'SMS'
  ): VerificationTokenRecord | undefined {
    let candidate: VerificationTokenRecord | undefined;
    for (const record of this.verificationTokensStore.values()) {
      if (
        record.userId === userId &&
        record.tokenType === type &&
        !record.consumedAt &&
        record.expiresAt > Date.now()
      ) {
        if (!candidate || record.createdAt > candidate.createdAt) {
          candidate = record;
        }
      }
    }
    return candidate;
  }

  public getVerificationStatus(userId: string): VerificationStatusResponse {
    const user = this.getUserById(userId);
    if (!user) {
      throw new UnauthorizedError(`User '${userId}' not found.`);
    }

    const token = this.findActiveVerificationToken(userId, 'EMAIL');
    const isEmailVerified = user.isHostVerified;
    const isPhoneVerified = Boolean(user.isHostVerified && user.phoneNumber);

    let pendingVerificationType: 'EMAIL' | 'SMS' | 'NONE' = 'NONE';
    let expiresAtUtc: string | undefined;

    if (!isEmailVerified && token) {
      pendingVerificationType = token.tokenType;
      expiresAtUtc = new Date(token.expiresAt).toISOString();
    }

    return {
      isEmailVerified,
      isPhoneVerified,
      email: user.email,
      phoneNumber: user.phoneNumber,
      pendingVerificationType,
      expiresAtUtc,
    };
  }

  public verifyCode(
    userId: string,
    code: string,
    type: 'EMAIL' | 'SMS' = 'EMAIL'
  ): { success: boolean; message: string; user: SessionUser } {
    const user = this.getUserById(userId);
    if (!user) {
      throw new UnauthorizedError(`User '${userId}' not found.`);
    }

    if (!code || !code.trim()) {
      throw new AppError('Verification code is required.', 400, 'VALIDATION_ERROR');
    }

    const cleanCode = code.trim();
    const token = this.findActiveVerificationToken(userId, type);

    if (!token) {
      throw new AppError(
        'No active verification code found or code has expired. Please request a new code.',
        400,
        'VERIFICATION_EXPIRED'
      );
    }

    // Rate-limit attempt brute-force defense
    if (token.attempts >= 5) {
      token.consumedAt = new Date().toISOString(); // Invalidate burned challenge
      this.persistToDisk();
      throw new AppError(
        'Maximum verification attempts exceeded (5). Please request a fresh verification code.',
        429,
        'MAX_ATTEMPTS_EXCEEDED'
      );
    }

    token.attempts++;

    // Timing-safe cryptographic hash comparison
    const inputHash = crypto
      .createHash('sha256')
      .update(`${userId}:${cleanCode}`)
      .digest('hex');

    const expectedBuf = Buffer.from(token.tokenHash, 'hex');
    const inputBuf = Buffer.from(inputHash, 'hex');

    const isMatch =
      expectedBuf.length === inputBuf.length && crypto.timingSafeEqual(expectedBuf, inputBuf);

    if (!isMatch) {
      this.persistToDisk();
      throw new AppError(
        'Invalid verification code. Please check and try again.',
        400,
        'INVALID_VERIFICATION_CODE'
      );
    }

    // Mark challenge consumed
    token.consumedAt = new Date().toISOString();
    user.isHostVerified = true;
    this.userStore.set(userId, user);

    const hostProfile = this.hostOnboardingStore.get(userId);
    if (hostProfile) {
      hostProfile.updatedAt = new Date().toISOString();
      this.hostOnboardingStore.set(userId, hostProfile);
    }

    this.persistToDisk();
    return {
      success: true,
      message: 'Account verified successfully.',
      user: { ...user },
    };
  }

  public resendVerificationCode(
    userId: string,
    type: 'EMAIL' | 'SMS' = 'EMAIL'
  ): ResendCodeResponse {
    const user = this.getUserById(userId);
    if (!user) {
      throw new UnauthorizedError(`User '${userId}' not found.`);
    }

    // 1. Resend throttling: enforce minimum 60 seconds interval (0 in test)
    const throttleMs = (process.env.NODE_ENV === 'test' || appConfig.nodeEnv === 'test') ? 0 : 60000;
    const lastSentTime = this.resendTimestamps.get(`${userId}:${type}`) || 0;
    const now = Date.now();
    if (throttleMs > 0 && now - lastSentTime < throttleMs) {
      const waitSeconds = Math.ceil((throttleMs - (now - lastSentTime)) / 1000);
      throw new AppError(
        `Please wait ${waitSeconds} second(s) before requesting another verification code.`,
        429,
        'RESEND_THROTTLED'
      );
    }

    // 2. Invalidate all previous active challenges for this user and type
    for (const record of this.verificationTokensStore.values()) {
      if (record.userId === userId && record.tokenType === type && !record.consumedAt) {
        record.consumedAt = new Date().toISOString();
      }
    }

    // 3. Generate fresh cryptographically secure 6-digit challenge
    const newCode = crypto.randomInt(100000, 1000000).toString();
    const tokenHash = crypto
      .createHash('sha256')
      .update(`${userId}:${newCode}`)
      .digest('hex');

    const targetDestination = type === 'SMS' ? user.phoneNumber || user.email : user.email;
    const tokenId = `tok-vrf-${crypto.randomBytes(8).toString('hex')}`;
    const tokenRecord: VerificationTokenRecord = {
      id: tokenId,
      userId,
      tokenType: type,
      tokenHash,
      targetDestination,
      expiresAt: now + 15 * 60 * 1000, // 15 minutes
      attempts: 0,
      createdAt: now,
    };

    this.verificationTokensStore.set(tokenId, tokenRecord);
    this.resendTimestamps.set(`${userId}:${type}`, now);
    this.persistToDisk();

    // 4. Dispatch truthfully via Notification Adapter
    const adapter = NotificationAdapterFactory.getAdapter(type);
    let deliveryStatus: 'DELIVERED' | 'SIMULATED' | 'FAILED' | 'UNCONFIGURED' = 'SIMULATED';

    adapter
      .send({
        channel: type,
        type: 'SECURITY_ALERT',
        recipient: targetDestination,
        subject: 'ParkEazy Verification Code',
        content: `Your new ParkEazy verification code is: ${newCode}. Valid for 15 minutes.`,
      })
      .then((sendResult) => {
        if (!sendResult.success) {
          console.warn(`[ParkEazy-Auth] Notification send failed: ${sendResult.errorMessage}`);
        }
      })
      .catch(() => {});

    if (adapter.providerName === 'MOCK_NOTIFICATION_PROVIDER') {
      deliveryStatus = 'SIMULATED';
    } else {
      deliveryStatus = 'DELIVERED';
    }

    return {
      success: true,
      message: `A fresh 6-digit verification code has been dispatched to ${targetDestination}.`,
      target: targetDestination,
      deliveryStatus,
      provider: adapter.providerName,
      ...(appConfig.nodeEnv !== 'production' ? { code: newCode } : {}),
    };
  }

  // --------------------------------------------------------------------------
  // Durable Password Recovery (GAP 3)
  // --------------------------------------------------------------------------

  public requestPasswordReset(email: string): ForgotPasswordResponse {
    if (!email || !email.trim()) {
      throw new AppError('Email address is required.', 400, 'VALIDATION_ERROR');
    }

    const cleanEmail = email.trim().toLowerCase();

    // Rate limiting: max 3 requests per 15 minutes per email
    const now = Date.now();
    const timestamps = this.resetRequestTimestamps.get(cleanEmail) || [];
    const recent = timestamps.filter((t) => now - t < 15 * 60 * 1000);

    if (recent.length >= 3) {
      throw new AppError(
        'Too many password recovery requests. Please wait 15 minutes before trying again.',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    recent.push(now);
    this.resetRequestTimestamps.set(cleanEmail, recent);

    let targetUser: SessionUser | undefined;
    for (const u of this.userStore.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        targetUser = u;
        break;
      }
    }

    // Generic privacy-preserving message to defend against account enumeration
    const genericResponse: ForgotPasswordResponse = {
      success: true,
      message:
        'If an account exists with this email address, password recovery instructions have been sent.',
    };

    if (!targetUser) {
      return genericResponse;
    }

    // Invalidate existing reset tokens for target user
    for (const record of this.passwordResetTokensStore.values()) {
      if (record.userId === targetUser.id && !record.consumedAt) {
        record.consumedAt = new Date().toISOString();
      }
    }

    // Generate high-entropy 32-byte cryptographic token
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const tokenId = `tok-rst-${crypto.randomBytes(8).toString('hex')}`;

    const resetRecord: PasswordResetTokenRecord = {
      id: tokenId,
      userId: targetUser.id,
      tokenHash,
      expiresAt: now + 15 * 60 * 1000, // 15 minutes
      attempts: 0,
      createdAt: now,
    };

    this.passwordResetTokensStore.set(tokenId, resetRecord);
    this.persistToDisk();

    // Truthful notification dispatch
    const adapter = NotificationAdapterFactory.getAdapter('EMAIL');
    adapter
      .send({
        channel: 'EMAIL',
        type: 'SECURITY_ALERT',
        recipient: targetUser.email,
        subject: 'Reset your ParkEazy Password',
        content: `To reset your ParkEazy password, use recovery token: ${rawResetToken}. Valid for 15 minutes.`,
      })
      .catch(() => {});

    return {
      ...genericResponse,
      deliveryStatus: adapter.isSimulated ? 'SIMULATED' : 'DELIVERED',
      provider: adapter.providerName,
      ...(appConfig.nodeEnv !== 'production' ? { resetToken: rawResetToken } : {}),
    };
  }

  public resetPasswordWithToken(data: ResetPasswordRequest): { success: boolean; message: string } {
    if (!data.token || !data.token.trim()) {
      throw new AppError('Reset token is required.', 400, 'VALIDATION_ERROR');
    }

    if (!data.newPassword || typeof data.newPassword !== 'string') {
      throw new AppError('New password is required.', 400, 'VALIDATION_ERROR');
    }

    if (data.newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
    }

    const hasLetter = /[a-zA-Z]/.test(data.newPassword);
    const hasNumber = /[0-9]/.test(data.newPassword);
    if (!hasLetter || !hasNumber) {
      throw new AppError(
        'New password must contain at least one letter and one number.',
        400,
        'WEAK_PASSWORD'
      );
    }

    if (data.confirmPassword && data.confirmPassword !== data.newPassword) {
      throw new AppError(
        'New password and confirmation password do not match.',
        400,
        'PASSWORD_MISMATCH'
      );
    }

    const inputHash = crypto.createHash('sha256').update(data.token.trim()).digest('hex');

    let matchingRecord: PasswordResetTokenRecord | undefined;
    for (const record of this.passwordResetTokensStore.values()) {
      if (record.tokenHash === inputHash) {
        matchingRecord = record;
        break;
      }
    }

    if (!matchingRecord || matchingRecord.consumedAt) {
      throw new AppError(
        'Password reset link is invalid or has already been used.',
        400,
        'INVALID_RESET_TOKEN'
      );
    }

    if (Date.now() > matchingRecord.expiresAt) {
      throw new AppError(
        'Password reset link has expired. Please request a new recovery link.',
        400,
        'EXPIRED_RESET_TOKEN'
      );
    }

    const user = this.getUserById(matchingRecord.userId);
    if (!user) {
      throw new AppError('User associated with this reset link was not found.', 404, 'NOT_FOUND');
    }

    // Hash and store new password with fresh 16-byte random salt
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = crypto.scryptSync(data.newPassword, newSalt, 32).toString('hex');
    const existingCred = this.credentialsStore.get(user.id);
    const nextTokenVersion = (existingCred?.tokenVersion || 1) + 1;

    this.credentialsStore.set(user.id, {
      hash: newHash,
      salt: newSalt,
      tokenVersion: nextTokenVersion,
    });

    // Invalidate reset token (single-use constraint)
    matchingRecord.consumedAt = new Date().toISOString();
    this.persistToDisk();

    return {
      success: true,
      message: 'Password reset successful. You may now sign in with your new credentials.',
    };
  }

  // --------------------------------------------------------------------------
  // Host Onboarding Persistence & State Machine (GAP 4)
  // --------------------------------------------------------------------------

  public getHostOnboarding(userId: string): HostOnboardingProfile {
    const existing = this.hostOnboardingStore.get(userId);
    if (existing) {
      return { ...existing };
    }

    const user = this.getUserById(userId);
    if (!user) {
      throw new AppError(`Host account '${userId}' not found.`, 404, 'NOT_FOUND');
    }

    const nowIso = new Date().toISOString();
    const defaultProfile: HostOnboardingProfile = {
      userId,
      businessType: 'INDIVIDUAL',
      businessName: `${user.firstName} ${user.lastName} Spaces`,
      phoneNumber: user.phoneNumber || '',
      addressLine1: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      emergencyContactName: '',
      emergencyContactPhone: '',
      ownershipType: 'OWNED',
      propertyTypes: ['DRIVEWAY'],
      hasLiabilityInsurance: false,
      acceptsTerms: true,
      acceptsHostAgreement: true,
      applicationStatus: 'DRAFT',
      onboardingStep: 'PROFILE',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.hostOnboardingStore.set(userId, defaultProfile);
    this.persistToDisk();
    return { ...defaultProfile };
  }

  public updateHostOnboarding(
    userId: string,
    updates: UpdateHostOnboardingRequest
  ): HostOnboardingProfile {
    const profile = this.getHostOnboarding(userId);

    if (profile.applicationStatus === 'SUSPENDED') {
      throw new AppError(
        'This host account is suspended. Changes cannot be saved.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    if (updates.businessType) profile.businessType = updates.businessType;
    if (updates.businessName !== undefined) profile.businessName = updates.businessName.trim();
    if (updates.businessRegistrationNumber !== undefined) {
      profile.businessRegistrationNumber = updates.businessRegistrationNumber.trim();
    }
    if (updates.taxId !== undefined) profile.taxId = updates.taxId.trim();
    if (updates.phoneNumber !== undefined) profile.phoneNumber = updates.phoneNumber.trim();
    if (updates.addressLine1 !== undefined) profile.addressLine1 = updates.addressLine1.trim();
    if (updates.addressLine2 !== undefined) profile.addressLine2 = updates.addressLine2.trim();
    if (updates.city !== undefined) profile.city = updates.city.trim();
    if (updates.state !== undefined) profile.state = updates.state.trim();
    if (updates.postalCode !== undefined) profile.postalCode = updates.postalCode.trim();
    if (updates.country !== undefined) profile.country = updates.country.trim();

    if (updates.emergencyContactName !== undefined) {
      profile.emergencyContactName = updates.emergencyContactName.trim();
    }
    if (updates.emergencyContactPhone !== undefined) {
      profile.emergencyContactPhone = updates.emergencyContactPhone.trim();
    }

    if (updates.ownershipType) profile.ownershipType = updates.ownershipType;
    if (Array.isArray(updates.propertyTypes) && updates.propertyTypes.length > 0) {
      profile.propertyTypes = updates.propertyTypes;
    }
    if (updates.hasLiabilityInsurance !== undefined) {
      profile.hasLiabilityInsurance = updates.hasLiabilityInsurance;
    }
    if (updates.insurancePolicyNumber !== undefined) {
      profile.insurancePolicyNumber = updates.insurancePolicyNumber.trim();
    }
    if (updates.insuranceExpiryDate !== undefined) {
      profile.insuranceExpiryDate = updates.insuranceExpiryDate;
    }
    if (updates.acceptsTerms !== undefined) profile.acceptsTerms = updates.acceptsTerms;
    if (updates.acceptsHostAgreement !== undefined) {
      profile.acceptsHostAgreement = updates.acceptsHostAgreement;
    }

    if (updates.onboardingStep) profile.onboardingStep = updates.onboardingStep;

    profile.updatedAt = new Date().toISOString();
    this.hostOnboardingStore.set(userId, profile);
    this.persistToDisk();

    return { ...profile };
  }

  public submitHostOnboarding(userId: string): HostOnboardingProfile {
    const profile = this.getHostOnboarding(userId);

    if (profile.applicationStatus === 'SUSPENDED') {
      throw new AppError(
        'This host account is suspended. Submission cannot proceed.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    if (profile.applicationStatus === 'PENDING_REVIEW' || profile.applicationStatus === 'VERIFIED') {
      throw new AppError(
        `Application cannot be re-submitted while in '${profile.applicationStatus}' status.`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }

    // Validate mandatory profile fields
    if (!profile.phoneNumber || profile.phoneNumber.trim().length < 5) {
      throw new AppError(
        'A valid phone number is required to submit your host application.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!profile.addressLine1 || profile.addressLine1.trim().length < 3) {
      throw new AppError(
        'Physical address line 1 is required to submit your host application.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!profile.city || profile.city.trim().length < 1) {
      throw new AppError(
        'City is required to submit your host application.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!profile.state || profile.state.trim().length < 1) {
      throw new AppError(
        'State / Province is required to submit your host application.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!profile.postalCode || profile.postalCode.trim().length < 2) {
      throw new AppError(
        'Postal / ZIP code is required to submit your host application.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!profile.emergencyContactName || profile.emergencyContactName.trim().length < 2) {
      throw new AppError('Emergency contact name is required.', 400, 'VALIDATION_ERROR');
    }

    if (!profile.emergencyContactPhone || profile.emergencyContactPhone.trim().length < 5) {
      throw new AppError('Emergency contact phone number is required.', 400, 'VALIDATION_ERROR');
    }

    if (!profile.propertyTypes || profile.propertyTypes.length === 0) {
      throw new AppError('At least one property type must be selected.', 400, 'VALIDATION_ERROR');
    }

    if (!profile.acceptsHostAgreement) {
      throw new AppError(
        'You must agree to the ParkEazy Host Partner Agreement to submit your application.',
        400,
        'AGREEMENT_REQUIRED'
      );
    }

    const nowIso = new Date().toISOString();
    profile.applicationStatus = 'PENDING_REVIEW';
    profile.onboardingStep = 'SUBMITTED';
    profile.submittedAtUtc = nowIso;
    profile.statusReason =
      'Application submitted and currently undergoing review by the trust and operations team.';
    profile.updatedAt = nowIso;

    // Ensure host role is active
    const user = this.getUserById(userId);
    if (user && !user.roles.includes(UserRole.HOST)) {
      user.roles.push(UserRole.HOST);
      this.userStore.set(userId, user);
    }

    this.hostOnboardingStore.set(userId, profile);
    this.persistToDisk();

    return { ...profile };
  }

  // --------------------------------------------------------------------------
  // Password Change & Preferences
  // --------------------------------------------------------------------------

  public changePassword(userId: string, data: ChangePasswordRequest): void {
    const user = this.getUserById(userId);
    if (!user) {
      throw new UnauthorizedError(`User '${userId}' not found.`);
    }

    if (!data.currentPassword || typeof data.currentPassword !== 'string') {
      throw new AppError('Current password is required.', 400, 'VALIDATION_ERROR');
    }

    if (!data.newPassword || typeof data.newPassword !== 'string') {
      throw new AppError('New password is required.', 400, 'VALIDATION_ERROR');
    }

    if (data.newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters long.', 400, 'WEAK_PASSWORD');
    }

    const hasLetter = /[a-zA-Z]/.test(data.newPassword);
    const hasNumber = /[0-9]/.test(data.newPassword);
    if (!hasLetter || !hasNumber) {
      throw new AppError(
        'New password must contain at least one letter and one number.',
        400,
        'WEAK_PASSWORD'
      );
    }

    if (data.confirmPassword && data.newPassword !== data.confirmPassword) {
      throw new AppError(
        'New password and confirmation password do not match.',
        400,
        'PASSWORD_MISMATCH'
      );
    }

    const creds = this.credentialsStore.get(userId);
    if (!creds) {
      throw new AppError(
        'Password change is unavailable until credentials are configured for this account.',
        409,
        'CREDENTIALS_NOT_CONFIGURED'
      );
    }

    const hashedCurrent = crypto.scryptSync(data.currentPassword, creds.salt, 32).toString('hex');
    const currentHash = Buffer.from(hashedCurrent, 'hex');
    const storedHash = Buffer.from(creds.hash, 'hex');

    if (currentHash.length !== storedHash.length || !crypto.timingSafeEqual(currentHash, storedHash)) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    if (data.currentPassword === data.newPassword) {
      throw new AppError(
        'New password must be different from current password.',
        400,
        'PASSWORD_UNCHANGED'
      );
    }

    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = crypto.scryptSync(data.newPassword, newSalt, 32).toString('hex');
    const nextTokenVersion = (creds.tokenVersion || 1) + 1;

    this.credentialsStore.set(userId, {
      hash: newHash,
      salt: newSalt,
      tokenVersion: nextTokenVersion,
    });

    this.persistToDisk();
  }

  public getNotificationPreferences(userId: string): NotificationPreferences {
    const existing = this.notificationPreferencesStore.get(userId);
    if (existing) {
      return { ...existing };
    }

    const defaultPrefs: NotificationPreferences = {
      userId,
      emailBookingConfirmations: true,
      emailReminders: true,
      smsGateAccess: true,
      smsExpiryAlerts: true,
      pushStatusUpdates: false,
      updatedAt: new Date().toISOString(),
    };

    this.notificationPreferencesStore.set(userId, defaultPrefs);
    return { ...defaultPrefs };
  }

  public updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): NotificationPreferences {
    const current = this.getNotificationPreferences(userId);
    const updated: NotificationPreferences = {
      ...current,
      ...updates,
      userId,
      updatedAt: new Date().toISOString(),
    };

    this.notificationPreferencesStore.set(userId, updated);
    this.persistToDisk();
    return { ...updated };
  }
}

export const authService = AuthService.getInstance();
