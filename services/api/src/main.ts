import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_CONFIG } from '@parkeazy/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for all monorepo portals
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      /^http:\/\/localhost:\d+$/,
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global versioned prefix for future business endpoints
  // e.g. /api/v1/spaces, /api/v1/bookings
  // Note: /health is also available at root level via custom controller routing
  app.setGlobalPrefix(API_CONFIG.prefix.replace(/^\//, ''), {
    exclude: ['health', 'api/v1/health'],
  });

  // The NestJS backend API listens on port 4000 (API_CONFIG.defaultPort)
  // Vite same-origin proxy on port 3000/3001 forwards /api/v1 and /health to port 4000
  const port = process.env.API_LISTEN_PORT
    ? parseInt(process.env.API_LISTEN_PORT, 10)
    : API_CONFIG.defaultPort;
  await app.listen(port);
  console.log(`[ParkEazy API] Server is listening at http://localhost:${port}`);
  console.log(`[ParkEazy API] Health check available at: http://localhost:${port}/health`);
  console.log(`[ParkEazy API] API prefix active: http://localhost:${port}${API_CONFIG.prefix}`);
}

bootstrap().catch((err) => {
  console.error('[ParkEazy API] Failed to start server:', err);
  process.exit(1);
});
