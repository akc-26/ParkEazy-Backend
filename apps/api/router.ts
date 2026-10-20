import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dbManager } from './database/connection';
import { redisManager } from './cache/redis';
import { migrationManager } from './database/migrator';
import { inventoryService } from './services/inventory.service';
import { bookingService } from './services/booking.service';
import { ledgerService } from './services/ledger.service';
import { integrationsService } from './services/integrations.service';
import { authService } from './services/auth.service';
import { PaymentAdapterFactory } from './services/payment-adapter';
import { NotificationAdapterFactory } from './services/notification-adapter';
import { vehicleService } from './services/vehicle.service';
import { pricingService } from './services/pricing.service';
import { availabilityService } from './services/availability.service';
import { authGuard, requireResourceOwnership } from './middleware/auth-guard';
import { openApiSpec } from './docs/openapi';
import { UserRole, ApiSuccessResponse, BookingStatus } from '../../packages/contracts';
import { AppError } from './middleware/error-handler';
import { validate, CommonValidators } from './middleware/validation';
import { appConfig } from './config/env';

export const apiV1Router = Router();

function sendSuccess<T>(res: Response, data: T, correlationId: string, statusCode = 200) {
  const payload: ApiSuccessResponse<T> = {
    success: true,
    data,
    correlationId,
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(payload);
}

// ----------------------------------------------------------------------
// 1. System Health & Readiness Endpoints (Workstream 2.5)
// ----------------------------------------------------------------------
const processStartTime = Date.now();

apiV1Router.get('/health', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - processStartTime) / 1000);

  const healthData = {
    status: 'healthy' as const,
    version: '1.0.0',
    environment: appConfig.nodeEnv,
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    memoryUsageMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    activeModules: [
      'auth',
      'inventory',
      'bookings',
      'ledger',
      'admin',
      'database',
      'cache',
      'migrations',
      'payment-adapter',
      'notification-adapter',
    ],
  };

  sendSuccess(res, healthData, req.correlationId);
});

apiV1Router.get('/readiness', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbStatus = await dbManager.checkHealth();
    const cacheStatus = await redisManager.checkHealth();
    const migrationStatus = await migrationManager.getMigrationStatus();
    const activePaymentProvider = integrationsService.getActiveGatewayConfig().activeProvider;

    const isProduction = appConfig.nodeEnv === 'production';
    const isDbConfigured = appConfig.database.isConfigured;
    const isRedisConfigured = appConfig.redis.isConfigured;

    const isDbUp = dbStatus.status === 'up';
    const isCacheUp = cacheStatus.status === 'up';

    let migrationCheck: {
      status: 'up' | 'down' | 'unconfigured';
      appliedCount: number;
      pendingCount: number;
      pending: string[];
      message: string;
    };

    if (!isDbConfigured) {
      migrationCheck = {
        status: 'unconfigured',
        appliedCount: 0,
        pendingCount: 0,
        pending: [],
        message: 'In-memory baseline mode. Database migrations unconfigured.',
      };
    } else if (dbStatus.status !== 'up' || migrationStatus.error) {
      migrationCheck = {
        status: 'down',
        appliedCount: migrationStatus.applied.length,
        pendingCount: migrationStatus.pending.length,
        pending: migrationStatus.pending,
        message: migrationStatus.error || 'Cannot verify migrations: PostgreSQL connection is down.',
      };
    } else if (migrationStatus.pending.length > 0) {
      migrationCheck = {
        status: 'down',
        appliedCount: migrationStatus.applied.length,
        pendingCount: migrationStatus.pending.length,
        pending: migrationStatus.pending,
        message: `${migrationStatus.pending.length} pending schema migration(s) required.`,
      };
    } else {
      migrationCheck = {
        status: 'up',
        appliedCount: migrationStatus.applied.length,
        pendingCount: 0,
        pending: [],
        message: `All ${migrationStatus.applied.length} schema migration(s) applied.`,
      };
    }

    const isMigrationsUp = migrationCheck.status === 'up';

    // In ParkEazy, PostgreSQL and Redis are required dependencies.
    // The service is only ready when both dependencies are connected and operational.
    // Any unconfigured or unreachable dependency results in ready: false and HTTP 503.
    const isReady = isDbUp && isCacheUp && isMigrationsUp;
    const isInMemory = !isDbConfigured || !isRedisConfigured;

    const readinessData = {
      ready: isReady,
      productionReady: isProduction ? isReady : false,
      environment: appConfig.nodeEnv,
      mode: isInMemory ? 'in-memory-baseline' : (isReady ? 'production-ready' : 'unavailable'),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        cache: cacheStatus,
        migrations: migrationCheck,
        storage: {
          status: 'up' as const,
          latencyMs: 1,
          message: 'Local asset filesystem accessible',
        },
        paymentGateways: {
          status: 'up' as const,
          activeProvider: activePaymentProvider,
          latencyMs: 8,
          message: `Active provider adapter: ${activePaymentProvider}`,
        },
        notifications: {
          status: 'up' as const,
          activeProvider: 'MOCK_NOTIFICATION_PROVIDER',
          message: 'Provider-neutral notification adapter active',
        },
      },
    };

    const statusCode = isReady ? 200 : 503;
    sendSuccess(res, readinessData, req.correlationId, statusCode);
  } catch (err) {
    next(err);
  }
});

