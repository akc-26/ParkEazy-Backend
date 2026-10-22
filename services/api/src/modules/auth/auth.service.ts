import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
  Inject,
} from '@nestjs/common';
import crypto from 'crypto';
import { DatabaseService } from '../../database/database.service.js';
import {
  LoginCredentials,
  SignupPayload,
  OtpChallengeRequest,
  OtpChallengeResponse,
  VerifyOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthUserResponse,
  AuthTokenPair,
  JwtPayload,
  UserAccount,
  UserRole,
} from '@parkeazy/shared-types';
import { hashPassword, verifyPassword } from './password.util.js';
import { signJwt, verifyJwt, decodeJwt, validateJwtSecret } from './jwt.util.js';

interface SandboxUser {
  id: string;
  tenantId: string;
  email: string;
  phone?: string;
  passwordHash: string;
  fullName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: 'active' | 'suspended' | 'pending_verification' | 'deleted';
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

interface SandboxOtp {
  id: string;
  tenantId: string;
  destination: string;
  channel: 'sms' | 'email';
  purpose: string;
  codeHash: string;
  attempts: number;
  maxAttempts: number;
  expiresAt: number;
  verified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly accessTokenTtl = 3600; // 1 hour
  private readonly refreshTokenTtl = 2592000; // 30 days

  // Isolated development/test fixture storage (strictly prohibited from granting unauthorized production access)
  private testUsers: Map<string, SandboxUser> = new Map();
  private testOtps: Map<string, SandboxOtp> = new Map();
  private testResetTokens: Map<string, { userId: string; tenantId: string; tokenHash: string; expiresAt: number; used: boolean }> = new Map();
  private testSessions: Map<string, { userId: string; tenantId: string; refreshTokenHash: string; expiresAt: number; revoked: boolean }> = new Map();

  constructor(@Inject(DatabaseService) private readonly databaseService: DatabaseService) {
    this.jwtSecret = validateJwtSecret();
    this.initializeDevFixtureAccounts();
  }

  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private isDbAvailable(): boolean {
    const pool = this.databaseService.getPool();
    return !!(pool && this.databaseService.getHealthStatus().connected);
  }

  private assertPersistenceAvailable(): void {
    if (this.isProduction() && !this.isDbAvailable()) {
      throw new ServiceUnavailableException(
        'Database persistence service is unavailable. Production authentication requests require persistent storage.'
      );
    }
  }

