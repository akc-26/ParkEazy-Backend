/**
 * @fileoverview Domain contracts for Authentication, Sessions, JWT, OTP, and Multi-Tenancy.
 */

import { UserRole, UserAccount } from './user';

export interface JwtPayload {
  sub: string; // User ID (UUID)
  tenantId: string;
  email: string;
  roles: UserRole[];
  fullName?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresInSeconds: number;
}

export interface AuthSession {
  id: string;
  userId: string;
  tenantId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  tenantId?: string;
  otpCode?: string;
}

export interface SignupPayload {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  tenantId?: string;
  role?: UserRole;
  preferredVehicleCategory?: 'car' | 'bike' | 'auto' | 'suv';
}

export interface OtpChallengeRequest {
  destination: string; // Phone number or email
  channel: 'sms' | 'email';
  purpose: 'login' | 'signup' | 'reset_password' | 'verify_phone';
  tenantId?: string;
}

export interface OtpChallengeResponse {
  challengeId: string;
  destinationMasked: string;
  expiresInSeconds: number;
  channel: 'sms' | 'email';
  mockCodeNotice?: string;
}

export interface VerifyOtpRequest {
  challengeId: string;
  code: string;
  destination: string;
  tenantId?: string;
}

export interface ForgotPasswordRequest {
  email: string;
  tenantId?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  tenantId?: string;
}

export interface AuthUserResponse {
  user: UserAccount;
  tokens: AuthTokenPair;
}

export interface HostKycSubmissionPayload {
  businessName?: string;
  panNumber: string;
  gstin?: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}
