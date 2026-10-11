import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const apiTarget = `http://127.0.0.1:${Number(process.env.API_PORT || 4000)}`;
const websiteDir = path.resolve(rootDir, 'apps/website');

function unavailableResponse(proxy: any) {
  proxy.on('error', (error: Error, _request: unknown, response: any) => {
    if (!response || response.headersSent || response.writableEnded) return;
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({
      statusCode: 503,
      error: 'Service Unavailable',
      message: `Backend API service is not reachable at ${apiTarget}. Start it via: npm run dev:api`,
      details: error.message,
    }));
  });
}

export default defineConfig(() => ({
  // The same-origin development server must serve the real customer portal,
  // not the placeholder root src/App.tsx (which intentionally renders empty).
  root: websiteDir,
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': websiteDir,
      '@parkeazy/config': path.resolve(rootDir, 'packages/config/src/index.ts'),
      '@parkeazy/shared-types': path.resolve(rootDir, 'packages/shared-types/src/index.ts'),
      '@parkeazy/branding': path.resolve(rootDir, 'packages/branding/src/index.ts'),
      '@parkeazy/validation': path.resolve(rootDir, 'packages/validation/src/index.ts'),
      '@parkeazy/api-client': path.resolve(rootDir, 'packages/api-client/src/index.ts'),
      '@parkeazy/shared-ui': path.resolve(rootDir, 'packages/shared-ui/src/index.ts'),
    },
  },
  server: {
    // Keep same-origin API routes separate from frontend SPA fallback.
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
      // Keep the host and admin applications isolated, but reachable on the same origin.
      // scripts/dev-same-origin.mjs starts these dedicated Vite servers automatically.
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
    hmr: process.env.DISABLE_HMR !== 'true',
    // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
