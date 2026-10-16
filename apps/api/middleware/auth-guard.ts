import { Request, Response, NextFunction } from 'express';
import { UserRole, SessionUser } from '../../../packages/contracts';
import { AppError } from './error-handler';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

// Built-in seed users for testing baseline authentication and role verification
export const DEMO_USERS: Record<string, SessionUser> = {
  customer: {
    id: 'usr-customer-001',
    email: 'driver@parkeazy.com',
    firstName: 'Alex',
    lastName: 'Morgan',
    roles: [UserRole.CUSTOMER],
    phoneNumber: '+1-555-0199',
    isHostVerified: false,
    createdAt: '2026-01-15T08:00:00Z',
  },
  host: {
    id: 'usr-host-001',
    email: 'host@parkeazy.com',
    firstName: 'Marcus',
    lastName: 'Chen',
    roles: [UserRole.CUSTOMER, UserRole.HOST],
    phoneNumber: '+1-555-0144',
    isHostVerified: true,
    createdAt: '2026-01-10T09:30:00Z',
  },
  admin: {
    id: 'usr-admin-001',
    email: 'admin@parkeazy.com',
    firstName: 'Elena',
    lastName: 'Rostova',
    roles: [UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    isHostVerified: true,
    createdAt: '2025-11-01T12:00:00Z',
  },
};

export function authGuard(allowedRoles?: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];
    let user: SessionUser | undefined;

    if (token.includes('customer')) {
      user = DEMO_USERS.customer;
    } else if (token.includes('host')) {
      user = DEMO_USERS.host;
    } else if (token.includes('admin')) {
      user = DEMO_USERS.admin;
    } else {
      // Default to demo customer if token exists
      user = DEMO_USERS.customer;
    }

    if (!user) {
      return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
    }

    req.user = user;

    if (allowedRoles && allowedRoles.length > 0) {
      const hasPermission = user.roles.some((r) => allowedRoles.includes(r));
      if (!hasPermission) {
        return next(
          new AppError(
            `Access forbidden. Requires one of roles: ${allowedRoles.join(', ')}`,
            403,
            'FORBIDDEN_ROLE'
          )
        );
      }
    }

    next();
  };
}
