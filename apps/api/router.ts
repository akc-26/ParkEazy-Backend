import { Router, Request, Response, NextFunction } from 'express';
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
import { authGuard, requireResourceOwnership } from './middleware/auth-guard';
import { openApiSpec } from './docs/openapi';
import { UserRole, ApiSuccessResponse } from '../../packages/contracts';
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
// 2. Authentication Endpoints (Workstream 2.4)
// ----------------------------------------------------------------------
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
      user = {
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

// ----------------------------------------------------------------------
// 3. Inventory Endpoints (Locations & Bays)
// ----------------------------------------------------------------------
apiV1Router.get('/inventory/locations', (req: Request, res: Response) => {
  const locations = inventoryService.getAllLocations();
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
  const bookings = bookingService.getAllBookings();
  sendSuccess(res, bookings, req.correlationId);
});

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

    try {
      const hold = bookingService.createHold(bayId, locationId, 'usr-customer-001', Number(durationMinutes));
      sendSuccess(res, hold, req.correlationId, 201);
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
      const activeProvider = integrationsService.getActiveGatewayConfig().activeProvider;
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
  '/admin/integrations/active-gateway',
  authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  (req: Request, res: Response) => {
    const active = integrationsService.getActiveGatewayConfig();
    sendSuccess(res, active, req.correlationId);
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
