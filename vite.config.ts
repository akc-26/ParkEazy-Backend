import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        '@': path.resolve(__dirname, '.'),
        '@parkeazy/config': path.resolve(__dirname, './packages/config/src/index.ts'),
        '@parkeazy/shared-types': path.resolve(__dirname, './packages/shared-types/src/index.ts'),
        '@parkeazy/branding': path.resolve(__dirname, './packages/branding/src/index.ts'),
        '@parkeazy/validation': path.resolve(__dirname, './packages/validation/src/index.ts'),
        '@parkeazy/api-client': path.resolve(__dirname, './packages/api-client/src/index.ts'),
        '@parkeazy/shared-ui': path.resolve(__dirname, './packages/shared-ui/src/index.ts'),
        '@parkeazy/contracts': path.resolve(__dirname, './packages/contracts/index.ts'),
      },
    },
    build: {
      chunkSizeWarningLimit: 2500,
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
