/**
 * Authentication and authorization contracts for ParkEazy
 */

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  phoneNumber?: string;
  isHostVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  requestedPortal?: 'user' | 'host' | 'admin';
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: SessionUser;
  onboardingStep?: HostOnboardingStep;
  applicationStatus?: HostApplicationStatus;
}

export interface RolePermissionMatrix {
  role: UserRole;
  permissions: string[];
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface CustomerVehicle {
  id: string;
  userId: string;
  licensePlate: string;
  make: string;
  model: string;
  color?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVehicleRequest {
  licensePlate: string;
  make: string;
  model: string;
  color?: string;
  isDefault?: boolean;
}

export interface UpdateVehicleRequest {
  make?: string;
  model?: string;
  color?: string;
  isDefault?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailBookingConfirmations: boolean;
  emailReminders: boolean;
  smsGateAccess: boolean;
  smsExpiryAlerts: boolean;
  pushStatusUpdates: boolean;
  updatedAt: string;
}

// --------------------------------------------------------------------------
// Host Account, Verification, Password Recovery & Onboarding Contracts
// --------------------------------------------------------------------------

export type HostBusinessType = 'INDIVIDUAL' | 'BUSINESS' | 'PROPERTY_MANAGER';
export type HostOwnershipType = 'OWNED' | 'LEASED' | 'AUTHORIZED_REPRESENTATIVE';
export type HostApplicationStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'ACTION_REQUIRED'
  | 'SUSPENDED';
export type HostOnboardingStep =
  | 'PROFILE'
  | 'ELIGIBILITY'
  | 'SUBMITTED'
  | 'APPROVED';

export interface HostRegisterRequest {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  requestedPortal?: 'host' | 'user';
  businessType?: HostBusinessType;
  businessName?: string;
  acceptsTerms: boolean;
  acceptsHostAgreement?: boolean;
}

export interface HostRegisterResponse {
  token: string;
  expiresIn: number;
  user: SessionUser;
  verificationRequired: boolean;
  onboardingStep: HostOnboardingStep;
  applicationStatus: HostApplicationStatus;
}

export interface VerificationStatusResponse {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  email: string;
  phoneNumber?: string;
  pendingVerificationType: 'EMAIL' | 'SMS' | 'NONE';
  expiresAtUtc?: string;
}

export interface VerifyCodeRequest {
  code: string;
  type?: 'EMAIL' | 'SMS';
}

export interface ResendCodeRequest {
  type?: 'EMAIL' | 'SMS';
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResendCodeResponse {
  success: boolean;
  message: string;
  target: string;
  code?: string;
  deliveryStatus?: 'DELIVERED' | 'SIMULATED' | 'FAILED' | 'UNCONFIGURED';
  provider?: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  resetToken?: string;
  deliveryStatus?: 'DELIVERED' | 'SIMULATED' | 'FAILED' | 'UNCONFIGURED';
  provider?: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface HostOnboardingProfile {
  userId: string;
  businessType: HostBusinessType;
  businessName?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  ownershipType: HostOwnershipType;
  propertyTypes: string[];
  hasLiabilityInsurance: boolean;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  acceptsTerms: boolean;
  acceptsHostAgreement: boolean;
  applicationStatus: HostApplicationStatus;
  onboardingStep: HostOnboardingStep;
  statusReason?: string;
  submittedAtUtc?: string;
  reviewedAtUtc?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateHostOnboardingRequest {
  businessType?: HostBusinessType;
  businessName?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  ownershipType?: HostOwnershipType;
  propertyTypes?: string[];
  hasLiabilityInsurance?: boolean;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  acceptsTerms?: boolean;
  acceptsHostAgreement?: boolean;
  onboardingStep?: HostOnboardingStep;
}
