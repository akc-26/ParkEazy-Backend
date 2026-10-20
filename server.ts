import express, { Express } from 'express';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { apiRouter } from './server/routes';
import { apiV1Router } from './apps/api/router';
import { loadAndValidateConfig, sanitizeDatabaseUrl, appConfig } from './apps/api/config/env';
import { correlationMiddleware, requestLogger } from './apps/api/middleware/correlation';
import { errorHandler } from './apps/api/middleware/error-handler';
import { dbManager } from './apps/api/database/connection';
import { redisManager } from './apps/api/cache/redis';
import { migrationManager } from './apps/api/database/migrator';
import { db } from './server/db';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Validate configuration (fail-fast in production if invariants not met)
  try {
    loadAndValidateConfig(process.env);
  } catch (err: any) {
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_REQUIRED === 'true') {
      console.error('[ParkEazy] Configuration error:', err.message);
      throw err;
    }
  }

  // Request limits
  const bodyLimit = process.env.BODY_LIMIT || '1mb';
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

  // Correlation tracking & safe request logging
  app.use(correlationMiddleware);
  app.use(requestLogger);

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // CORS configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const isProd = process.env.NODE_ENV === 'production';
    const allowed = appConfig.corsOrigins;

    if (origin) {
      if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      } else if (!isProd && (allowed.includes('*') || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    } else if (!isProd && allowed.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-User-Id, X-Correlation-Id, X-Request-Id, X-Idempotency-Key'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check endpoints
  app.get('/api/health', (req, res) => {
    const isPostgresConnected = dbManager.isPostgresConnected();
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !isPostgresConnected) {
      return res.status(503).json({
        status: 'down',
        message: 'PostgreSQL database unavailable in production',
        timestamp: new Date().toISOString()
      });
    }
    res.json({
      status: 'ok',
      database: isPostgresConnected ? 'connected' : 'in-memory',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API routers
  app.use('/api/v1', apiV1Router);
  app.use('/api', apiRouter);

  // Unmatched /api/* route returns 404 JSON with API_NOT_FOUND
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'API_NOT_FOUND',
        message: `API endpoint '${req.method} ${req.originalUrl || req.url}' does not exist on ParkEazy backend.`
      },
      correlationId: (req as any).correlationId,
      timestamp: new Date().toISOString()
    });
  });

  // Global structured error handling
  app.use(errorHandler);

  return app;
}

async function startServer() {
  const config = loadAndValidateConfig(process.env);
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Establish database connection before serving database-dependent requests
  console.log('[ParkEazy] Establishing authoritative database connection...');
  await dbManager.initialize();

  // 2. Apply required migrations through existing migration process
  console.log('[ParkEazy] Applying database migrations...');
  await migrationManager.runMigrations();

  // 3. Initialize active database persistence store
  console.log('[ParkEazy] Initializing active application data layer...');
  await db.initialize();

  const app = createApp();
  const PORT = Number(process.env.PORT) || config.port || 3000;

  if (!isProduction) {
    // Vite middleware for development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ParkEazy] Server running on http://0.0.0.0:${PORT} [${config.nodeEnv}]`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`[ParkEazy] Received ${signal}. Initiating graceful shutdown...`);
    const timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 10000;
    const forceTimer = setTimeout(() => {
      console.error('[ParkEazy] Shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, timeoutMs);
    forceTimer.unref();

    server.close(async () => {
      try {
        db.shutdown();
        await dbManager.close();
        await redisManager.close();
        console.log('[ParkEazy] Graceful shutdown completed cleanly.');
        process.exit(0);
      } catch (err) {
        console.error('[ParkEazy] Error during shutdown cleanup:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  startServer().catch((err) => {
    console.error('[ParkEazy] Fatal server startup error:', err);
    process.exit(1);
  });
}
