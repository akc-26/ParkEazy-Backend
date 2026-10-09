import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@parkeazy/config': path.resolve(__dirname, 'packages/config/src/index.ts'),
        '@parkeazy/shared-types': path.resolve(__dirname, 'packages/shared-types/src/index.ts'),
        '@parkeazy/branding': path.resolve(__dirname, 'packages/branding/src/index.ts'),
        '@parkeazy/validation': path.resolve(__dirname, 'packages/validation/src/index.ts'),
        '@parkeazy/api-client': path.resolve(__dirname, 'packages/api-client/src/index.ts'),
        '@parkeazy/shared-ui': path.resolve(__dirname, 'packages/shared-ui/src/index.ts'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
