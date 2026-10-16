import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import { apiV1Router } from './apps/api/router';
import { correlationMiddleware, requestLogger } from './apps/api/middleware/correlation';
import { errorHandler } from './apps/api/middleware/error-handler';
import { appConfig } from './apps/api/config/env';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = appConfig.port;

  // Basic security and parsing middlewares
  app.use(express.json());
  app.use(correlationMiddleware);
  app.use(requestLogger);

  // Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Mount API v1 router before any frontend routing
  app.use(appConfig.apiPrefix, apiV1Router);

  // Centralized API Error Handler for /api/v1
  app.use(appConfig.apiPrefix, errorHandler);

  // Create HTTP server early so Vite can bind WebSocket HMR in middleware mode
  const server = http.createServer(app);

  // Serve Frontend
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback: any non-API route serves index.html
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const isHttps = Boolean(process.env.APP_URL?.startsWith('https://'));
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: server, // Binds Vite WebSocket server to Node's HTTP upgrade listener
          ...(isHttps ? { clientPort: 443 } : {}),
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ParkEazy] Full-Stack server running on http://0.0.0.0:${PORT}`);
    console.log(`[ParkEazy] API endpoints active at ${appConfig.apiPrefix}`);
    console.log(`[ParkEazy] Canonical URLs: / (User Website), /host/ (Host Portal), /admin/ (Admin Panel)`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('[ParkEazy] Gracefully stopping server...');
    server.close(() => {
      console.log('[ParkEazy] Server closed successfully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[ParkEazy] Fatal startup error:', err);
  process.exit(1);
});
