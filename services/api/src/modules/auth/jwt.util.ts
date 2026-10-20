/**
 * @fileoverview Compact, zero-dependency JWT implementation for ParkEazy authentication.
 * Uses HMAC-SHA256 with constant-time verification and multi-tenant claims.
 */

import crypto from 'crypto';
import { JwtPayload } from '@parkeazy/shared-types';

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function validateJwtSecret(secret?: string): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const effectiveSecret = secret || process.env.JWT_SECRET;

  if (isProduction) {
    if (!effectiveSecret || effectiveSecret.trim().length < 32) {
      throw new Error(
        '[Security Exception] Production requires a cryptographically strong JWT_SECRET of at least 32 characters. Startup halted.'
      );
    }
    if (effectiveSecret.includes('development') || effectiveSecret.includes('super-secret')) {
      throw new Error(
        '[Security Exception] Known development JWT secret detected in production environment. Startup halted.'
      );
    }
  }

  return effectiveSecret || 'parkeazy-development-super-secret-key-2026!';
}

export function signJwt(payload: JwtPayload, secret: string, expiresInSeconds = 3600): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signatureInput}.${signature}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token format');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT structure: must contain 3 parts');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuf = Buffer.from(signature, 'utf8');
  const expectedBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Invalid JWT signature');
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as JwtPayload;
  } catch {
    throw new Error('Invalid JWT payload encoding');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error(`Token expired at timestamp ${payload.exp}`);
  }

  return payload;
}

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64UrlDecode(parts[1])) as JwtPayload;
  } catch {
    return null;
  }
}
