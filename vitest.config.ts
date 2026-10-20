import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: process.cwd(),
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
  test: {
    include: ['tests/**/*.test.{ts,tsx,js,jsx}', 'tests/**/*.spec.{ts,tsx,js,jsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    env: {
      NODE_ENV: 'test',
      PARKEAZY_DEMO_MODE: 'true',
    },
  },
});
