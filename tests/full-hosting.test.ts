import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8');

describe('VoiceCloud-style single-process full application hosting', () => {
  it('builds all three portals into one shared dist root with correct public bases', () => {
    expect(read('apps/website/vite.config.ts')).toContain("base: '/'");
    expect(read('apps/website/vite.config.ts')).toContain("'../../dist/website'");
    expect(read('apps/host/vite.config.ts')).toContain("base: '/host/'");
    expect(read('apps/host/vite.config.ts')).toContain("'../../dist/host'");
    expect(read('apps/admin/vite.config.ts')).toContain("base: '/admin/'");
    expect(read('apps/admin/vite.config.ts')).toContain("'../../dist/admin'");
  });

  it('mounts frontends in the NestJS application while excluding backend-owned routes', () => {
    const main = read('services/api/src/main.ts');
    const hosting = read('services/api/src/hosting/frontend-hosting.ts');
    expect(main).toContain('registerFrontendHosting');
    expect(hosting).toContain("app.use('/host'");
    expect(hosting).toContain("app.use('/admin'");
    expect(hosting).toContain("app.use('/', guardedStatic(paths.websiteDist))");
    expect(hosting).toContain("'/api'");
    expect(hosting).toContain("'/health'");
    expect(hosting).toContain('if (backendOwned(pathname)) return next()');
  });

  it('exposes a single-process same-origin command and preserves a separate HMR workflow', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    // The default same-origin command must run the full app in one process;
    // the multi-Vite HMR workflow is opt-in and kept under a separate command.
    expect(pkg.scripts['dev:same-origin']).toContain('build:all');
    expect(pkg.scripts['dev:same-origin']).toContain('start-local-full.mjs');
    expect(pkg.scripts['start:full']).toContain('start-local-full.mjs');
    expect(pkg.scripts['dev:same-origin:hmr']).toBe('node scripts/dev-same-origin.mjs');
  });


  it('uses same-origin API URLs in browser portals and exposes an API index route', () => {
    const client = read('packages/api-client/src/client.ts');
    const moduleSource = read('services/api/src/app.module.ts');
    expect(client).toContain("window.location.origin}${API_CONFIG.prefix}");
    expect(moduleSource).toContain('class ApiRootController');
    expect(moduleSource).toContain('@Get()');
    expect(moduleSource).toContain("basePath: '/api/v1'");
  });

  it('uses the same built artifact layout in the optional gateway and verification script', () => {
    expect(read('scripts/production-gateway.mjs')).toContain("'dist/website'");
    expect(read('scripts/production-gateway.mjs')).toContain("'dist/host'");
    expect(read('scripts/production-gateway.mjs')).toContain("'dist/admin'");
    expect(read('scripts/verify-local.mjs')).toContain("'dist/website/index.html'");
    expect(read('scripts/verify-local.mjs')).toContain("'dist/host/index.html'");
    expect(read('scripts/verify-local.mjs')).toContain("'dist/admin/index.html'");
  });
});
