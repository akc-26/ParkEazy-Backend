import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolveApplicationFromPath, SAME_ORIGIN_ROUTES } from '../packages/config/src';

describe('ParkEazy Same-Origin Routing & Path Resolution (Part 02)', () => {
  describe('Configuration-Level Path Resolution', () => {
    it('should map the root path to customer website', () => {
      expect(resolveApplicationFromPath('/')).toBe('website');
      expect(resolveApplicationFromPath('')).toBe('website');
      expect(resolveApplicationFromPath('/find-parking')).toBe('website');
      expect(resolveApplicationFromPath('/how-it-works')).toBe('website');
    });

    it('should correctly map host portal paths with and without trailing slashes', () => {
      expect(resolveApplicationFromPath('/host')).toBe('host');
      expect(resolveApplicationFromPath('/host/')).toBe('host');
      expect(resolveApplicationFromPath('/host/spaces')).toBe('host');
      expect(resolveApplicationFromPath('/host/bookings')).toBe('host');
      expect(resolveApplicationFromPath('/host/settings/profile')).toBe('host');
    });

    it('should correctly map admin panel paths with and without trailing slashes', () => {
      expect(resolveApplicationFromPath('/admin')).toBe('admin');
      expect(resolveApplicationFromPath('/admin/')).toBe('admin');
      expect(resolveApplicationFromPath('/admin/audit-logs')).toBe('admin');
      expect(resolveApplicationFromPath('/admin/tenants')).toBe('admin');
    });

    it('should correctly map overview and diagnostics paths', () => {
      expect(resolveApplicationFromPath('/overview')).toBe('overview');
      expect(resolveApplicationFromPath('/overview/')).toBe('overview');
      expect(resolveApplicationFromPath('/overview?tab=diagnostics')).toBe('overview');
    });

    it('should isolate API and health routes from frontend SPA paths', () => {
      expect(resolveApplicationFromPath('/api/v1')).toBe('api');
      expect(resolveApplicationFromPath('/api/v1/')).toBe('api');
      expect(resolveApplicationFromPath('/api/v1/health')).toBe('api');
      expect(resolveApplicationFromPath('/api/v1/spaces')).toBe('api');
      expect(resolveApplicationFromPath('/health')).toBe('health');
      expect(resolveApplicationFromPath('/health/')).toBe('health');
    });

    it('should verify SAME_ORIGIN_ROUTES constants match the architecture specification', () => {
      expect(SAME_ORIGIN_ROUTES.website).toBe('/');
      expect(SAME_ORIGIN_ROUTES.host).toBe('/host/');
      expect(SAME_ORIGIN_ROUTES.admin).toBe('/admin/');
      expect(SAME_ORIGIN_ROUTES.api).toBe('/api/v1');
      expect(SAME_ORIGIN_ROUTES.health).toBe('/health');
      expect(SAME_ORIGIN_ROUTES.overview).toBe('/overview');
    });
  });

  describe('Frontend Base Path & Asset Configuration', () => {
    it('should confirm Vite base path configurations across all portals', () => {
      const websiteConfig = fs.readFileSync(path.resolve(__dirname, '../apps/website/vite.config.ts'), 'utf8');
      const hostConfig = fs.readFileSync(path.resolve(__dirname, '../apps/host/vite.config.ts'), 'utf8');
      const adminConfig = fs.readFileSync(path.resolve(__dirname, '../apps/admin/vite.config.ts'), 'utf8');

      expect(websiteConfig).toContain("base: '/'");
      expect(hostConfig).toContain("base: '/host/'");
      expect(adminConfig).toContain("base: '/admin/'");
    });

    it('should confirm root vite proxy configuration strictly separates API routes', () => {
      const rootVite = fs.readFileSync(path.resolve(__dirname, '../vite.config.ts'), 'utf8');
      expect(rootVite).toContain("'/api/v1'");
      expect(rootVite).toContain("'/health'");
      expect(rootVite).toContain("'/host'");
      expect(rootVite).toContain("'/admin'");
      expect(rootVite).toContain('HOST_PORT || 3002');
      expect(rootVite).toContain('ADMIN_PORT || 3003');
      expect(rootVite).toContain('503');
      expect(rootVite).toContain('Service Unavailable');
    });
  });

  describe('Production Routing Architecture Validation', () => {
    it('should verify Nginx configuration provides complete 5-route coverage', () => {
      const nginxPath = path.resolve(__dirname, '../infrastructure/nginx/nginx.conf');
      expect(fs.existsSync(nginxPath)).toBe(true);

      const nginx = fs.readFileSync(nginxPath, 'utf8');
      expect(nginx).toContain('location / {');
      expect(nginx).toContain('location /host/ {');
      expect(nginx).toContain('location /admin/ {');
      expect(nginx).toContain('location /api/v1/ {');
      expect(nginx).toContain('location = /health {');

      // Verify trailing slash 301 normalization
      expect(nginx).toContain('location = /host {\n            return 301 /host/;\n        }');
      expect(nginx).toContain('location = /admin {\n            return 301 /admin/;\n        }');

      // Verify SPA fallback targets
      expect(nginx).toContain('try_files $uri $uri/ /index.html;');
      expect(nginx).toContain('try_files $uri $uri/ /host/index.html;');
      expect(nginx).toContain('try_files $uri $uri/ /admin/index.html;');
    });

    it('should start all three isolated frontends for same-origin development', () => {
      const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
      expect(packageJson.scripts['dev:same-origin']).toBe('node scripts/dev-same-origin.mjs');
      const launcherPath = path.resolve(__dirname, '../scripts/dev-same-origin.mjs');
      expect(fs.existsSync(launcherPath)).toBe(true);
      const launcher = fs.readFileSync(launcherPath, 'utf8');
      expect(launcher).toContain("'run', 'dev:root'");
      expect(launcher).toContain("'run', 'dev:host'");
      expect(launcher).toContain("'run', 'dev:admin'");
    });

    it('should verify production gateway script exists and is executable', () => {
      const gatewayPath = path.resolve(__dirname, '../scripts/production-gateway.mjs');
      expect(fs.existsSync(gatewayPath)).toBe(true);
      const gatewayContent = fs.readFileSync(gatewayPath, 'utf8');
      expect(gatewayContent).toContain('distDirs.website');
      expect(gatewayContent).toContain('distDirs.host');
      expect(gatewayContent).toContain('distDirs.admin');
    });
  });
});
