import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3001,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@parkeazy/config': path.resolve(currentDir, '../../packages/config/src/index.ts'),
      '@parkeazy/shared-types': path.resolve(currentDir, '../../packages/shared-types/src/index.ts'),
      '@parkeazy/branding': path.resolve(currentDir, '../../packages/branding/src/index.ts'),
      '@parkeazy/validation': path.resolve(currentDir, '../../packages/validation/src/index.ts'),
      '@parkeazy/api-client': path.resolve(currentDir, '../../packages/api-client/src/index.ts'),
      '@parkeazy/shared-ui': path.resolve(currentDir, '../../packages/shared-ui/src/index.ts'),
    },
  },
});
