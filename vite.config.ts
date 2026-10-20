import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

function unavailableResponse(proxy: any) {
  proxy.on('error', (error: Error, _request: unknown, response: any) => {
    if (!response || response.headersSent || response.writableEnded) return;
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(
      JSON.stringify({
        statusCode: 503,
        error: 'Service Unavailable',
        message: `Backend API service is not reachable. Start it via: npm run dev:api`,
        details: error.message,
      })
    );
  });
}

export default defineConfig(() => {
  const apiTarget = `http://127.0.0.1:${Number(process.env.API_PORT || 4000)}`;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
        '@parkeazy/config': path.resolve('./packages/config/src/index.ts'),
        '@parkeazy/shared-types': path.resolve('./packages/shared-types/src/index.ts'),
        '@parkeazy/branding': path.resolve('./packages/branding/src/index.tsx'),
        '@parkeazy/validation': path.resolve('./packages/validation/src/index.ts'),
        '@parkeazy/api-client': path.resolve('./packages/api-client/src/index.ts'),
        '@parkeazy/shared-ui': path.resolve('./packages/shared-ui/src/index.tsx'),
        '@parkeazy/contracts': path.resolve('./packages/contracts/index.ts'),
      },
    },
    server: {
      proxy: {
        '/api/v1': {
          target: apiTarget,
          changeOrigin: true,
          configure: unavailableResponse,
        },
        '/health': {
          target: apiTarget,
          changeOrigin: true,
          configure: unavailableResponse,
        },
        '/host': {
          target: `http://127.0.0.1:${Number(process.env.HOST_PORT || 3002)}`,
          changeOrigin: true,
          ws: true,
        },
        '/admin': {
          target: `http://127.0.0.1:${Number(process.env.ADMIN_PORT || 3003)}`,
          changeOrigin: true,
          ws: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
