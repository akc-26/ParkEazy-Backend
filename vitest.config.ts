import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: process.cwd(),
  test: {
    include: ['tests/**/*.test.{ts,tsx,js,jsx}', 'tests/**/*.spec.{ts,tsx,js,jsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    env: {
      NODE_ENV: 'test',
      PARKEAZY_DEMO_MODE: 'true',
    },
  },
});
