import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3003,
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@parkeazy/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
      '@parkeazy/shared-types': path.resolve(__dirname, '../../packages/shared-types/src/index.ts'),
      '@parkeazy/branding': path.resolve(__dirname, '../../packages/branding/src/index.ts'),
      '@parkeazy/validation': path.resolve(__dirname, '../../packages/validation/src/index.ts'),
      '@parkeazy/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
      '@parkeazy/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src/index.ts'),
    },
  },
});
