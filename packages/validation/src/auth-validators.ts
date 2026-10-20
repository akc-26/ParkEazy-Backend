/**
 * @fileoverview Validation logic for Authentication, Credentials, OTP, and KYC inputs.
 */

import { ValidationResult } from './tenant-validator';
import { isValidEmail, isValidTenantId, sanitizeString } from './common-validators';
import { LoginCredentials, SignupPayload, HostKycSubmissionPayload } from '@parkeazy/shared-types';

// Indian mobile or general E.164: e.g. +919876543210 or 9876543210
const PHONE_REGEX = /^(\+91[\-\s]?)?[6-9]\d{9}$/;
const OTP_REGEX = /^\d{6}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const clean = phone.replace(/[\s\-]/g, '');
  return PHONE_REGEX.test(clean);
}

export function isValidOtp(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return OTP_REGEX.test(code.trim());
}

export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters in length');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one numeric digit');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }
  return { valid: errors.length === 0, errors };
}

export function isValidPan(pan: string): boolean {
  if (!pan || typeof pan !== 'string') return false;
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

export function isValidGstin(gstin: string): boolean {
  if (!gstin || typeof gstin !== 'string') return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
}

export function isValidIfsc(ifsc: string): boolean {
  if (!ifsc || typeof ifsc !== 'string') return false;
  return IFSC_REGEX.test(ifsc.trim().toUpperCase());
}

export function validateLoginPayload(input: unknown): ValidationResult<LoginCredentials> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Login payload must be a non-null object'] };
  }
  const p = input as Record<string, unknown>;
  const email = sanitizeString(p.email);
  const password = typeof p.password === 'string' ? p.password : undefined;
  const otpCode = typeof p.otpCode === 'string' ? p.otpCode.trim() : undefined;
  const tenantId = typeof p.tenantId === 'string' ? p.tenantId.trim() : 'default';

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required for authentication');
  }
  if (!password && !otpCode) {
    errors.push('Either password or 6-digit OTP code must be provided');
  }
  if (otpCode && !isValidOtp(otpCode)) {
    errors.push('OTP code must be exactly 6 numeric digits');
  }
  if (!isValidTenantId(tenantId)) {
    errors.push('Invalid tenantId identifier format');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email,
      password,
      otpCode,
      tenantId,
    },
    errors: [],
  };
}

export function validateSignupPayload(input: unknown): ValidationResult<SignupPayload> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['Signup payload must be a non-null object'] };
  }
  const p = input as Record<string, unknown>;
  const email = sanitizeString(p.email);
  const fullName = sanitizeString(p.fullName);
  const phone = typeof p.phone === 'string' ? sanitizeString(p.phone) : undefined;
  const password = typeof p.password === 'string' ? p.password : undefined;
  const tenantId = typeof p.tenantId === 'string' ? p.tenantId.trim() : 'default';
  const role = typeof p.role === 'string' ? (p.role as SignupPayload['role']) : 'customer';
  const preferredVehicleCategory = typeof p.preferredVehicleCategory === 'string'
    ? (p.preferredVehicleCategory as SignupPayload['preferredVehicleCategory'])
    : 'car';

  if (!email || !isValidEmail(email)) {
    errors.push('A valid email address is required');
  }
  if (!fullName || fullName.length < 2) {
    errors.push('Full name must be at least 2 characters in length');
  }
  if (phone && !isValidPhone(phone)) {
    errors.push('Invalid phone number format. Provide 10-digit Indian mobile number');
  }
  if (password) {
    const passCheck = isValidPassword(password);
    if (!passCheck.valid) {
      errors.push(...passCheck.errors);
    }
  }
  if (!isValidTenantId(tenantId)) {
    errors.push('Invalid tenantId identifier format');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      email,
      fullName,
      phone,
      password,
      tenantId,
      role,
      preferredVehicleCategory,
    },
    errors: [],
  };
}

export function validateHostKycPayload(input: unknown): ValidationResult<HostKycSubmissionPayload> {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { success: false, errors: ['KYC payload must be a non-null object'] };
  }
  const p = input as Record<string, unknown>;
  const panNumber = typeof p.panNumber === 'string' ? p.panNumber.trim().toUpperCase() : '';
  const bankAccountNumber = typeof p.bankAccountNumber === 'string' ? p.bankAccountNumber.trim() : '';
  const bankIfsc = typeof p.bankIfsc === 'string' ? p.bankIfsc.trim().toUpperCase() : '';
  const bankName = sanitizeString(p.bankName);
  const gstin = typeof p.gstin === 'string' && p.gstin.trim() ? p.gstin.trim().toUpperCase() : undefined;
  const businessName = typeof p.businessName === 'string' ? sanitizeString(p.businessName) : undefined;
  const emergencyContactName = typeof p.emergencyContactName === 'string' ? sanitizeString(p.emergencyContactName) : undefined;
  const emergencyContactPhone = typeof p.emergencyContactPhone === 'string' ? sanitizeString(p.emergencyContactPhone) : undefined;

  if (!panNumber || !isValidPan(panNumber)) {
    errors.push('Valid 10-character PAN number is required (e.g. ABCDE1234F)');
  }
  if (gstin && !isValidGstin(gstin)) {
    errors.push('Invalid 15-character GSTIN format (e.g. 33AAAAA0000A1Z5)');
  }
  if (!bankAccountNumber || bankAccountNumber.length < 9 || bankAccountNumber.length > 18) {
    errors.push('Valid bank account number (9 to 18 digits) is required');
  }
  if (!bankIfsc || !isValidIfsc(bankIfsc)) {
    errors.push('Valid 11-character Indian Bank IFSC code is required (e.g. HDFC0001234)');
  }
  if (!bankName || bankName.length < 3) {
    errors.push('Bank name and branch information is required');
  }
  if (emergencyContactPhone && !isValidPhone(emergencyContactPhone)) {
    errors.push('Emergency contact phone must be a valid 10-digit mobile number');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      panNumber,
      gstin,
      bankAccountNumber,
      bankIfsc,
      bankName,
      businessName,
      emergencyContactName,
      emergencyContactPhone,
    },
    errors: [],
  };
}
