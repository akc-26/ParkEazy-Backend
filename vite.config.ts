import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
        '@parkeazy/config': path.resolve(import.meta.dirname, 'packages/config/src/index.ts'),
        '@parkeazy/shared-types': path.resolve(import.meta.dirname, 'packages/shared-types/src/index.ts'),
        '@parkeazy/branding': path.resolve(import.meta.dirname, 'packages/branding/src/index.ts'),
        '@parkeazy/validation': path.resolve(import.meta.dirname, 'packages/validation/src/index.ts'),
        '@parkeazy/api-client': path.resolve(import.meta.dirname, 'packages/api-client/src/index.ts'),
        '@parkeazy/shared-ui': path.resolve(import.meta.dirname, 'packages/shared-ui/src/index.ts'),
        '@parkeazy/contracts': path.resolve(import.meta.dirname, 'packages/contracts/index.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/v1': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/health': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/host': {
          target: `http://localhost:${process.env.HOST_PORT || 3002}`,
          changeOrigin: true,
          bypass: (req) => {
            if (!process.env.HOST_PORT) return req.url;
          },
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if ('writeHead' in res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
                res.end('Service Unavailable');
              }
            });
          },
        },
        '/admin': {
          target: `http://localhost:${process.env.ADMIN_PORT || 3003}`,
          changeOrigin: true,
          bypass: (req) => {
            if (!process.env.ADMIN_PORT) return req.url;
          },
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if ('writeHead' in res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
                res.end('Service Unavailable');
              }
            });
          },
        },
      },
    },
  };
});
