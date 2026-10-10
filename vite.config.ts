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
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
