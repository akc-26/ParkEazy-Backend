import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { apiV1Router } from './apps/api/router';
import { correlationMiddleware, requestLogger } from './apps/api/middleware/correlation';
import { errorHandler } from './apps/api/middleware/error-handler';
import { appConfig } from './apps/api/config/env';
import { dbManager } from './apps/api/database/connection';
import { redisManager } from './apps/api/cache/redis';

dotenv.config();

let isShuttingDown = false;

/**
 * Creates and configures the Express application with security headers,
 * request parsing limits, correlation tracing, and API routing.
 */
export function createApp(): express.Express {
  const app = express();

  // 1. Graceful shutdown rejection middleware for incoming API calls
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (isShuttingDown && (req.path.startsWith('/api') || req.path.startsWith(appConfig.apiPrefix))) {
      res.setHeader('Connection', 'close');
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Server is undergoing graceful shutdown. Please retry shortly.',
          correlationId: (req as any).correlationId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
    next();
  });

  // 2. Body limit parsing
  app.use(express.json({ limit: appConfig.bodyLimit || '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: appConfig.bodyLimit || '1mb' }));

  // 3. Correlation ID & request logger
  app.use(correlationMiddleware);
  app.use(requestLogger);

  // 4. Security Headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (appConfig.nodeEnv === 'production' || process.env.APP_URL?.startsWith('https://')) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // 5. CORS policy
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined;
    const allowed = appConfig.corsOrigins.includes('*') || (origin && appConfig.corsOrigins.includes(origin));
    if (allowed) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id, X-Request-Id, Origin, X-Requested-With, Accept');
      if (origin && !appConfig.corsOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check root alias
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'parkeazy-platform',
    });
  });

  // 6. Mount API v1 router
  app.use(appConfig.apiPrefix || '/api/v1', apiV1Router);

  // 7. Centralized API Error Handler for /api/v1
  app.use(appConfig.apiPrefix || '/api/v1', errorHandler);

  // 8. Guarantee any unmatched /api/* route returns structured JSON 404
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'API_NOT_FOUND',
        message: `API endpoint '${req.method} ${req.originalUrl}' does not exist on ParkEazy backend.`,
        correlationId: (req as any).correlationId || 'unknown',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // 9. Static assets serving directly for images
  const imagesDir = path.resolve(process.cwd(), 'src/assets/images');
  app.use('/src/assets/images', express.static(imagesDir));
  app.use('/assets/images', express.static(imagesDir));

  return app;
}

export const app = createApp();

export async function startServer() {
  const serverApp = createApp();
  const PORT = parseInt(process.env.PORT || String(appConfig.port || 3000), 10);
  const HOST = process.env.HOST || appConfig.host || '0.0.0.0';

  // Initialize DB pool if configured
  if (appConfig.database.isConfigured) {
    try {
      await dbManager.initialize();
    } catch (err: any) {
      console.warn('[ParkEazy] Non-blocking database initial connection notice:', err.message);
    }
  }

  // Initialize Redis client if configured
  if (appConfig.redis.isConfigured) {
    try {
      await redisManager.initialize();
    } catch (err: any) {
      console.warn('[ParkEazy] Non-blocking Redis initial connection notice:', err.message);
    }
  }

  const server = http.createServer(serverApp);

  // Serve Frontend
  if (appConfig.nodeEnv === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    serverApp.use(express.static(distPath));
    serverApp.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const isHttps = Boolean(process.env.APP_URL?.startsWith('https://'));
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true as const,
        cors: true,
        hmr: isHmrDisabled
          ? false
          : {
              server: server,
              ...(isHttps ? { clientPort: 443 } : {}),
            },
      },
      appType: 'spa',
    });

    serverApp.use(vite.middlewares);
  }

  server.listen(PORT, HOST, () => {
    console.log(`[ParkEazy] Dev server running at http://${HOST}:${PORT}`);
    console.log(`[ParkEazy] API endpoints active at ${appConfig.apiPrefix}`);
  });

  return { app: serverApp, server };
}

// Start server when run as primary entry point directly
const isDirectEntry =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js')) &&
  process.env.NODE_ENV !== 'test' &&
  !process.env.NODE_TEST_CONTEXT;

if (isDirectEntry) {
  startServer().catch((err) => {
    console.error('[ParkEazy] Failed to start server:', err);
    process.exit(1);
  });
}
