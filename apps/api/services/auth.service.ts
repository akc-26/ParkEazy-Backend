import crypto from 'crypto';
import { UserRole, SessionUser, LoginResponse } from '../../../packages/contracts';
import { appConfig } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../middleware/error-handler';
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

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
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

      let user: SessionUser = DEMO_USERS.customer;
      if (requestedPortal === 'admin' || email.includes('admin')) {
        user = DEMO_USERS.admin;
      } else if (requestedPortal === 'host' || email.includes('host')) {
        user = DEMO_USERS.host;
      }

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
}

export const authService = AuthService.getInstance();
