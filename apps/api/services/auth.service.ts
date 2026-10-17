import crypto from 'crypto';
import {
  UserRole,
  SessionUser,
  LoginResponse,
  NotificationPreferences,
  ChangePasswordRequest,
} from '../../../packages/contracts';
import { appConfig } from '../config/env';
import { UnauthorizedError, ForbiddenError, AppError } from '../middleware/error-handler';
import { DEMO_USERS } from '../middleware/auth-guard';

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
  isDemo?: boolean;
  iss: 'parkeazy-auth';
  iat: number;
  exp: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export class AuthService {
  private static instance: AuthService;
  private userStore: Map<string, SessionUser> = new Map([
    [DEMO_USERS.customer.id, { ...DEMO_USERS.customer }],
    [DEMO_USERS.host.id, { ...DEMO_USERS.host }],
    [DEMO_USERS.admin.id, { ...DEMO_USERS.admin }],
  ]);

  private credentialsStore: Map<string, { hash: string; salt: string }> = new Map();

  private notificationPreferencesStore: Map<string, NotificationPreferences> = new Map([
    [
      DEMO_USERS.customer.id,
      {
        userId: DEMO_USERS.customer.id,
        emailBookingConfirmations: true,
        emailReminders: true,
        smsGateAccess: true,
        smsExpiryAlerts: true,
        pushStatusUpdates: true,
        updatedAt: '2026-10-16T08:00:00Z',
      },
    ],
  ]);

  private constructor() {
    const salt = 'parkeazy_salt_2026';
    const hash = crypto.scryptSync('DriverPass123!', salt, 32).toString('hex');
    this.credentialsStore.set(DEMO_USERS.customer.id, { hash, salt });
    this.credentialsStore.set(DEMO_USERS.host.id, { hash, salt });
    this.credentialsStore.set(DEMO_USERS.admin.id, { hash, salt });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public getUserById(id: string): SessionUser | undefined {
    return this.userStore.get(id);
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

    // Keep DEMO_USERS in sync if it is a demo user
    if (userId === DEMO_USERS.customer.id) Object.assign(DEMO_USERS.customer, existing);
    if (userId === DEMO_USERS.host.id) Object.assign(DEMO_USERS.host, existing);
    if (userId === DEMO_USERS.admin.id) Object.assign(DEMO_USERS.admin, existing);

    return { ...existing };
  }

  /**
   * Signs a JWT using HMAC-SHA256 with the validated application secret.
   */
  public signToken(
    user: SessionUser,
    expiresInSeconds: number = appConfig.auth.tokenExpirySeconds,
    isDemo = false
  ): string {
    const header: JwtHeader = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
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

  /**
   * Verifies signature, algorithm, expiration, and issuer of a JWT token.
   * Rejects malformed tokens, bad signatures, expired tokens, or unverified claims.
   */
  public verifyToken(token: string): JwtPayload {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Authentication token is missing or malformed.');
    }

    // Support legacy development demo string tokens only if demo auth is permitted in current environment
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

    // Verify header algorithm
    let header: JwtHeader;
    try {
      header = JSON.parse(base64UrlDecode(headerB64));
    } catch {
      throw new UnauthorizedError('Invalid token header encoding.');
    }

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      throw new UnauthorizedError('Unsupported token algorithm or type.');
    }

    // Verify signature in constant time
    const expectedSignature = crypto
      .createHmac('sha256', appConfig.auth.jwtSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      throw new UnauthorizedError('Invalid token signature.');
    }

    // Verify payload and expiration
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

    // Reject demo claims if demo auth is disabled in production
    if (payload.isDemo && !appConfig.auth.allowDemoAuth) {
      throw new UnauthorizedError('Demo authentication tokens are disabled in production.');
    }

    return payload;
  }

  /**
   * Authenticates a user login request.
   * In development/test: securely handles demo users.
   * In production: strictly enforces that demo credentials cannot be used without configured identity provider.
   */
  public authenticate(
    email: string,
    password?: string,
    requestedPortal?: string
  ): LoginResponse {
    const isDemoRequest =
      email.includes('driver@parkeazy.com') ||
      email.includes('host@parkeazy.com') ||
      email.includes('admin@parkeazy.com') ||
      requestedPortal === 'admin' ||
      requestedPortal === 'host' ||
      requestedPortal === 'user' ||
      requestedPortal === 'customer';

    if (isDemoRequest) {
      if (!appConfig.auth.allowDemoAuth) {
        throw new ForbiddenError(
          'Demo authentication is disabled in production. External identity provider is required.'
        );
      }

      let baseUser: SessionUser = DEMO_USERS.customer;
      if (requestedPortal === 'admin' || email.includes('admin')) {
        baseUser = DEMO_USERS.admin;
      } else if (requestedPortal === 'host' || email.includes('host')) {
        baseUser = DEMO_USERS.host;
      }

      const user = this.getUserById(baseUser.id) || baseUser;
      const token = this.signToken(user, appConfig.auth.tokenExpirySeconds, true);

      return {
        token,
        expiresIn: appConfig.auth.tokenExpirySeconds,
        user,
      };
    }

    // For non-demo production users when database is connected:
    // In Stage 2 baseline, if not a recognized demo user and DB is not seeded, throw invalid credentials.
    throw new UnauthorizedError('Invalid email or password.');
  }

  /**
   * Updates user password after verifying current credentials and password complexity.
   */
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

    // Must contain at least one letter and one number
    const hasLetter = /[a-zA-Z]/.test(data.newPassword);
    const hasNumber = /[0-9]/.test(data.newPassword);
    if (!hasLetter || !hasNumber) {
      throw new AppError('New password must contain at least one letter and one number.', 400, 'WEAK_PASSWORD');
    }

    if (data.confirmPassword && data.newPassword !== data.confirmPassword) {
      throw new AppError('New password and confirmation password do not match.', 400, 'PASSWORD_MISMATCH');
    }

    // Verify current password
    const creds = this.credentialsStore.get(userId);
    // Never allow a shared demo password to bypass credential verification.
    // Accounts without a stored credential must complete the normal credential
    // setup/recovery flow before changing a password.
    if (!creds) {
      throw new AppError('Password change is unavailable until credentials are configured for this account.', 409, 'CREDENTIALS_NOT_CONFIGURED');
    }
    const hashedCurrent = crypto.scryptSync(data.currentPassword, creds.salt, 32).toString('hex');
    const currentHash = Buffer.from(hashedCurrent, 'hex');
    const storedHash = Buffer.from(creds.hash, 'hex');
    if (currentHash.length !== storedHash.length || !crypto.timingSafeEqual(currentHash, storedHash)) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
    }

    if (data.currentPassword === data.newPassword) {
      throw new AppError('New password must be different from current password.', 400, 'PASSWORD_UNCHANGED');
    }

    // Save new password hash with fresh salt
    const newSalt = crypto.randomBytes(16).toString('hex');
    const newHash = crypto.scryptSync(data.newPassword, newSalt, 32).toString('hex');
    this.credentialsStore.set(userId, { hash: newHash, salt: newSalt });
  }

  /**
   * Retrieves notification preferences for a user.
   */
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

  /**
   * Updates notification preferences for a user.
   */
  public updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): NotificationPreferences {
    const current = this.getNotificationPreferences(userId);
    const updated: NotificationPreferences = {
      ...current,
      emailBookingConfirmations:
        updates.emailBookingConfirmations !== undefined
          ? !!updates.emailBookingConfirmations
          : current.emailBookingConfirmations,
      emailReminders:
        updates.emailReminders !== undefined ? !!updates.emailReminders : current.emailReminders,
      smsGateAccess:
        updates.smsGateAccess !== undefined ? !!updates.smsGateAccess : current.smsGateAccess,
      smsExpiryAlerts:
        updates.smsExpiryAlerts !== undefined ? !!updates.smsExpiryAlerts : current.smsExpiryAlerts,
      pushStatusUpdates:
        updates.pushStatusUpdates !== undefined
          ? !!updates.pushStatusUpdates
          : current.pushStatusUpdates,
      updatedAt: new Date().toISOString(),
    };
    this.notificationPreferencesStore.set(userId, updated);
    return { ...updated };
  }
}

export const authService = AuthService.getInstance();