  private initializeDevFixtureAccounts(): void {
    if (this.isProduction()) return;

    const defaultPasswordHash = hashPassword('ParkEazy@2026', 'parkeazy-seed-salt-2026');
    const fixtureAccounts: SandboxUser[] = [
      {
        id: '00000000-0000-4000-a000-000000000001',
        tenantId: 'default',
        email: 'admin@parkeazy.com',
        fullName: 'ParkEazy Platform Admin',
        phone: '+919876500001',
        passwordHash: defaultPasswordHash,
        roles: ['superadmin'],
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-a000-000000000002',
        tenantId: 'default',
        email: 'host.chennai@parkeazy.com',
        fullName: 'Senthil Murugan (Chennai Parking Operations)',
        phone: '+919876500002',
        passwordHash: defaultPasswordHash,
        roles: ['host'],
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '00000000-0000-4000-a000-000000000003',
        tenantId: 'default',
        email: 'driver.arun@parkeazy.com',
        fullName: 'Arun Kumar',
        phone: '+919876500003',
        passwordHash: defaultPasswordHash,
        roles: ['customer'],
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const acc of fixtureAccounts) {
      this.testUsers.set(`${acc.tenantId}:${acc.email.toLowerCase()}`, acc);
    }
  }

  public async register(payload: SignupPayload, tenantIdHeader?: string): Promise<AuthUserResponse> {
    this.assertPersistenceAvailable();
    const tenantId = tenantIdHeader || payload.tenantId || 'default';
    const email = payload.email.toLowerCase().trim();

    // Check existing account
    const existing = await this.findUserByEmail(email, tenantId);
    if (existing) {
      throw new BadRequestException('An account with this email address is already registered');
    }

    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = payload.password
      ? hashPassword(payload.password, salt)
      : hashPassword(crypto.randomBytes(32).toString('hex'), salt);

    const role = payload.role || 'customer';
    const now = new Date().toISOString();

    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      await this.databaseService.transaction(async (client) => {
        await client.query(
          `INSERT INTO users (
            id, tenant_id, email, phone, password_hash, full_name,
            is_email_verified, is_phone_verified, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
          [
            userId,
            tenantId,
            email,
            payload.phone || null,
            passwordHash,
            payload.fullName,
            false,
            false,
            'pending_verification',
            now,
            now,
          ]
        );

        await client.query(
          `INSERT INTO role_assignments (id, user_id, tenant_id, role, assigned_at)
           VALUES ($1, $2, $3, $4, $5);`,
          [crypto.randomUUID(), userId, tenantId, role, now]
        );
      });
    } else {
      const newUser: SandboxUser = {
        id: userId,
        tenantId,
        email,
        phone: payload.phone,
        passwordHash,
        fullName: payload.fullName,
        isEmailVerified: false,
        isPhoneVerified: false,
        status: 'pending_verification',
        roles: [role],
        createdAt: now,
        updatedAt: now,
      };
      this.testUsers.set(`${tenantId}:${email}`, newUser);
    }

    const userAccount: UserAccount = {
      id: userId,
      tenantId,
      email,
      phone: payload.phone,
      fullName: payload.fullName,
      isEmailVerified: false,
      isPhoneVerified: false,
      status: 'pending_verification',
      roles: [role],
      createdAt: now,
      updatedAt: now,
    };

    const tokens = await this.issueTokens(userAccount);
    return { user: userAccount, tokens };
  }

  public async login(credentials: LoginCredentials, tenantIdHeader?: string): Promise<AuthUserResponse> {
    this.assertPersistenceAvailable();
    const tenantId = tenantIdHeader || credentials.tenantId || 'default';
    const email = credentials.email.toLowerCase().trim();

    const user = await this.findUserByEmail(email, tenantId);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password credentials');
    }

    if (user.status === 'suspended' || user.status === 'deleted') {
      throw new ForbiddenException('This account has been suspended or deactivated');
    }

    // Password authentication
    if (credentials.password) {
      const isMatch = verifyPassword(credentials.password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Invalid email or password credentials');
      }
    } else if (credentials.otpCode) {
      // OTP challenge verification
      const isVerified = await this.verifyDirectOtpCode(email, credentials.otpCode, tenantId);
      if (!isVerified) {
        throw new UnauthorizedException('Invalid or expired OTP code');
      }
    } else {
      throw new BadRequestException('Either password or OTP code must be provided');
    }

    const userAccount: UserAccount = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      status: user.status,
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const tokens = await this.issueTokens(userAccount);
    return { user: userAccount, tokens };
  }

  public async sendOtp(
    request: OtpChallengeRequest,
    tenantIdHeader?: string
  ): Promise<OtpChallengeResponse> {
    this.assertPersistenceAvailable();
    const tenantId = tenantIdHeader || request.tenantId || 'default';
    const destination = request.destination.trim();
    const challengeId = crypto.randomUUID();

    // Generate cryptographically secure unpredictable 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
    const expiresInSeconds = 300; // 5 minutes
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      await pool.query(
        `INSERT INTO otp_challenges (
          id, tenant_id, destination, channel, purpose, code_hash,
          attempts, max_attempts, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 0, 3, TO_TIMESTAMP($7), NOW());`,
        [
          challengeId,
          tenantId,
          destination,
          request.channel,
          request.purpose,
          codeHash,
          expiresAt / 1000,
        ]
      );
    } else {
      this.testOtps.set(challengeId, {
        id: challengeId,
        tenantId,
        destination,
        channel: request.channel,
        purpose: request.purpose,
        codeHash,
        attempts: 0,
        maxAttempts: 3,
        expiresAt,
        verified: false,
      });
    }

    const masked = this.maskDestination(destination, request.channel);
    this.logger.log(`[OTP Gateway] Challenge ${challengeId} dispatched to ${masked}`);

    return {
      challengeId,
      destinationMasked: masked,
      expiresInSeconds,
      channel: request.channel,
      ...(!this.isProduction() ? { mockCodeNotice: `Development sandbox code: ${rawOtp}` } : {}),
    };
  }

  public async verifyOtp(
    request: VerifyOtpRequest,
    tenantIdHeader?: string
  ): Promise<AuthUserResponse> {
    this.assertPersistenceAvailable();
    const tenantId = tenantIdHeader || request.tenantId || 'default';
    const code = request.code.trim();
    const inputHash = crypto.createHash('sha256').update(code).digest('hex');

    let challengeMatched = false;
    let destination = request.destination;

    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      const res = await pool.query(
        `SELECT id, destination, code_hash, attempts, max_attempts, expires_at, verified_at
         FROM otp_challenges
         WHERE id = $1 AND tenant_id = $2;`,
        [request.challengeId, tenantId]
      );

      if (res.rows.length === 0) {
        throw new BadRequestException('Invalid or expired OTP challenge ID');
      }

      const row = res.rows[0];
      destination = row.destination;

      if (row.verified_at) {
        throw new BadRequestException('This OTP code has already been used');
      }

      if (new Date(row.expires_at).getTime() < Date.now()) {
        throw new BadRequestException('OTP code has expired. Please request a new code');
      }

      if (row.attempts >= row.max_attempts) {
        throw new BadRequestException('Maximum verification attempts exceeded. Challenge locked');
      }

      const expectedBuf = Buffer.from(row.code_hash, 'utf8');
      const actualBuf = Buffer.from(inputHash, 'utf8');

      if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        challengeMatched = true;
        await pool.query(
          `UPDATE otp_challenges SET verified_at = NOW() WHERE id = $1;`,
          [row.id]
        );
      } else {
        await pool.query(
          `UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = $1;`,
          [row.id]
        );
        throw new UnauthorizedException('Incorrect verification code. Please check and retry');
      }
    } else {
      const otpRec = this.testOtps.get(request.challengeId);
      if (!otpRec || otpRec.tenantId !== tenantId) {
        throw new BadRequestException('Invalid or expired OTP challenge ID');
      }

      if (otpRec.verified) {
        throw new BadRequestException('This OTP code has already been used');
      }

      if (Date.now() > otpRec.expiresAt) {
        throw new BadRequestException('OTP code has expired. Please request a new code');
      }

      if (otpRec.attempts >= otpRec.maxAttempts) {
        throw new BadRequestException('Maximum verification attempts exceeded. Challenge locked');
      }

      destination = otpRec.destination;
      const expectedBuf = Buffer.from(otpRec.codeHash, 'utf8');
      const actualBuf = Buffer.from(inputHash, 'utf8');

      if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        challengeMatched = true;
        otpRec.verified = true;
      } else {
        otpRec.attempts += 1;
        throw new UnauthorizedException('Incorrect verification code. Please check and retry');
      }
    }

    if (!challengeMatched) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Lookup user by destination
    let user = await this.findUserByEmail(destination, tenantId);
    if (!user && destination.includes('@') === false) {
      user = await this.findUserByPhone(destination, tenantId);
    }

    if (!user) {
      // Auto-provision verified customer if not existing
      const autoPayload: SignupPayload = {
        email: destination.includes('@') ? destination : `${destination.replace(/[\+\s\-]/g, '')}@sms.parkeazy.internal`,
        phone: destination.includes('@') ? undefined : destination,
        fullName: 'Verified Parker',
        tenantId,
        role: 'customer',
      };
      await this.register(autoPayload, tenantId);
      user = await this.findUserByEmail(autoPayload.email, tenantId);
    }

    if (!user) {
      throw new BadRequestException('User record could not be located after verification');
    }

    // Mark verified
    await this.markVerified(user.id, destination.includes('@') ? 'email' : 'phone');
    user.isPhoneVerified = true;
    user.isEmailVerified = user.isEmailVerified || destination.includes('@');

    const userAccount: UserAccount = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      status: 'active',
      roles: user.roles,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const tokens = await this.issueTokens(userAccount);
    return { user: userAccount, tokens };
  }

  public async forgotPassword(
    request: ForgotPasswordRequest,
    tenantIdHeader?: string
  ): Promise<{ success: boolean; message: string; resetToken?: string }> {
    this.assertPersistenceAvailable();
    const tenantId = tenantIdHeader || request.tenantId || 'default';
    const email = request.email.toLowerCase().trim();

    const user = await this.findUserByEmail(email, tenantId);
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const expiresAt = Date.now() + 3600 * 1000; // 1 hour

    if (user) {
      if (this.isDbAvailable()) {
        const pool = this.databaseService.getPool()!;
        await pool.query(
          `INSERT INTO password_reset_tokens (
            id, user_id, tenant_id, token_hash, expires_at, created_at
          ) VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5), NOW());`,
          [crypto.randomUUID(), user.id, tenantId, tokenHash, expiresAt / 1000]
        );
      } else {
        this.testResetTokens.set(rawResetToken, {
          userId: user.id,
          tenantId,
          tokenHash,
          expiresAt,
          used: false,
        });
      }
    }

    // Enumeration-safe uniform response
    return {
      success: true,
      message: 'If an account exists with this email address, password recovery instructions have been dispatched.',
      ...(!this.isProduction() && user ? { resetToken: rawResetToken } : {}),
    };
  }

  public async resetPassword(
    request: ResetPasswordRequest,
    tenantIdHeader?: string
  ): Promise<{ success: boolean; message: string }> {
    this.assertPersistenceAvailable();
    const tenantId = tenantIdHeader || request.tenantId || 'default';
    const token = request.token.trim();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    let userId: string | null = null;

    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      const res = await pool.query(
        `SELECT id, user_id, expires_at, used_at
         FROM password_reset_tokens
         WHERE token_hash = $1 AND tenant_id = $2;`,
        [tokenHash, tenantId]
      );

      if (res.rows.length === 0) {
        throw new BadRequestException('Invalid or expired password reset token');
      }

      const row = res.rows[0];
      if (row.used_at) {
        throw new BadRequestException('This reset token has already been used');
      }

      if (new Date(row.expires_at).getTime() < Date.now()) {
        throw new BadRequestException('Password reset token has expired. Please request a new recovery link');
      }

      userId = row.user_id;
      const newHash = hashPassword(request.newPassword);

      await this.databaseService.transaction(async (client) => {
        await client.query(
          `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2;`,
          [newHash, userId]
        );
        await client.query(
          `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1;`,
          [row.id]
        );
        // Revoke all existing sessions
        await client.query(
          `UPDATE auth_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL;`,
          [userId]
        );
      });
    } else {
      const rec = this.testResetTokens.get(token);
      if (!rec || rec.tenantId !== tenantId || rec.used || Date.now() > rec.expiresAt) {
        throw new BadRequestException('Invalid or expired password reset token');
      }

      rec.used = true;
      userId = rec.userId;
      const newHash = hashPassword(request.newPassword);

      for (const u of this.testUsers.values()) {
        if (u.id === userId && u.tenantId === tenantId) {
          u.passwordHash = newHash;
          u.updatedAt = new Date().toISOString();
        }
      }
    }

    return {
      success: true,
      message: 'Password has been successfully updated. All active sessions have been terminated for security.',
    };
  }

  public async refreshToken(refreshToken: string, tenantIdHeader?: string): Promise<AuthTokenPair> {
    this.assertPersistenceAvailable();
    let payload: JwtPayload;
    try {
      payload = verifyJwt(refreshToken, this.jwtSecret);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tenantId = tenantIdHeader || payload.tenantId;
    const user = await this.getUserById(payload.sub, tenantId);
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account inactive or session revoked');
    }

    return this.issueTokens(user);
  }

  public async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = decodeJwt(refreshToken);
      if (!payload) return;

      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      if (this.isDbAvailable()) {
        const pool = this.databaseService.getPool()!;
        await pool.query(
          `UPDATE auth_sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1;`,
          [refreshHash]
        );
      }
    } catch {
      // Graceful logout
    }
  }

  public async getUserById(userId: string, tenantId: string): Promise<UserAccount | null> {
    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      const res = await pool.query(
        `SELECT u.id, u.tenant_id, u.email, u.phone, u.full_name, u.avatar_url,
                u.is_email_verified, u.is_phone_verified, u.status, u.created_at, u.updated_at,
                COALESCE(ARRAY_AGG(r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY['customer'::varchar]) as roles
         FROM users u
         LEFT JOIN role_assignments r ON u.id = r.user_id AND u.tenant_id = r.tenant_id
         WHERE u.id = $1 AND u.tenant_id = $2
         GROUP BY u.id;`,
        [userId, tenantId]
      );

      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        email: row.email,
        phone: row.phone,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        isEmailVerified: row.is_email_verified,
        isPhoneVerified: row.is_phone_verified,
        status: row.status,
        roles: row.roles || ['customer'],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    for (const u of this.testUsers.values()) {
      if (u.id === userId && u.tenantId === tenantId) {
        return {
          id: u.id,
          tenantId: u.tenantId,
          email: u.email,
          phone: u.phone,
          fullName: u.fullName,
          avatarUrl: u.avatarUrl,
          isEmailVerified: u.isEmailVerified,
          isPhoneVerified: u.isPhoneVerified,
          status: u.status,
          roles: u.roles,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        };
      }
    }
    return null;
  }

  private async findUserByEmail(email: string, tenantId: string): Promise<SandboxUser | null> {
    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      const res = await pool.query(
        `SELECT u.id, u.tenant_id, u.email, u.phone, u.password_hash, u.full_name, u.avatar_url,
                u.is_email_verified, u.is_phone_verified, u.status, u.created_at, u.updated_at,
                COALESCE(ARRAY_AGG(r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY['customer'::varchar]) as roles
         FROM users u
         LEFT JOIN role_assignments r ON u.id = r.user_id AND u.tenant_id = r.tenant_id
         WHERE LOWER(u.email) = LOWER($1) AND u.tenant_id = $2
         GROUP BY u.id;`,
        [email, tenantId]
      );

      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        email: row.email,
        phone: row.phone,
        passwordHash: row.password_hash,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        isEmailVerified: row.is_email_verified,
        isPhoneVerified: row.is_phone_verified,
        status: row.status,
        roles: row.roles || ['customer'],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    return this.testUsers.get(`${tenantId}:${email.toLowerCase()}`) || null;
  }

  private async findUserByPhone(phone: string, tenantId: string): Promise<SandboxUser | null> {
    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      const res = await pool.query(
        `SELECT u.id, u.tenant_id, u.email, u.phone, u.password_hash, u.full_name, u.avatar_url,
                u.is_email_verified, u.is_phone_verified, u.status, u.created_at, u.updated_at,
                COALESCE(ARRAY_AGG(r.role) FILTER (WHERE r.role IS NOT NULL), ARRAY['customer'::varchar]) as roles
         FROM users u
         LEFT JOIN role_assignments r ON u.id = r.user_id AND u.tenant_id = r.tenant_id
         WHERE u.phone = $1 AND u.tenant_id = $2
         GROUP BY u.id;`,
        [phone, tenantId]
      );

      if (res.rows.length === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        email: row.email,
        phone: row.phone,
        passwordHash: row.password_hash,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        isEmailVerified: row.is_email_verified,
        isPhoneVerified: row.is_phone_verified,
        status: row.status,
        roles: row.roles || ['customer'],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }

    for (const u of this.testUsers.values()) {
      if (u.phone === phone && u.tenantId === tenantId) {
        return u;
      }
    }
    return null;
  }

  private async markVerified(userId: string, channel: 'email' | 'phone'): Promise<void> {
    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      const col = channel === 'email' ? 'is_email_verified' : 'is_phone_verified';
      await pool.query(
        `UPDATE users SET ${col} = TRUE, status = 'active', updated_at = NOW() WHERE id = $1;`,
        [userId]
      );
    } else {
      for (const u of this.testUsers.values()) {
        if (u.id === userId) {
          if (channel === 'email') u.isEmailVerified = true;
          if (channel === 'phone') u.isPhoneVerified = true;
          u.status = 'active';
        }
      }
    }
  }

  private async verifyDirectOtpCode(
    destination: string,
    otpCode: string,
    tenantId: string
  ): Promise<boolean> {
    const inputHash = crypto.createHash('sha256').update(otpCode.trim()).digest('hex');

    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      const res = await pool.query(
        `SELECT id, code_hash, expires_at, verified_at
         FROM otp_challenges
         WHERE destination = $1 AND tenant_id = $2 AND verified_at IS NULL
         ORDER BY created_at DESC LIMIT 1;`,
        [destination, tenantId]
      );

      if (res.rows.length === 0) return false;
      const row = res.rows[0];
      if (new Date(row.expires_at).getTime() < Date.now()) return false;

      const expectedBuf = Buffer.from(row.code_hash, 'utf8');
      const actualBuf = Buffer.from(inputHash, 'utf8');
      if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
        await pool.query(`UPDATE otp_challenges SET verified_at = NOW() WHERE id = $1;`, [row.id]);
        return true;
      }
      return false;
    }

    for (const otp of this.testOtps.values()) {
      if (otp.destination === destination && otp.tenantId === tenantId && !otp.verified) {
        if (Date.now() > otp.expiresAt) return false;
        const expectedBuf = Buffer.from(otp.codeHash, 'utf8');
        const actualBuf = Buffer.from(inputHash, 'utf8');
        if (expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf)) {
          otp.verified = true;
          return true;
        }
      }
    }
    return false;
  }

  private async issueTokens(user: UserAccount): Promise<AuthTokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles,
      fullName: user.fullName,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
    };

    const accessToken = signJwt(payload, this.jwtSecret, this.accessTokenTtl);
    const refreshToken = signJwt(payload, this.jwtSecret, this.refreshTokenTtl);

    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + this.refreshTokenTtl * 1000;

    if (this.isDbAvailable()) {
      const pool = this.databaseService.getPool()!;
      await pool.query(
        `INSERT INTO auth_sessions (
          id, user_id, tenant_id, refresh_token_hash, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5), NOW());`,
        [sessionId, user.id, user.tenantId, refreshHash, expiresAt / 1000]
      );
    } else {
      this.testSessions.set(sessionId, {
        userId: user.id,
        tenantId: user.tenantId,
        refreshTokenHash: refreshHash,
        expiresAt,
        revoked: false,
      });
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresInSeconds: this.accessTokenTtl,
    };
  }

  private maskDestination(dest: string, channel: 'sms' | 'email'): string {
    if (channel === 'email' || dest.includes('@')) {
      const [local, domain] = dest.split('@');
      if (!domain) return dest;
      const maskedLocal = local.length > 2
        ? `${local[0]}${'•'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}`
        : `${local}•`;
      return `${maskedLocal}@${domain}`;
    }
    const clean = dest.replace(/[\s\-]/g, '');
    if (clean.length > 4) {
      return `${clean.slice(0, 3)} ${'•'.repeat(clean.length - 7)} ${clean.slice(-4)}`;
    }
    return dest;
  }
}
