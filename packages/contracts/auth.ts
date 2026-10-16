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
