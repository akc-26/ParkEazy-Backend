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
          correlationId: req.correlationId || 'unknown',
          timestamp: new Date().toISOString(),
        },
      });
    }
    next();
  });

  // 2. Body limit parsing
  app.use(express.json({ limit: appConfig.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: appConfig.bodyLimit }));

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
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id, X-Request-Id');
      if (origin && !appConfig.corsOrigins.includes('*')) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // 6. Mount API v1 router
  app.use(appConfig.apiPrefix, apiV1Router);

  // 7. Centralized API Error Handler for /api/v1
  app.use(appConfig.apiPrefix, errorHandler);

  // 8. Guarantee any unmatched /api/* route returns structured JSON 404
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'API_NOT_FOUND',
        message: `API endpoint '${req.method} ${req.originalUrl}' does not exist on ParkEazy backend.`,
        correlationId: req.correlationId || 'unknown',
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

export async function startServer() {
  const app = createApp();
  const PORT = appConfig.port;

  // Initialize DB pool (remote PostgreSQL or authoritative in-process PostgreSQL engine)
  try {
    await dbManager.initialize();
  } catch (err: any) {
    console.warn('[ParkEazy] Non-blocking database initial connection notice:', err.message);
  }

  // Initialize Redis client if configured
  if (appConfig.redis.isConfigured) {
    try {
      await redisManager.initialize();
    } catch (err: any) {
      console.warn('[ParkEazy] Non-blocking Redis initial connection notice:', err.message);
    }
  }

  // Create HTTP server early so Vite can bind WebSocket HMR in middleware mode
  const server = http.createServer(app);

  // Serve Frontend
  if (appConfig.nodeEnv === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback: any non-API route serves index.html
    app.get('*', (_req: Request, res: Response) => {
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

    server.on('upgrade', (req, _socket, _head) => {
      const protocol = req.headers['sec-websocket-protocol'];
      console.log(`[ParkEazy-WS] Upgrade handshake received: url=${req.url}, protocol=${protocol}, host=${req.headers.host}`);
    });

    app.use(vite.middlewares);
  }

  server.listen(PORT, appConfig.host, () => {
    console.log(`[ParkEazy] Full-Stack server running on http://${appConfig.host}:${PORT} (${appConfig.nodeEnv})`);
    console.log(`[ParkEazy] API endpoints active at ${appConfig.apiPrefix}`);
    console.log(`[ParkEazy] Database mode: ${appConfig.database.isConfigured ? 'PostgreSQL (' + appConfig.database.sanitizedUrl + ')' : 'In-Memory Baseline'}`);
    console.log(`[ParkEazy] Cache mode: ${appConfig.redis.isConfigured ? 'Redis (' + appConfig.redis.sanitizedUrl + ')' : 'In-Memory Baseline'}`);
    console.log(`[ParkEazy] Canonical URLs: / (User Website), /host/ (Host Portal), /admin/ (Admin Panel)`);
  });

  // Graceful shutdown handling
  const shutdown = (signal: string) => {
    if (isShuttingDown) {
      console.log(`[ParkEazy] Duplicate shutdown signal (${signal}) received. Already closing.`);
      return;
    }
    isShuttingDown = true;
    console.log(`[ParkEazy] Received ${signal}. Stopping server gracefully...`);

    const forceTimer = setTimeout(() => {
      console.error('[ParkEazy] Shutdown timed out. Forcing termination.');
      process.exit(1);
    }, appConfig.shutdown.timeoutMs);
    forceTimer.unref();

    server.close(async (err) => {
      if (err) {
        console.error('[ParkEazy] Error during HTTP server close:', err);
      } else {
        console.log('[ParkEazy] HTTP server closed to new connections.');
      }

      try {
        await dbManager.close();
      } catch (dbErr: any) {
        console.error('[ParkEazy] Error closing database pool:', dbErr.message);
      }

      try {
        await redisManager.close();
      } catch (redisErr: any) {
        console.error('[ParkEazy] Error closing Redis connection:', redisErr.message);
      }

      clearTimeout(forceTimer);
      console.log('[ParkEazy] Server closed successfully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return { app, server };
}

// Start server when run as primary entry point directly
const isDirectEntry = process.argv[1] && (
  process.argv[1].endsWith('server.ts') ||
  process.argv[1].endsWith('server.js')
) && process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT;

if (isDirectEntry) {
  startServer().catch((err) => {
    console.error('[ParkEazy] Fatal startup error:', err.message || err);
    process.exit(1);
  });
}
