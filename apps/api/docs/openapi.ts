/**
 * OpenAPI 3.0 Specification for ParkEazy API v1
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ParkEazy Marketplace API',
    version: '1.0.0',
    description: 'Shared REST API supporting ParkEazy User Website, Host Portal, Admin Panel, and future hybrid mobile clients.',
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
        summary: 'System Health Check',
        description: 'Returns the operational health, memory footprint, and active module status of the API.',
        responses: {
          200: {
            description: 'System is healthy',
          },
        },
      },
    },
    '/readiness': {
      get: {
        summary: 'System Readiness Check',
        description: 'Probes underlying critical dependencies (PostgreSQL database, cache, payment gateways).',
        responses: {
          200: {
            description: 'All probed dependencies are ready',
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Portal Login',
        description: 'Authenticates a user for User Website, Host Portal, or Admin Panel.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  requestedPortal: { type: 'string', enum: ['user', 'host', 'admin'] },
                },
                required: ['email'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Authentication successful',
          },
        },
      },
    },
    '/inventory/locations': {
      get: {
        summary: 'List Parking Locations',
        description: 'Fetches verified parking locations for marketplace search and host management.',
        responses: {
          200: {
            description: 'List of locations',
          },
        },
      },
    },
    '/bookings/rules': {
      get: {
        summary: 'Booking Invariants & Constraints',
        description: 'Returns the authoritative booking rules (10m hold, 1h-72h duration limits, 30m intervals, 15m transition buffer).',
        responses: {
          200: {
            description: 'Rules object',
          },
        },
      },
    },
    '/admin/ledger': {
      get: {
        summary: 'Append-Only Financial Ledger (Protected)',
        description: 'Returns the immutable double-entry financial ledger records.',
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Ledger entries list',
          },
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
  },
};
