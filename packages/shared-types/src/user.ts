/**
 * @fileoverview Domain contracts for User accounts, roles, RBAC, vehicles, and host profiles.
 */

export const USER_ROLES = ['customer', 'host', 'attendant', 'superadmin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type UserAccountStatus = 'active' | 'suspended' | 'pending_verification' | 'deleted';

export interface UserAccount {
  id: string; // UUID
  tenantId: string;
  email: string;
  phone?: string;
  fullName?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: UserAccountStatus;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  tenantId: string;
  role: UserRole;
  assignedAt: string;
}

export interface UserVehicle {
  id: string;
  userId: string;
  plateNumber: string;
  vehicleCategory: 'car' | 'bike' | 'auto' | 'suv';
  make?: string;
  model?: string;
  color?: string;
  isDefault: boolean;
  createdAt: string;
}

export type KycStatus = 'not_submitted' | 'pending_review' | 'verified' | 'rejected';

export interface HostProfile {
  id: string;
  userId: string;
  tenantId: string;
  businessName?: string;
  panNumber?: string;
  gstin?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankName?: string;
  kycStatus: KycStatus;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}
