import { Request, Response, NextFunction } from 'express';
import { UserRole, SessionUser } from '../../../packages/contracts';
import { UnauthorizedError, ForbiddenError } from './error-handler';
import { authService } from '../services/auth.service';

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

/**
 * Middleware that requires a valid Authorization header with Bearer token.
 * Extracts the user claims, verifies cryptographic signature, checks expiration,
 * and attaches the authenticated principal to req.user.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Authentication required. Missing Bearer token.'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(new UnauthorizedError('Authentication token cannot be empty.'));
  }

  try {
    const payload = authService.verifyToken(token);

    const userFromStore = authService.getUserById(payload.sub);
    req.user = userFromStore
      ? { ...userFromStore }
      : {
          id: payload.sub,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          roles: payload.roles,
          isHostVerified: payload.roles.includes(UserRole.HOST) || payload.roles.includes(UserRole.ADMIN),
          createdAt: new Date(payload.iat * 1000).toISOString(),
        };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware that verifies the authenticated user possesses at least one of the specified roles.
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required prior to role verification.'));
    }

    const hasPermission = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasPermission) {
      return next(
        new ForbiddenError(
          `Access forbidden. Requires one of roles: ${allowedRoles.join(', ')}.`
        )
      );
    }

    next();
  };
}

/**
 * Verifies that the authenticated user owns the resource referenced by a route parameter,
 * or is an administrator with override privileges.
 */
export function requireResourceOwnership(paramName = 'hostId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required for ownership verification.'));
    }

    // Admins and Super Admins have global operational access
    if (
      req.user.roles.includes(UserRole.ADMIN) ||
      req.user.roles.includes(UserRole.SUPER_ADMIN)
    ) {
      return next();
    }

    const resourceOwnerId = req.params[paramName];
    if (!resourceOwnerId) {
      return next(new ForbiddenError(`Route parameter '${paramName}' is missing for ownership check.`));
    }

    if (req.user.id !== resourceOwnerId) {
      return next(
        new ForbiddenError(
          `Access denied. You do not have permission to access or modify resources owned by '${resourceOwnerId}'.`
        )
      );
    }

    next();
  };
}

/**
 * Unified authGuard middleware supporting optional role checks.
 * Preserves exact signature and interface of existing Phase 1 foundation.
 */
export function authGuard(allowedRoles?: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, (err) => {
      if (err) return next(err);
      if (allowedRoles && allowedRoles.length > 0) {
        return requireRoles(allowedRoles)(req, res, next);
      }
      next();
    });
  };
}
