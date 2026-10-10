import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(currentDir, '.'),
        '@parkeazy/config': path.resolve(currentDir, 'packages/config/src/index.ts'),
        '@parkeazy/shared-types': path.resolve(currentDir, 'packages/shared-types/src/index.ts'),
        '@parkeazy/branding': path.resolve(currentDir, 'packages/branding/src/index.ts'),
        '@parkeazy/validation': path.resolve(currentDir, 'packages/validation/src/index.ts'),
        '@parkeazy/api-client': path.resolve(currentDir, 'packages/api-client/src/index.ts'),
        '@parkeazy/shared-ui': path.resolve(currentDir, 'packages/shared-ui/src/index.ts'),
      },
    },
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/v1': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if ('headersSent' in res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    statusCode: 503,
                    error: 'Service Unavailable',
                    message:
                      'NestJS backend API on port 4000 is not running. Launch it with: npm run dev:api',
                    timestamp: new Date().toISOString(),
                    path: '/api/v1',
                  })
                );
              }
            });
          },
        },
        '/health': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if ('headersSent' in res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    statusCode: 503,
                    status: 'unavailable',
                    service: 'parkeazy-backend-api',
                    message:
                      'NestJS backend API on port 4000 is not running. Launch it with: npm run dev:api',
                    timestamp: new Date().toISOString(),
                  })
                );
              }
            });
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
