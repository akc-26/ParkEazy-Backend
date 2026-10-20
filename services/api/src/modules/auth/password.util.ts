/**
 * @fileoverview Cryptographic password hashing and verification using PBKDF2 with SHA-512.
 * Adheres to OWASP password storage recommendations with per-user cryptographic salt.
 */

import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

export function hashPassword(password: string, customSalt?: string): string {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) {
    return false;
  }

  const derivedKey = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );

  const derivedBuf = Buffer.from(derivedKey.toString('hex'), 'utf8');
  const originalBuf = Buffer.from(originalHash, 'utf8');

  if (derivedBuf.length !== originalBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedBuf, originalBuf);
}