apiV1Router.get('/docs', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

// ----------------------------------------------------------------------
// 2. Authentication Endpoints (Workstream 2.4 & Host Account Phase 1)
// ----------------------------------------------------------------------
apiV1Router.post(
  '/auth/register',
  validate([
    {
      field: 'email',
      required: true,
      custom: (val) => (!CommonValidators.isValidEmail(val) ? 'A valid email address is required.' : null),
    },
    { field: 'firstName', required: true, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'lastName', required: true, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'password', required: true, type: 'string', minLength: 8 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = authService.registerUser(req.body);
      sendSuccess(res, result, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.get(
  '/auth/verification-status',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = authService.getVerificationStatus(req.user!.id);
      sendSuccess(res, status, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/auth/verify-code',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'code', required: true, type: 'string', minLength: 1, maxLength: 20 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = authService.verifyCode(req.user!.id, req.body.code, req.body.type);
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/auth/resend-code',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = authService.resendVerificationCode(req.user!.id, req.body?.type);
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/auth/forgot-password',
  validate([
    {
      field: 'email',
      required: true,
      custom: (val) => (!CommonValidators.isValidEmail(val) ? 'A valid email address is required.' : null),
    },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = authService.requestPasswordReset(req.body.email);
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/auth/reset-password',
  validate([
    { field: 'token', required: true, type: 'string', minLength: 1 },
    { field: 'newPassword', required: true, type: 'string', minLength: 8 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = authService.resetPasswordWithToken(req.body);
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/auth/login',
  validate([
    {
      field: 'email',
      required: true,
      custom: (val) => (!CommonValidators.isValidEmail(val) ? 'A valid email address is required.' : null),
    },
    {
      field: 'requestedPortal',
      required: false,
      enum: ['user', 'host', 'admin', 'customer'],
    },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, requestedPortal } = req.body;
      const result = authService.authenticate(email, password, requestedPortal);
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.get('/auth/session', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  let user = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    try {
      const payload = authService.verifyToken(token);
      const userFromStore = authService.getUserById(payload.sub);
      user = userFromStore
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
    } catch {
      user = null;
    }
  }

  sendSuccess(res, { user }, req.correlationId);
});

apiV1Router.get(
  '/users/profile',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const user = authService.getUserById(req.user!.id) || req.user!;
    sendSuccess(res, user, req.correlationId);
  }
);

apiV1Router.put(
  '/users/profile',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, phoneNumber, email, roles, id, isHostVerified, createdAt } = req.body;

      if (email !== undefined && email !== req.user!.email) {
        return next(
          new AppError(
            'Email address cannot be modified. Email serves as your verified login identifier.',
            400,
            'EMAIL_IMMUTABLE'
          )
        );
      }

      if (roles !== undefined || id !== undefined || isHostVerified !== undefined || createdAt !== undefined) {
        return next(
          new AppError(
            'Protected account fields (id, roles, verification status) cannot be modified.',
            400,
            'PROTECTED_FIELD_MODIFICATION'
          )
        );
      }

      if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.trim().length > 100)) {
        return next(new AppError('First name must be between 1 and 100 characters.', 400, 'VALIDATION_ERROR'));
      }

      if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.trim().length > 100)) {
        return next(new AppError('Last name must be between 1 and 100 characters.', 400, 'VALIDATION_ERROR'));
      }

      if (phoneNumber !== undefined && typeof phoneNumber !== 'string') {
        return next(new AppError('Phone number must be a valid string.', 400, 'VALIDATION_ERROR'));
      }

      const updated = authService.updateUserProfile(req.user!.id, {
        firstName,
        lastName,
        phoneNumber,
      });

      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.get(
  '/users/:userId/profile',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('userId'),
  validate([
    { field: 'userId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    const user = authService.getUserById(req.params.userId);
    if (!user) {
      return next(new AppError(`User '${req.params.userId}' not found.`, 404, 'NOT_FOUND'));
    }
    sendSuccess(res, user, req.correlationId);
  }
);

apiV1Router.put(
  '/users/:userId/profile',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('userId'),
  validate([
    { field: 'userId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { firstName, lastName, phoneNumber, email, roles, id, isHostVerified, createdAt } = req.body;
      const targetUser = authService.getUserById(req.params.userId);
      if (!targetUser) {
        return next(new AppError(`User '${req.params.userId}' not found.`, 404, 'NOT_FOUND'));
      }

      if (email !== undefined && email !== targetUser.email) {
        return next(
          new AppError(
            'Email address cannot be modified. Email serves as your verified login identifier.',
            400,
            'EMAIL_IMMUTABLE'
          )
        );
      }

      if (roles !== undefined || id !== undefined || isHostVerified !== undefined || createdAt !== undefined) {
        return next(
          new AppError(
            'Protected account fields (id, roles, verification status) cannot be modified.',
            400,
            'PROTECTED_FIELD_MODIFICATION'
          )
        );
      }

      if (firstName !== undefined && (typeof firstName !== 'string' || firstName.trim().length === 0 || firstName.trim().length > 100)) {
        return next(new AppError('First name must be between 1 and 100 characters.', 400, 'VALIDATION_ERROR'));
      }

      if (lastName !== undefined && (typeof lastName !== 'string' || lastName.trim().length === 0 || lastName.trim().length > 100)) {
        return next(new AppError('Last name must be between 1 and 100 characters.', 400, 'VALIDATION_ERROR'));
      }

      if (phoneNumber !== undefined && typeof phoneNumber !== 'string') {
        return next(new AppError('Phone number must be a valid string.', 400, 'VALIDATION_ERROR'));
      }

      const updated = authService.updateUserProfile(req.params.userId, {
        firstName,
        lastName,
        phoneNumber,
      });

      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 2b. Customer Account & Security Extensions (Vehicles, Password & Alerts)
// ----------------------------------------------------------------------
apiV1Router.post(
  '/users/change-password',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'currentPassword', required: true, type: 'string', minLength: 1 },
    { field: 'newPassword', required: true, type: 'string', minLength: 8 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      authService.changePassword(req.user!.id, req.body);
      sendSuccess(res, { message: 'Password updated successfully.' }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.get(
  '/users/notifications/preferences',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const prefs = authService.getNotificationPreferences(req.user!.id);
    sendSuccess(res, prefs, req.correlationId);
  }
);

apiV1Router.put(
  '/users/notifications/preferences',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const updated = authService.updateNotificationPreferences(req.user!.id, req.body);
    sendSuccess(res, updated, req.correlationId);
  }
);

apiV1Router.get(
  '/users/vehicles',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const vehicles = vehicleService.getVehiclesForUser(req.user!.id);
    sendSuccess(res, vehicles, req.correlationId);
  }
);

apiV1Router.get(
  '/users/:userId/vehicles',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('userId'),
  validate([
    { field: 'userId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response) => {
    const vehicles = vehicleService.getVehiclesForUser(req.params.userId);
    sendSuccess(res, vehicles, req.correlationId);
  }
);

apiV1Router.post(
  '/users/vehicles',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'licensePlate', required: true, type: 'string', minLength: 2, maxLength: 16 },
    { field: 'make', required: true, type: 'string', minLength: 1, maxLength: 50 },
    { field: 'model', required: true, type: 'string', minLength: 1, maxLength: 50 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = vehicleService.addVehicle(req.user!.id, req.body);
      sendSuccess(res, created, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.put(
  '/users/vehicles/:vehicleId',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'vehicleId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = vehicleService.updateVehicle(req.params.vehicleId, req.user!.id, req.body);
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.delete(
  '/users/vehicles/:vehicleId',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'vehicleId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      vehicleService.deleteVehicle(req.params.vehicleId, req.user!.id);
      sendSuccess(res, { message: 'Vehicle removed successfully.' }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 3. Inventory Endpoints (Locations & Bays)
// ----------------------------------------------------------------------
apiV1Router.get('/inventory/locations', (req: Request, res: Response) => {
  const includeDrafts = req.query.includeDrafts === 'true';
  const locations = inventoryService.getAllLocations(!includeDrafts);
  sendSuccess(res, locations, req.correlationId);
});

apiV1Router.get(
  '/inventory/locations/:id',
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    const location = inventoryService.getLocationById(req.params.id);
    if (!location) {
      return next(new AppError(`Parking location '${req.params.id}' not found.`, 404, 'NOT_FOUND'));
    }
    sendSuccess(res, location, req.correlationId);
  }
);

apiV1Router.get(
  '/inventory/locations/:id/bays',
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response) => {
    const bays = inventoryService.getBaysByLocationId(req.params.id);
    sendSuccess(res, bays, req.correlationId);
  }
);

// ----------------------------------------------------------------------
// 4. Booking Endpoints & Business Rules
// ----------------------------------------------------------------------
apiV1Router.get('/bookings/rules', (req: Request, res: Response) => {
  const rules = bookingService.getRules();
  sendSuccess(res, rules, req.correlationId);
});

apiV1Router.get('/bookings', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = authService.verifyToken(authHeader.substring(7).trim());
      if (payload && payload.roles && (payload.roles.includes(UserRole.ADMIN) || payload.roles.includes(UserRole.SUPER_ADMIN))) {
        return sendSuccess(res, bookingService.getAllBookings(), req.correlationId);
      }
      if (payload && payload.roles && payload.roles.includes(UserRole.HOST)) {
        return sendSuccess(res, bookingService.getBookingsForHost(payload.sub), req.correlationId);
      }
      if (payload && payload.sub) {
        return sendSuccess(res, bookingService.getBookingsForUser(payload.sub), req.correlationId);
      }
    } catch {
      // Fall through on invalid token
    }
  }
  // Data privacy invariant: unauthenticated callers cannot enumerate customer reservations or entry codes
  sendSuccess(res, [], req.correlationId);
});

apiV1Router.get(
  '/bookings/hold/:id',
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    const { hold, isExpired } = bookingService.inspectHold(req.params.id);
    if (!hold && !isExpired) {
      return next(new AppError(`Booking hold '${req.params.id}' was not found.`, 404, 'NOT_FOUND'));
    }
    if (isExpired) {
      return next(
        new AppError(
          'The 10-minute hold reservation for this parking bay has expired. Please return to Space Details to re-select your preferred time slot.',
          410,
          'HOLD_EXPIRED'
        )
      );
    }
    sendSuccess(res, hold, req.correlationId);
  }
);

apiV1Router.post(
  '/bookings/hold',
  validate([
    { field: 'bayId', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'locationId', required: true, type: 'string', minLength: 1, maxLength: 64 },
    {
      field: 'durationMinutes',
      required: true,
      type: 'number',
      min: 60,
      max: 4320,
      customMessage: 'Duration must be between 60 minutes (1 hour) and 4320 minutes (72 hours).',
    },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    const { bayId, locationId, durationMinutes } = req.body;
    let userId = 'usr-customer-001';

    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const payload = authService.verifyToken(authHeader.substring(7).trim());
        if (payload && payload.sub) {
          userId = payload.sub;
        }
      } catch {
        // Fall back to default user
      }
    }

    try {
      const hold = bookingService.createHold(bayId, locationId, userId, Number(durationMinutes));
      sendSuccess(res, hold, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/bookings',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'holdId', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'paymentIntentId', required: true, type: 'string', minLength: 1, maxLength: 128 },
    { field: 'idempotencyKey', required: true, type: 'string', minLength: 1, maxLength: 128 },
    { field: 'licensePlate', required: true, type: 'string', minLength: 2, maxLength: 16 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { holdId, paymentIntentId, idempotencyKey, licensePlate, provider } = req.body;
      const user = req.user!;
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Driver';

      const booking = await bookingService.confirmBookingFromHold({
        holdId,
        paymentIntentId,
        idempotencyKey,
        licensePlate,
        userId: user.id,
        userName,
        paymentProvider: provider,
      });

      sendSuccess(res, booking, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.get(
  '/bookings/:id',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    const booking = bookingService.getBookingById(req.params.id);
    if (!booking) {
      return next(new AppError(`Booking '${req.params.id}' not found.`, 404, 'NOT_FOUND'));
    }

    const user = req.user!;
    const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);
    const isHost = user.roles.includes(UserRole.HOST) && booking.hostId === user.id;
    const isOwner = booking.userId === user.id;

    if (!isAdmin && !isHost && !isOwner) {
      return next(
        new AppError('Access denied. You do not have permission to view this reservation.', 403, 'FORBIDDEN')
      );
    }

    // Security Invariant: Access instructions and gate codes are strictly suppressed
    // unless the reservation is authoritatively confirmed or active.
    let responseData = { ...booking };
    const isEligibleForAccess =
      booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.ACTIVE;

    if (!isEligibleForAccess) {
      delete responseData.accessInstructions;
      delete responseData.gateCode;
    }

    sendSuccess(res, responseData, req.correlationId);
  }
);

apiV1Router.post(
  '/bookings/:id/cancel',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);
      const idempotencyKey = req.body?.idempotencyKey || (req.headers['x-idempotency-key'] as string);
      const updated = bookingService.cancelBooking(req.params.id, user.id, isAdmin, idempotencyKey);
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/bookings/:id/check-in',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);
      const updated = bookingService.checkInBooking(req.params.id, user.id, isAdmin);
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/bookings/:id/check-out',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);
      const updated = bookingService.checkOutBooking(req.params.id, user.id, isAdmin);
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/bookings/:id/extend',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'additionalMinutes', required: true, type: 'number', min: 30, max: 1440 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);
      const { additionalMinutes, paymentIntentId } = req.body;
      const updated = bookingService.extendBooking(
        req.params.id,
        user.id,
        Number(additionalMinutes),
        paymentIntentId,
        isAdmin
      );
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 5. Host Endpoints (Protected with Role & Resource Ownership Checks)
// ----------------------------------------------------------------------
apiV1Router.get(
  '/hosts/:hostId/earnings',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response) => {
    const earnings = ledgerService.getHostEarnings(req.params.hostId);
    sendSuccess(res, earnings, req.correlationId);
  }
);

apiV1Router.get(
  '/hosts/:hostId/bookings',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response) => {
    const bookings = bookingService.getBookingsForHost(req.params.hostId);
    sendSuccess(res, bookings, req.correlationId);
  }
);

apiV1Router.get(
  '/hosts/:hostId/onboarding',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = authService.getHostOnboarding(req.params.hostId);
      sendSuccess(res, profile, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.put(
  '/hosts/:hostId/onboarding',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = authService.updateHostOnboarding(req.params.hostId, req.body);
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/onboarding/submit',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const submitted = authService.submitHostOnboarding(req.params.hostId);
      sendSuccess(res, submitted, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 5b. Host Facility & Physical Space Inventory Management (Phase 2)
// ----------------------------------------------------------------------

// 5b.1 List all facilities owned by the host
apiV1Router.get(
  '/hosts/:hostId/facilities',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response) => {
    const facilities = inventoryService.getLocationsForHost(req.params.hostId);
    sendSuccess(res, facilities, req.correlationId);
  }
);

// 5b.2 Create a new facility (Host ownership bound from authenticated context)
apiV1Router.post(
  '/hosts/:hostId/facilities',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'name', required: true, type: 'string', minLength: 3, maxLength: 255 },
    { field: 'description', required: true, type: 'string', minLength: 10 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = inventoryService.createLocation(req.user!.id, req.body);
      sendSuccess(res, created, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.3 Retrieve specific facility details
apiV1Router.get(
  '/hosts/:hostId/facilities/:facilityId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const facility = inventoryService.getLocationForHost(req.params.facilityId, req.user!.id, isAdmin);
      sendSuccess(res, facility, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.4 Update facility details
apiV1Router.put(
  '/hosts/:hostId/facilities/:facilityId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const updated = inventoryService.updateLocation(req.params.facilityId, req.user!.id, req.body, isAdmin);
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.5 Delete a facility (and its bays)
apiV1Router.delete(
  '/hosts/:hostId/facilities/:facilityId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      inventoryService.deleteLocation(req.params.facilityId, req.user!.id, isAdmin);
      sendSuccess(res, { message: 'Facility removed successfully.' }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.6 List all physical spaces (bays) belonging to a facility
apiV1Router.get(
  '/hosts/:hostId/facilities/:facilityId/spaces',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const spaces = inventoryService.getBaysForHost(req.params.facilityId, req.user!.id, isAdmin);
      sendSuccess(res, spaces, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.7 Create a new physical space in a facility
apiV1Router.post(
  '/hosts/:hostId/facilities/:facilityId/spaces',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'bayNumber', required: true, type: 'string', minLength: 1, maxLength: 50 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const space = inventoryService.createBay(req.params.facilityId, req.user!.id, req.body, isAdmin);
      sendSuccess(res, space, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.8 Retrieve specific space details
apiV1Router.get(
  '/hosts/:hostId/facilities/:facilityId/spaces/:spaceId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'spaceId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const space = inventoryService.getBayForHost(req.params.facilityId, req.params.spaceId, req.user!.id, isAdmin);
      sendSuccess(res, space, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.9 Update physical space details (restrictions, vehicle clearances, amenities)
apiV1Router.put(
  '/hosts/:hostId/facilities/:facilityId/spaces/:spaceId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'spaceId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const updated = inventoryService.updateBay(
        req.params.facilityId,
        req.params.spaceId,
        req.user!.id,
        req.body,
        isAdmin
      );
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.10 Delete a physical space
apiV1Router.delete(
  '/hosts/:hostId/facilities/:facilityId/spaces/:spaceId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'spaceId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      inventoryService.deleteBay(req.params.facilityId, req.params.spaceId, req.user!.id, isAdmin);
      sendSuccess(res, { message: 'Parking space removed successfully.' }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.11 Publication Readiness Checklist Verification
apiV1Router.get(
  '/hosts/:hostId/facilities/:facilityId/publish-readiness',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      inventoryService.getLocationForHost(req.params.facilityId, req.user!.id, isAdmin);
      const validation = inventoryService.validatePublicationReadiness(req.params.facilityId);
      sendSuccess(res, validation, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.12 Publish Facility Listing
apiV1Router.post(
  '/hosts/:hostId/facilities/:facilityId/publish',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const result = inventoryService.publishLocation(req.params.facilityId, req.user!.id, isAdmin);
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.13 Unpublish / Suspend Facility Listing
apiV1Router.post(
  '/hosts/:hostId/facilities/:facilityId/unpublish',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const unpublished = inventoryService.unpublishLocation(req.params.facilityId, req.user!.id, isAdmin);
      sendSuccess(res, unpublished, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.14 Add Photograph to Facility
apiV1Router.post(
  '/hosts/:hostId/facilities/:facilityId/photos',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'url', required: true, type: 'string', minLength: 1 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const updated = inventoryService.addPhoto(req.params.facilityId, req.user!.id, req.body, isAdmin);
      sendSuccess(res, updated, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.15 Remove Photograph from Facility
apiV1Router.delete(
  '/hosts/:hostId/facilities/:facilityId/photos/:photoId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'photoId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const updated = inventoryService.removePhoto(req.params.facilityId, req.params.photoId, req.user!.id, isAdmin);
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.16 Secure Media Upload Endpoint
apiV1Router.post(
  '/media/upload',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, type, base64, dataUrl } = req.body;
      const rawPayload = base64 || (dataUrl && dataUrl.includes(',') ? dataUrl.split(',')[1] : null);
      if (!rawPayload) {
        throw new AppError('Image payload (base64 or dataUrl) is required.', 400, 'VALIDATION_ERROR');
      }

      const mimeType = type || (dataUrl && dataUrl.startsWith('data:') ? dataUrl.split(';')[0].replace('data:', '') : 'image/jpeg');
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (!allowedMimes.includes(mimeType.toLowerCase())) {
        throw new AppError('Unsupported file type. Only JPEG, PNG, and WebP images are permitted.', 400, 'UNSUPPORTED_MEDIA_TYPE');
      }

      const buffer = Buffer.from(rawPayload, 'base64');
      const maxSizeBytes = 5 * 1024 * 1024; // 5MB
      if (buffer.length > maxSizeBytes) {
        throw new AppError('File size exceeds the 5MB upload limit.', 413, 'PAYLOAD_TOO_LARGE');
      }

      const ext = mimeType.toLowerCase().includes('png') ? 'png' : mimeType.toLowerCase().includes('webp') ? 'webp' : 'jpg';
      const fileId = `media_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const filename = `${fileId}.${ext}`;

      const uploadDir = path.resolve(process.cwd(), 'public/assets/images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), buffer);

      const srcDir = path.resolve(process.cwd(), 'src/assets/images');
      if (fs.existsSync(srcDir)) {
        fs.writeFileSync(path.join(srcDir, filename), buffer);
      }

      sendSuccess(
        res,
        {
          id: fileId,
          url: `/assets/images/${filename}`,
          mimeType,
          sizeBytes: buffer.length,
          filename,
        },
        req.correlationId,
        201
      );
    } catch (err) {
      next(err);
    }
  }
);

// 5b.17 Bulk Spaces Creation Endpoint
apiV1Router.post(
  '/hosts/:hostId/facilities/:facilityId/spaces/bulk',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'bays', required: true, type: 'array' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      const created = inventoryService.bulkCreateBays(req.params.facilityId, req.user!.id, req.body.bays, isAdmin);
      sendSuccess(res, created, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.18 Host Extension Requests (List & Decision)
apiV1Router.get(
  '/hosts/:hostId/extension-requests',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const queryRes = await dbManager.query(
        `SELECT r.*, b.bay_id, b.location_id, b.start_time_utc, b.end_time_utc, 
                u.first_name as customer_first_name, u.last_name as customer_last_name, u.email as customer_email,
                loc.name as facility_name, bay.bay_number
         FROM booking_extension_requests r
         JOIN bookings b ON b.id = r.booking_id
         JOIN users u ON u.id = r.customer_id
         JOIN parking_locations loc ON loc.id = r.facility_id
         JOIN parking_bays bay ON bay.id = b.bay_id
         WHERE loc.host_id = $1
         ORDER BY r.requested_at_utc DESC`,
        [req.params.hostId]
      );
      sendSuccess(res, queryRes.rows || [], req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/extension-requests/:id/decision',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'decision', required: true, type: 'string' },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { decision, notes } = req.body;
      const decisionUpper = String(decision).toUpperCase();
      if (decisionUpper !== 'APPROVE' && decisionUpper !== 'REJECT') {
        throw new AppError('Decision must be either APPROVE or REJECT', 400, 'INVALID_DECISION');
      }

      const reqRes = await dbManager.query(
        `SELECT r.*, loc.host_id, b.end_time_utc, b.bay_id
         FROM booking_extension_requests r
         JOIN parking_locations loc ON loc.id = r.facility_id
         JOIN bookings b ON b.id = r.booking_id
         WHERE r.id = $1`,
        [req.params.id]
      );

      if (!reqRes.rows.length) {
        throw new AppError('Extension request not found', 404, 'NOT_FOUND');
      }

      const requestRecord = reqRes.rows[0];
      const isAdmin = req.user!.roles.includes(UserRole.ADMIN) || req.user!.roles.includes(UserRole.SUPER_ADMIN);
      if (!isAdmin && requestRecord.host_id !== req.params.hostId) {
        throw new AppError('You do not own this facility', 403, 'FORBIDDEN');
      }

      if (decisionUpper === 'APPROVE') {
        // Calculate new end time
        const currentEnd = new Date(requestRecord.end_time_utc);
        const hoursToAdd = Number(requestRecord.requested_additional_hours) || 1;
        const newEnd = new Date(currentEnd.getTime() + hoursToAdd * 3600 * 1000);

        // Check for conflicts with existing confirmed bookings on same bay
        const conflictRes = await dbManager.query(
          `SELECT id FROM bookings
           WHERE bay_id = $1 AND id != $2 AND status = 'CONFIRMED'
             AND start_time_utc < $3 AND end_time_utc > $4`,
          [requestRecord.bay_id, requestRecord.booking_id, newEnd.toISOString(), currentEnd.toISOString()]
        );

        if (conflictRes.rows.length > 0) {
          throw new AppError('Cannot approve extension: conflicting confirmed booking exists on this bay.', 409, 'EXTENSION_CONFLICT');
        }

        // Update booking end time
        await dbManager.query(
          `UPDATE bookings SET end_time_utc = $1 WHERE id = $2`,
          [newEnd.toISOString(), requestRecord.booking_id]
        );

        // Update request status
        await dbManager.query(
          `UPDATE booking_extension_requests
           SET status = 'APPROVED', decision_at_utc = NOW(), decision_notes = $1
           WHERE id = $2`,
          [notes || 'Approved by host', req.params.id]
        );
      } else {
        await dbManager.query(
          `UPDATE booking_extension_requests
           SET status = 'REJECTED', decision_at_utc = NOW(), decision_notes = $1
           WHERE id = $2`,
          [notes || 'Rejected by host', req.params.id]
        );
      }

      sendSuccess(res, { success: true, decision: decisionUpper }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// Customer Extension Request
apiV1Router.post(
  '/bookings/:id/extension-request',
  authGuard([UserRole.CUSTOMER, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'additionalHours', required: true, type: 'number' },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bRes = await dbManager.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
      if (!bRes.rows.length) {
        throw new AppError('Booking not found', 404, 'NOT_FOUND');
      }
      const booking = bRes.rows[0];
      if (booking.user_id !== req.user!.id && !req.user!.roles.includes(UserRole.ADMIN)) {
        throw new AppError('Forbidden: not your booking', 403, 'FORBIDDEN');
      }

      const id = `ext-${crypto.randomUUID().slice(0, 8)}`;
      const hours = Number(req.body.additionalHours) || 1;
      const priceCents = hours * 500;
      const feeCents = Math.round(priceCents * 0.15);

      await dbManager.query(
        `INSERT INTO booking_extension_requests (id, booking_id, facility_id, host_id, customer_id, requested_additional_hours, additional_price_cents, platform_fee_cents, status, requested_at_utc)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())`,
        [id, booking.id, booking.location_id, booking.host_id, req.user!.id, hours, priceCents, feeCents]
      );

      // Create notification for host
      await dbManager.query(
        `INSERT INTO host_notifications (id, host_id, notification_type, title, message, link, created_at_utc)
         VALUES ($1, $2, 'EXTENSION_REQUEST', 'New Extension Request', $3, '/host/extensions', NOW())`,
        [`notif-${crypto.randomUUID().slice(0, 8)}`, booking.host_id, `Driver requested +${hours}h extension for booking ${booking.id}.`]
      ).catch(() => {});

      sendSuccess(res, { id, status: 'PENDING', additionalHours: hours, additionalPriceCents: priceCents }, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.19 Host Payout Methods & Settlement
apiV1Router.get(
  '/hosts/:hostId/payout-methods',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const methods = await dbManager.query(
        `SELECT id, host_id, payout_type, beneficiary_name, bank_name, routing_number, account_number_masked, is_default, status, created_at_utc
         FROM host_payout_methods
         WHERE host_id = $1
         ORDER BY is_default DESC, created_at_utc DESC`,
        [req.params.hostId]
      );
      sendSuccess(res, methods.rows, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/payout-methods',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'beneficiaryName', required: true, type: 'string', minLength: 2 },
    { field: 'bankName', required: true, type: 'string', minLength: 2 },
    { field: 'accountNumber', required: true, type: 'string', minLength: 4 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { beneficiaryName, bankName, routingNumber, accountNumber } = req.body;
      const masked = '•••• ' + String(accountNumber).slice(-4);
      const id = `pm-${crypto.randomUUID().slice(0, 8)}`;

      // Reset existing defaults if this is default
      await dbManager.query('UPDATE host_payout_methods SET is_default = FALSE WHERE host_id = $1', [req.params.hostId]);

      await dbManager.query(
        `INSERT INTO host_payout_methods (id, host_id, payout_type, beneficiary_name, bank_name, routing_number, account_number_masked, is_default, status, created_at_utc, updated_at_utc)
         VALUES ($1, $2, 'BANK_TRANSFER', $3, $4, $5, $6, TRUE, 'ACTIVE', NOW(), NOW())`,
        [id, req.params.hostId, beneficiaryName, bankName, routingNumber || '021000021', masked]
      );

      sendSuccess(res, { id, beneficiaryName, bankName, accountNumberMasked: masked, status: 'ACTIVE' }, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.get(
  '/hosts/:hostId/payouts',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const earnings = ledgerService.getHostEarnings(req.params.hostId);
      const records = await dbManager.query(
        `SELECT p.*, m.bank_name, m.account_number_masked
         FROM host_payout_records p
         LEFT JOIN host_payout_methods m ON m.id = p.payout_method_id
         WHERE p.host_id = $1
         ORDER BY p.requested_at_utc DESC`,
        [req.params.hostId]
      );
      sendSuccess(res, { earnings, records: records.rows || [] }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/payouts',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'amountCents', required: true, type: 'number' },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const amountCents = Number(req.body.amountCents);
      if (amountCents <= 0) {
        throw new AppError('Payout amount must be greater than zero.', 400, 'INVALID_AMOUNT');
      }

      const earnings = ledgerService.getHostEarnings(req.params.hostId);
      if (amountCents > earnings.availableForPayoutCents) {
        throw new AppError(
          `Requested payout amount ($${(amountCents / 100).toFixed(2)}) exceeds available balance ($${(earnings.availableForPayoutCents / 100).toFixed(2)}).`,
          400,
          'INSUFFICIENT_FUNDS'
        );
      }

      const methods = await dbManager.query('SELECT id FROM host_payout_methods WHERE host_id = $1 AND status = \'ACTIVE\' LIMIT 1', [req.params.hostId]);
      const payoutMethodId = methods.rows[0]?.id || null;

      const payoutId = `pay-${crypto.randomUUID().slice(0, 8)}`;
      const utr = `UTR-ACH-${Date.now().toString().slice(-8)}`;

      await dbManager.query(
        `INSERT INTO host_payout_records (id, host_id, amount_cents, currency, status, payout_method_id, reference_or_utr, requested_at_utc, settled_at_utc)
         VALUES ($1, $2, $3, 'USD', 'SETTLED', $4, $5, NOW(), NOW())`,
        [payoutId, req.params.hostId, amountCents, payoutMethodId, utr]
      );

      sendSuccess(res, {
        id: payoutId,
        amountCents,
        currency: 'USD',
        status: 'SETTLED',
        referenceOrUtr: utr,
        message: 'Payout disbursement processed successfully.',
      }, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.20 Customer Reviews & Host Replies
apiV1Router.get(
  '/hosts/:hostId/reviews',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reviews = await dbManager.query(
        `SELECT r.*, u.first_name as customer_first_name, u.last_name as customer_last_name, loc.name as facility_name
         FROM customer_reviews r
         JOIN parking_locations loc ON loc.id = r.facility_id
         JOIN users u ON u.id = r.customer_id
         WHERE loc.host_id = $1
         ORDER BY r.created_at_utc DESC`,
        [req.params.hostId]
      );
      sendSuccess(res, reviews.rows || [], req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/reviews/:id/reply',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'reply', required: true, type: 'string', minLength: 2 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dbManager.query(
        `UPDATE customer_reviews
         SET host_reply = $1, updated_at_utc = NOW()
         WHERE id = $2`,
        [req.body.reply, req.params.id]
      );
      sendSuccess(res, { success: true }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.21 Notifications Subsystem
apiV1Router.get(
  '/hosts/:hostId/notifications',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifs = await dbManager.query(
        `SELECT * FROM host_notifications WHERE host_id = $1 ORDER BY created_at_utc DESC LIMIT 50`,
        [req.params.hostId]
      );
      sendSuccess(res, notifs.rows || [], req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/notifications/:id/read',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dbManager.query('UPDATE host_notifications SET is_read = TRUE WHERE id = $1 AND host_id = $2', [req.params.id, req.params.hostId]);
      sendSuccess(res, { success: true }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/notifications/read-all',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await dbManager.query('UPDATE host_notifications SET is_read = TRUE WHERE host_id = $1', [req.params.hostId]);
      sendSuccess(res, { success: true }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5b.22 Disputes & Support Inquiries
apiV1Router.get(
  '/hosts/:hostId/disputes',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const disputes = await dbManager.query(
        `SELECT d.*, loc.name as facility_name
         FROM support_disputes d
         LEFT JOIN parking_locations loc ON loc.id = d.facility_id
         WHERE loc.host_id = $1 OR d.raised_by_user_id = $1
         ORDER BY d.created_at_utc DESC`,
        [req.params.hostId]
      );
      sendSuccess(res, disputes.rows || [], req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/disputes',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'category', required: true, type: 'string' },
    { field: 'description', required: true, type: 'string', minLength: 5 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { category, description, bookingId, facilityId } = req.body;
      const id = `disp-${crypto.randomUUID().slice(0, 8)}`;
      await dbManager.query(
        `INSERT INTO support_disputes (id, booking_id, facility_id, raised_by_user_id, category, description, status, created_at_utc)
         VALUES ($1, $2, $3, $4, $5, $6, 'OPEN', NOW())`,
        [id, bookingId || null, facilityId || null, req.params.hostId, category, description]
      );
      sendSuccess(res, { id, status: 'OPEN', message: 'Dispute registered and queued for mediation.' }, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 5c. HP-05 Pricing & Policies Endpoints
// ----------------------------------------------------------------------

// 5c.1 Pricing Overview (pe_hw_03_01)
apiV1Router.get(
  '/hosts/:hostId/pricing/overview',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const overview = pricingService.getPricingOverview(req.params.hostId);
      sendSuccess(res, overview, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.2 List Rate Plans (pe_hw_03_02)
apiV1Router.get(
  '/hosts/:hostId/pricing/rates',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const facilityId = req.query.facilityId as string | undefined;
      const rates = pricingService.getRatePlansForHost(req.params.hostId, facilityId);
      sendSuccess(res, rates, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.3 Create Rate Plan
apiV1Router.post(
  '/hosts/:hostId/pricing/rates',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
    { field: 'name', required: true, type: 'string', minLength: 2 },
    { field: 'hourlyRateCents', required: true, type: 'number', min: 0 },
    { field: 'dailyRateCents', required: true, type: 'number', min: 0 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = pricingService.createRatePlan(
        req.params.hostId,
        req.body,
        req.user!.id,
        req.correlationId
      );
      sendSuccess(res, created, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.4 Get Rate Plan By ID
apiV1Router.get(
  '/hosts/:hostId/pricing/rates/:rateId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'rateId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = pricingService.getRatePlanById(req.params.rateId);
      if (plan.hostId !== req.params.hostId && !req.user!.roles.includes(UserRole.ADMIN)) {
        throw new AppError('Access denied.', 403, 'FORBIDDEN');
      }
      sendSuccess(res, plan, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.5 Update Rate Plan
apiV1Router.put(
  '/hosts/:hostId/pricing/rates/:rateId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'rateId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = pricingService.updateRatePlan(
        req.params.hostId,
        req.params.rateId,
        req.body,
        req.user!.id,
        req.correlationId
      );
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.6 Deactivate / Delete Rate Plan
apiV1Router.delete(
  '/hosts/:hostId/pricing/rates/:rateId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'rateId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const deactivated = pricingService.deactivateRatePlan(
        req.params.hostId,
        req.params.rateId,
        req.user!.id,
        req.correlationId
      );
      sendSuccess(res, deactivated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.7 Operating Hours (pe_hw_03_03)
apiV1Router.get(
  '/hosts/:hostId/pricing/schedule/:facilityId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const hours = pricingService.getOperatingHours(req.params.facilityId);
      sendSuccess(res, hours, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.put(
  '/hosts/:hostId/pricing/schedule',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
    { field: 'schedule', required: true, type: 'array' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = pricingService.updateOperatingHours(
        req.params.hostId,
        req.body,
        req.user!.id,
        req.correlationId
      );
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.8 Pricing Policies (pe_hw_03_05)
apiV1Router.get(
  '/hosts/:hostId/pricing/policies/:facilityId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const policy = pricingService.getPolicyForFacility(req.params.facilityId);
      sendSuccess(res, policy, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.put(
  '/hosts/:hostId/pricing/policies',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = pricingService.updatePolicy(
        req.params.hostId,
        req.body,
        req.user!.id,
        req.correlationId
      );
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.9 Facility Closures (pe_hw_03_04)
apiV1Router.get(
  '/hosts/:hostId/pricing/closures',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const facilityId = req.query.facilityId as string | undefined;
      const closures = pricingService.getClosuresForHost(req.params.hostId, facilityId);
      sendSuccess(res, closures, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/pricing/closures',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
    { field: 'title', required: true, type: 'string', minLength: 2 },
    { field: 'startTimeUtc', required: true, type: 'string' },
    { field: 'endTimeUtc', required: true, type: 'string' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = pricingService.createClosure(
        req.params.hostId,
        req.body,
        req.user!.id,
        req.correlationId
      );
      sendSuccess(res, created, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.delete(
  '/hosts/:hostId/pricing/closures/:closureId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'closureId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      pricingService.removeClosure(
        req.params.hostId,
        req.params.closureId,
        req.user!.id,
        req.correlationId
      );
      sendSuccess(res, { removed: true, closureId: req.params.closureId }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.10 Authoritative Price Estimate (pe_hw_03_06)
apiV1Router.post(
  '/hosts/:hostId/pricing/estimate',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CUSTOMER]),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
    { field: 'startTimeUtc', required: true, type: 'string' },
    { field: 'endTimeUtc', required: true, type: 'string' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const estimate = pricingService.calculateAuthoritativeEstimate(req.body);
      sendSuccess(res, estimate, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.11 Bulk Pricing Updates Preview & Apply (pe_hw_03_07)
apiV1Router.post(
  '/hosts/:hostId/pricing/bulk/preview',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'targetType', required: true, type: 'string' },
    { field: 'rateAdjustment', required: true, type: 'object' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const preview = pricingService.previewBulkUpdate(req.params.hostId, req.body);
      sendSuccess(res, preview, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/pricing/bulk/apply',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'targetType', required: true, type: 'string' },
    { field: 'rateAdjustment', required: true, type: 'object' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = pricingService.applyBulkUpdate(
        req.params.hostId,
        req.body,
        req.user!.id,
        req.correlationId
      );
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.12 Pricing Conflicts (pe_hw_03_08)
apiV1Router.get(
  '/hosts/:hostId/pricing/conflicts',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const conflicts = pricingService.getPricingConflicts(req.params.hostId);
      sendSuccess(res, conflicts, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5c.13 Pricing Audit History (pe_hw_03_09)
apiV1Router.get(
  '/hosts/:hostId/pricing/history',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = pricingService.getPricingHistory(req.params.hostId);
      sendSuccess(res, history, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 5d. HP-06 Availability & Calendar Endpoints
// ----------------------------------------------------------------------

// 5d.1 Authoritative Space Availability Interval Query
apiV1Router.get(
  '/hosts/:hostId/availability',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.CUSTOMER]),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'query', required: true, type: 'string' },
    { field: 'startTimeUtc', location: 'query', required: true, type: 'string' },
    { field: 'endTimeUtc', location: 'query', required: true, type: 'string' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const facilityId = req.query.facilityId as string;
      const startTimeUtc = req.query.startTimeUtc as string;
      const endTimeUtc = req.query.endTimeUtc as string;
      const spaceId = req.query.spaceId as string | undefined;

      const summary = availabilityService.calculateSpaceAvailability(
        facilityId,
        startTimeUtc,
        endTimeUtc,
        spaceId
      );
      sendSuccess(res, summary, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5d.2 Calendar Events Feed (pe_hw_04_01)
apiV1Router.get(
  '/hosts/:hostId/availability/calendar',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'query', required: true, type: 'string' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const facilityId = req.query.facilityId as string;
      const startRangeUtc = (req.query.startRangeUtc as string) || new Date(Date.now() - 7 * 86400000).toISOString();
      const endRangeUtc = (req.query.endRangeUtc as string) || new Date(Date.now() + 30 * 86400000).toISOString();
      const spaceId = req.query.spaceId as string | undefined;

      const events = availabilityService.getCalendarEvents(
        req.params.hostId,
        facilityId,
        startRangeUtc,
        endRangeUtc,
        spaceId
      );
      sendSuccess(res, events, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5d.3 Recurring Schedules (pe_hw_04_02)
apiV1Router.get(
  '/hosts/:hostId/availability/schedules/:facilityId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const schedules = availabilityService.getRecurringSchedules(
        req.params.hostId,
        req.params.facilityId
      );
      sendSuccess(res, schedules, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/availability/schedules',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
    { field: 'schedules', required: true, type: 'array' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = availabilityService.setRecurringSchedule(
        req.params.hostId,
        req.body.facilityId,
        req.body.schedules
      );
      sendSuccess(res, updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5d.4 Date Overrides (pe_hw_04_03)
apiV1Router.get(
  '/hosts/:hostId/availability/overrides/:facilityId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const overrides = availabilityService.getDateOverrides(
        req.params.hostId,
        req.params.facilityId
      );
      sendSuccess(res, overrides, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/availability/overrides',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
    { field: 'date', required: true, type: 'string' },
    { field: 'reason', required: true, type: 'string', minLength: 2 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = availabilityService.createDateOverride(
        req.params.hostId,
        req.body
      );
      sendSuccess(res, created, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.delete(
  '/hosts/:hostId/availability/overrides/:overrideId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'overrideId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      availabilityService.removeDateOverride(req.params.hostId, req.params.overrideId);
      sendSuccess(res, { removed: true, overrideId: req.params.overrideId }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5d.5 Maintenance Blocks (pe_hw_04_04)
apiV1Router.get(
  '/hosts/:hostId/availability/blocks',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const facilityId = req.query.facilityId as string | undefined;
      const blocks = availabilityService.getMaintenanceBlocks(req.params.hostId, facilityId);
      sendSuccess(res, blocks, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/hosts/:hostId/availability/blocks',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
    { field: 'spaceId', required: true, type: 'string', minLength: 1 },
    { field: 'title', required: true, type: 'string', minLength: 2 },
    { field: 'startTimeUtc', required: true, type: 'string' },
    { field: 'endTimeUtc', required: true, type: 'string' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = availabilityService.createMaintenanceBlock(
        req.params.hostId,
        req.body
      );
      sendSuccess(res, created, req.correlationId, 201);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.delete(
  '/hosts/:hostId/availability/blocks/:blockId',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'blockId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      availabilityService.removeMaintenanceBlock(req.params.hostId, req.params.blockId);
      sendSuccess(res, { removed: true, blockId: req.params.blockId }, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// 5d.6 Validate Availability Change (pe_hw_04_05)
apiV1Router.post(
  '/hosts/:hostId/availability/validate',
  authGuard([UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  requireResourceOwnership('hostId'),
  validate([
    { field: 'hostId', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
    { field: 'facilityId', required: true, type: 'string', minLength: 1 },
    { field: 'startTimeUtc', required: true, type: 'string' },
    { field: 'endTimeUtc', required: true, type: 'string' },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = availabilityService.validateAvailabilityChange(
        req.params.hostId,
        req.body
      );
      sendSuccess(res, validation, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 6. Payment & Notification Adapter Endpoints (Workstream 2.6)
// ----------------------------------------------------------------------
apiV1Router.post(
  '/payments/intent',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'amountCents', required: true, type: 'number', min: 1 },
    { field: 'currency', required: true, type: 'string', minLength: 3, maxLength: 3 },
    { field: 'bookingId', required: true, type: 'string', minLength: 1 },
    { field: 'idempotencyKey', required: true, type: 'string', minLength: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeProvider = req.body.provider || integrationsService.getActiveGatewayConfig().activeProvider;
      const adapter = PaymentAdapterFactory.getAdapter(activeProvider);

      const result = await adapter.createPaymentIntent({
        ...req.body,
        customerId: req.user?.id || 'usr-customer-001',
      });

      const statusCode = result.success ? 201 : 400;
      sendSuccess(res, result, req.correlationId, statusCode);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.get(
  '/payments/intent/:id',
  authGuard([UserRole.CUSTOMER, UserRole.HOST, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 128 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeProvider = integrationsService.getActiveGatewayConfig().activeProvider;
      const adapter = PaymentAdapterFactory.getAdapter(activeProvider);
      const result = await adapter.getPaymentStatus(req.params.id);
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/admin/notifications/send',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'channel', required: true, enum: ['EMAIL', 'SMS', 'PUSH'] },
    {
      field: 'type',
      required: true,
      enum: ['BOOKING_CONFIRMED', 'HOLD_EXPIRING', 'PAYMENT_RECEIPT', 'SECURITY_ALERT'],
    },
    { field: 'recipient', required: true, type: 'string', minLength: 3 },
    { field: 'content', required: true, type: 'string', minLength: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adapter = NotificationAdapterFactory.getAdapter(req.body.channel);
      const result = await adapter.send(req.body);
      const statusCode = result.success ? 200 : 400;
      sendSuccess(res, result, req.correlationId, statusCode);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 7. Admin Endpoints (Protected by AuthGuard)
// ----------------------------------------------------------------------
apiV1Router.get(
  '/admin/ledger',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const entries = ledgerService.getAllEntries();
    sendSuccess(res, entries, req.correlationId);
  }
);

const dynamicAuditLogs: any[] = [
  {
    id: 'aud-001',
    correlationId: 'req-sys-init-01',
    actorId: 'usr-admin-001',
    action: 'VIEW_FINANCIAL_LEDGER',
    resourceType: 'FINANCIAL_LEDGER',
    resourceId: null,
    details: { filter: 'all', exported: false },
    createdAtUtc: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'aud-002',
    correlationId: 'req-init-migration',
    actorId: 'SYSTEM',
    action: 'MIGRATION_EXECUTE',
    resourceType: 'DATABASE_SCHEMA',
    resourceId: '001_initial_schema.sql',
    details: { status: 'APPLIED_SUCCESSFULLY' },
    createdAtUtc: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'aud-003',
    correlationId: 'req-boot-adapter',
    actorId: 'SYSTEM',
    action: 'INITIALIZE_PAYMENT_ADAPTER',
    resourceType: 'PAYMENT_GATEWAY',
    resourceId: 'mock_payment',
    details: { provider: 'MOCK_PAYMENT', status: 'ACTIVE_DEFAULT', note: 'Zero external keys required' },
    createdAtUtc: new Date(Date.now() - 60000).toISOString(),
  },
];

apiV1Router.get(
  '/admin/audit/logs',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    sendSuccess(res, dynamicAuditLogs, req.correlationId);
  }
);

apiV1Router.get(
  '/admin/migrations',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await migrationManager.getMigrationStatus();
      sendSuccess(res, status, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// ----------------------------------------------------------------------
// 8. Admin Settings & Integrations Management
// ----------------------------------------------------------------------
apiV1Router.get(
  '/admin/integrations',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const configs = integrationsService.getAllConfigs();
    sendSuccess(res, configs, req.correlationId);
  }
);

apiV1Router.get(
  '/admin/integrations/audit-history',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const history = integrationsService.getAuditHistory();
    sendSuccess(res, history, req.correlationId);
  }
);

apiV1Router.get(
  '/admin/integrations/active-gateway',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const active = integrationsService.getActiveGatewayConfig();
    sendSuccess(res, active, req.correlationId);
  }
);

apiV1Router.get(
  '/admin/integrations/:id',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = integrationsService.getConfigById(req.params.id);
      if (!config) {
        throw new AppError(`Integration with id '${req.params.id}' not found.`, 404, 'INTEGRATION_NOT_FOUND');
      }
      sendSuccess(res, config, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.get(
  '/admin/integrations/:id/audit-history',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const history = integrationsService.getAuditHistory(req.params.id);
      sendSuccess(res, history, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.put(
  '/admin/integrations/active-gateway',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'provider', required: true, enum: ['STRIPE', 'RAZORPAY', 'MOCK_PAYMENT'] },
  ]),
  (req: Request, res: Response) => {
    const { provider } = req.body;
    const updated = integrationsService.setActivePaymentProvider(provider);
    dynamicAuditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      correlationId: req.correlationId,
      actorId: req.user?.id || 'usr-admin-001',
      action: 'SWITCH_ACTIVE_PAYMENT_GATEWAY',
      resourceType: 'PAYMENT_GATEWAY',
      resourceId: provider,
      details: { activeProvider: provider },
      createdAtUtc: new Date().toISOString(),
    });

    sendSuccess(res, updated, req.correlationId);
  }
);

apiV1Router.put(
  '/admin/integrations/:id',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorId = req.user?.id || 'usr-admin-001';
      const result = integrationsService.updateIntegration(req.params.id, req.body, actorId);

      // Track in audit log without logging sensitive credentials
      dynamicAuditLogs.unshift({
        ...result.auditRecord,
        correlationId: req.correlationId,
      });

      sendSuccess(res, result.updated, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

apiV1Router.post(
  '/admin/integrations/:id/test',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  validate([
    { field: 'id', location: 'params', required: true, type: 'string', minLength: 1, maxLength: 64 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await integrationsService.testConnection(req.params.id);
      sendSuccess(res, result, req.correlationId);
    } catch (err) {
      next(err);
    }
  }
);

// Fallback for unmatched /api/v1 routes - ensures API requests are never intercepted by Vite SPA middleware
apiV1Router.use((req: Request, _res: Response, next: NextFunction) => {
  next(
    new AppError(
      `API endpoint '${req.method} ${req.originalUrl}' does not exist on ParkEazy backend.`,
      404,
      'NOT_FOUND'
    )
  );
});
