/**
 * OpenAPI 3.0 Specification for ParkEazy API v1
 * Authoritative contract documentation for ParkEazy REST services.
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ParkEazy Marketplace API',
    version: '1.0.0',
    description:
      'Centralized REST API supporting the ParkEazy User Website, Host Portal, Admin Panel, and future client applications.',
    contact: {
      name: 'ParkEazy Engineering Team',
      email: 'api@parkeazy.com',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current environment API v1 base',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System Liveness Check',
        description: 'Returns operational status, uptime, memory metrics, and active module status. Does not fail for optional dependencies.',
        responses: {
          200: {
            description: 'Process is running and responsive',
            headers: {
              'X-Correlation-Id': {
                schema: { type: 'string' },
                description: 'Unique correlation identifier for request tracing',
              },
            },
          },
        },
      },
    },
    '/readiness': {
      get: {
        summary: 'System Readiness Check',
        description:
          'Evaluates critical service dependencies (PostgreSQL connection, Redis cache connection, migration status, storage, and payment adapters). PostgreSQL and Redis are required dependencies; returns 200 only when both dependencies are connected and verified, and 503 if any required dependency is missing or unreachable. In-memory development mode is explicitly reported and never labeled production-ready.',
        responses: {
          200: {
            description: 'All required dependencies (PostgreSQL, Redis, migrations) are operational and connected',
          },
          503: {
            description: 'One or more required dependencies (PostgreSQL, Redis) are missing, unreachable, or in in-memory mode',
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Portal Authentication',
        description: 'Authenticates a user and issues a cryptographically signed HMAC-SHA256 JWT.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  requestedPortal: { type: 'string', enum: ['user', 'host', 'admin', 'customer'] },
                },
                required: ['email'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authentication successful with signed token',
          },
          400: {
            description: 'Validation failed or missing fields',
          },
          403: {
            description: 'Demo authentication disabled in production',
          },
        },
      },
    },
    '/auth/session': {
      get: {
        summary: 'Current Session Verification',
        description: 'Validates Bearer token signature and expiration, returning current authenticated user claims.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Session user payload' },
        },
      },
    },
    '/inventory/locations': {
      get: {
        summary: 'List Parking Locations',
        description: 'Fetches verified parking locations with coordinates and hourly/daily rates.',
        responses: {
          200: {
            description: 'List of locations',
          },
        },
      },
    },
    '/inventory/locations/{id}': {
      get: {
        summary: 'Get Location By ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Location details' },
          404: { description: 'Location not found' },
        },
      },
    },
    '/inventory/locations/{id}/bays': {
      get: {
        summary: 'List Bays for Location',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'List of physical parking bays' },
        },
      },
    },
    '/bookings/rules': {
      get: {
        summary: 'Booking Invariants & Constraints',
        description: 'Returns the authoritative booking rules (10m hold, 1h-72h duration limits, 30m intervals, 15m transition buffer).',
        responses: {
          200: { description: 'Rules object' },
        },
      },
    },
    '/bookings/hold': {
      post: {
        summary: 'Create Parking Bay Hold',
        description: 'Places a temporary 10-minute hold on a physical parking bay.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  bayId: { type: 'string' },
                  locationId: { type: 'string' },
                  durationMinutes: { type: 'integer', minimum: 60, maximum: 4320 },
                },
                required: ['bayId', 'locationId', 'durationMinutes'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Hold created successfully' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/hosts/{hostId}/earnings': {
      get: {
        summary: 'Host Earnings (Protected + Resource Ownership)',
        description: 'Retrieves host financial summaries. Caller must be the host owner or administrator.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'hostId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Earnings summary' },
          401: { description: 'Unauthenticated' },
          403: { description: 'Forbidden (Ownership violation or insufficient role)' },
        },
      },
    },
    '/hosts/{hostId}/bookings': {
      get: {
        summary: 'Host Bookings (Protected + Resource Ownership)',
        description: 'Retrieves bookings for host locations. Caller must be the host owner or administrator.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'hostId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'List of host bookings' },
          401: { description: 'Unauthenticated' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/payments/intent': {
      post: {
        summary: 'Create Payment Intent (Provider-Neutral Adapter)',
        description: 'Creates a payment intent using the configured active payment provider (Mock, Stripe, Razorpay).',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amountCents: { type: 'integer', minimum: 1 },
                  currency: { type: 'string', example: 'USD' },
                  bookingId: { type: 'string' },
                  idempotencyKey: { type: 'string' },
                },
                required: ['amountCents', 'currency', 'bookingId', 'idempotencyKey'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Payment intent created successfully' },
          400: { description: 'Card declined or validation error' },
          401: { description: 'Unauthenticated' },
        },
      },
    },
    '/admin/notifications/send': {
      post: {
        summary: 'Dispatch Notification (Provider-Neutral Adapter)',
        description: 'Dispatches an email, SMS, or push notification via the configured provider adapter.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  channel: { type: 'string', enum: ['EMAIL', 'SMS', 'PUSH'] },
                  type: {
                    type: 'string',
                    enum: ['BOOKING_CONFIRMED', 'HOLD_EXPIRING', 'PAYMENT_RECEIPT', 'SECURITY_ALERT'],
                  },
                  recipient: { type: 'string' },
                  content: { type: 'string' },
                },
                required: ['channel', 'type', 'recipient', 'content'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Notification queued or delivered' },
          400: { description: 'Validation error or provider failure' },
          401: { description: 'Unauthenticated' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/admin/ledger': {
      get: {
        summary: 'Append-Only Financial Ledger (Protected)',
        description: 'Returns the immutable double-entry financial ledger records.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Ledger entries list' },
          401: { description: 'Unauthenticated' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/admin/migrations': {
      get: {
        summary: 'Database Migration Status (Protected)',
        description: 'Returns applied and pending migration status.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Migration status report' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiSuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          correlationId: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ApiErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
              correlationId: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  },
};
