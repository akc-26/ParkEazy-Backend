import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
