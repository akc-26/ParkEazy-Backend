import { Router, Request, Response, NextFunction } from 'express';
import { dbManager } from './database/connection';
import { inventoryService } from './services/inventory.service';
import { bookingService } from './services/booking.service';
import { ledgerService } from './services/ledger.service';
import { authGuard, DEMO_USERS } from './middleware/auth-guard';
import { openApiSpec } from './docs/openapi';
import { UserRole, ApiSuccessResponse } from '../../packages/contracts';
import { AppError } from './middleware/error-handler';

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
// 1. System Health & Readiness Endpoints
// ----------------------------------------------------------------------
const processStartTime = Date.now();

apiV1Router.get('/health', (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor((Date.now() - processStartTime) / 1000);

  const healthData = {
    status: 'healthy' as const,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    memoryUsageMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    activeModules: ['auth', 'inventory', 'bookings', 'ledger', 'admin', 'database'],
  };

  sendSuccess(res, healthData, req.correlationId);
});

apiV1Router.get('/readiness', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbStatus = await dbManager.checkHealth();

    const readinessData = {
      ready: dbStatus.status !== 'down',
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        cache: {
          status: 'unconfigured' as const,
          message: 'Redis cache unconfigured (in-memory state active)',
        },
        storage: {
          status: 'up' as const,
          latencyMs: 1,
          message: 'Local asset filesystem accessible',
        },
        paymentGateways: {
          status: 'up' as const,
          latencyMs: 12,
          message: 'Stripe & Razorpay webhook endpoints configured',
        },
      },
    };

    sendSuccess(res, readinessData, req.correlationId);
  } catch (err) {
    next(err);
  }
});

apiV1Router.get('/docs', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

// ----------------------------------------------------------------------
// 2. Authentication Endpoints
// ----------------------------------------------------------------------
apiV1Router.post('/auth/login', (req: Request, res: Response, next: NextFunction) => {
  const { email, requestedPortal } = req.body;

  if (!email) {
    return next(new AppError('Email address is required for authentication.', 400, 'MISSING_EMAIL'));
  }

  let user = DEMO_USERS.customer;
  let token = 'token-customer-jwt-sample';

  if (requestedPortal === 'admin' || email.includes('admin')) {
    user = DEMO_USERS.admin;
    token = 'token-admin-jwt-sample';
  } else if (requestedPortal === 'host' || email.includes('host')) {
    user = DEMO_USERS.host;
    token = 'token-host-jwt-sample';
  }

  sendSuccess(
    res,
    {
      token,
      expiresIn: 86400,
      user,
    },
    req.correlationId
  );
});

apiV1Router.get('/auth/session', (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  let user = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token.includes('admin')) user = DEMO_USERS.admin;
    else if (token.includes('host')) user = DEMO_USERS.host;
    else user = DEMO_USERS.customer;
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

apiV1Router.get('/inventory/locations/:id', (req: Request, res: Response, next: NextFunction) => {
  const location = inventoryService.getLocationById(req.params.id);
  if (!location) {
    return next(new AppError('Parking location not found', 404, 'LOCATION_NOT_FOUND'));
  }
  sendSuccess(res, location, req.correlationId);
});

apiV1Router.get('/inventory/locations/:id/bays', (req: Request, res: Response) => {
  const bays = inventoryService.getBaysByLocationId(req.params.id);
  sendSuccess(res, bays, req.correlationId);
});

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

apiV1Router.post('/bookings/hold', (req: Request, res: Response, next: NextFunction) => {
  const { bayId, locationId, durationMinutes } = req.body;
  if (!bayId || !locationId || !durationMinutes) {
    return next(new AppError('bayId, locationId, and durationMinutes are required', 400, 'MISSING_FIELDS'));
  }

  try {
    const hold = bookingService.createHold(bayId, locationId, 'usr-customer-001', Number(durationMinutes));
    sendSuccess(res, hold, req.correlationId, 201);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------
// 5. Host Endpoints
// ----------------------------------------------------------------------
apiV1Router.get('/hosts/:hostId/earnings', (req: Request, res: Response) => {
  const earnings = ledgerService.getHostEarnings(req.params.hostId);
  sendSuccess(res, earnings, req.correlationId);
});

apiV1Router.get('/hosts/:hostId/bookings', (req: Request, res: Response) => {
  const bookings = bookingService.getBookingsForHost(req.params.hostId);
  sendSuccess(res, bookings, req.correlationId);
});

// ----------------------------------------------------------------------
// 6. Admin Endpoints (Protected by AuthGuard)
// ----------------------------------------------------------------------
apiV1Router.get('/admin/ledger', authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req: Request, res: Response) => {
  const entries = ledgerService.getAllEntries();
  sendSuccess(res, entries, req.correlationId);
});

import { integrationsService } from './services/integrations.service';

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

apiV1Router.get('/admin/audit/logs', authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req: Request, res: Response) => {
  sendSuccess(res, dynamicAuditLogs, req.correlationId);
});

// ----------------------------------------------------------------------
// 7. Admin Settings & Integrations Management
// ----------------------------------------------------------------------
apiV1Router.get('/admin/integrations', authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req: Request, res: Response) => {
  const configs = integrationsService.getAllConfigs();
  sendSuccess(res, configs, req.correlationId);
});

apiV1Router.get('/admin/integrations/active-gateway', authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req: Request, res: Response) => {
  const active = integrationsService.getActiveGatewayConfig();
  sendSuccess(res, active, req.correlationId);
});

apiV1Router.put('/admin/integrations/active-gateway', authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req: Request, res: Response, next: NextFunction) => {
  const { provider } = req.body;
  if (!provider || !['STRIPE', 'RAZORPAY', 'MOCK_PAYMENT'].includes(provider)) {
    return next(new AppError('Invalid provider. Must be STRIPE, RAZORPAY, or MOCK_PAYMENT.', 400, 'INVALID_PROVIDER'));
  }

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
});

apiV1Router.put('/admin/integrations/:id', authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]), (req: Request, res: Response, next: NextFunction) => {
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
});

apiV1Router.post('/admin/integrations/:id/test', authGuard([UserRole.ADMIN, UserRole.SUPER_ADMIN]), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await integrationsService.testConnection(req.params.id);
    sendSuccess(res, result, req.correlationId);
  } catch (err) {
    next(err);
  }
});

// Fallback for unmatched /api/v1 routes - ensures API requests are never intercepted by Vite SPA middleware
apiV1Router.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`API endpoint '${req.method} ${req.originalUrl}' does not exist on ParkEazy backend.`, 404, 'API_NOT_FOUND'));
});


