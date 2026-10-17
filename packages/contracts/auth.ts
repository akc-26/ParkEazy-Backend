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
