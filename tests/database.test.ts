import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { DatabaseConfigService } from '../services/api/src/database/database.config';
import { DatabaseService } from '../services/api/src/database/database.service';
import { MigrationRunner } from '../services/api/src/database/migration.runner';
import { SEED_TENANT, SEED_USERS, SEED_FACILITIES } from '../services/api/src/database/seed.data';

describe('Part 03: Database Foundations & Migration Suite', () => {
  describe('Database Configuration Service', () => {
    let configService: DatabaseConfigService;
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.DATABASE_URL;
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
      delete process.env.DB_NAME;
      delete process.env.DB_SSL;
      delete process.env.DB_POOL_MAX;
      configService = new DatabaseConfigService();
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should load default PostgreSQL settings safely', () => {
      const config = configService.getConfig();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('parkeazy_db');
      expect(config.user).toBe('parkeazy_user');
      expect(config.ssl).toBe(false);
      expect(config.maxConnections).toBe(10);
    });

    it('should never expose plain-text passwords in sanitized summary logs', () => {
      const summary = configService.getSanitizedSummary();
      expect(summary.engine).toBe('PostgreSQL');
      expect(summary.database).toBe('parkeazy_db');
      expect(summary.user).toBe('parkeazy_user');
      expect((summary as any).password).toBeUndefined();
    });

    it('should validate port numbers and database name bounds', () => {
      const valid = configService.validate();
      expect(valid.valid).toBe(true);
      expect(valid.errors).toHaveLength(0);
    });

    it('should produce valid pg PoolConfig', () => {
      const poolConfig = configService.getPoolConfig();
      expect(poolConfig.host).toBe('localhost');
      expect(poolConfig.port).toBe(5432);
      expect(poolConfig.max).toBe(10);
    });
  });

  describe('Database Service Offline Resilience', () => {
    it('should report offline status safely when pool is not initialized', async () => {
      const configService = new DatabaseConfigService();
      const dbService = new DatabaseService(configService);

      const health = dbService.getHealthStatus();
      expect(health.engine).toBe('PostgreSQL');
      expect(health.connected).toBe(false);

      const ping = await dbService.ping();
      expect(ping.connected).toBe(false);
      expect(ping.error).toBe('Database pool not initialized');
    });

    it('should clean up gracefully on module destroy', async () => {
      const configService = new DatabaseConfigService();
      const dbService = new DatabaseService(configService);
      await expect(dbService.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Migration File Integrity & Schema Discovery', () => {
    it('should locate and compute valid checksums for 001_initial_schema.sql', () => {
      const migrationsDir = path.resolve(__dirname, '../services/api/src/database/migrations');
      const runner = new MigrationRunner(null as any, migrationsDir);

      const files = runner.getMigrationFiles();
      expect(files.length).toBeGreaterThanOrEqual(1);

      const initialMigration = files.find(f => f.name === '001_initial_schema.sql');
      expect(initialMigration).toBeDefined();
      expect(initialMigration?.checksum).toHaveLength(64);
    });

    it('should confirm schema migration contains all mandated domain entities', () => {
      const sqlPath = path.resolve(__dirname, '../services/api/src/database/migrations/001_initial_schema.sql');
      expect(fs.existsSync(sqlPath)).toBe(true);

      const sql = fs.readFileSync(sqlPath, 'utf8');

      // Core entities
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS schema_migrations');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS tenants');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS users');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS role_assignments');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS parking_facilities');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS parking_spaces');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS operating_schedules');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS reservation_holds');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS bookings');

      // Index and constraints
      expect(sql).toContain('idx_facility_city');
      expect(sql).toContain('idx_space_facility');
      expect(sql).toContain('idx_active_holds');
      expect(sql).toContain('idx_space_booking_times');
      expect(sql).toContain('uq_tenant_user_email');
      expect(sql).toContain('uq_facility_bay');
    });
  });

  describe('Chennai Facility Seed Data Verification', () => {
    it('should verify default white-label tenant matches authoritative design tokens', () => {
      expect(SEED_TENANT.id).toBe('default');
      expect(SEED_TENANT.displayName).toBe('ParkEazy');
      expect(SEED_TENANT.theme_tokens.colors.primary).toBe('#0F766E');
      expect(SEED_TENANT.theme_tokens.colors.accent).toBe('#D6A84F');
    });

    it('should verify test user accounts for Admin, Host, and Customer', () => {
      expect(SEED_USERS).toHaveLength(3);
      expect(SEED_USERS.map(u => u.role)).toEqual(['superadmin', 'host', 'customer']);
    });

    it('should verify 3 Chennai parking facilities with accurate bay allocations', () => {
      expect(SEED_FACILITIES).toHaveLength(3);

      const facilityCodes = SEED_FACILITIES.map(f => f.facilityCode);
      expect(facilityCodes).toContain('#FAC-0104');
      expect(facilityCodes).toContain('#FAC-0208');
      expect(facilityCodes).toContain('#FAC-0315');

      // Total bays across 3 facilities: 24 + 36 + 48 = 108 bays
      const totalBays = SEED_FACILITIES.reduce((acc, f) => acc + f.spaces.length, 0);
      expect(totalBays).toBe(108);

      // Verify all facilities are located in Chennai
      for (const f of SEED_FACILITIES) {
        expect(f.city).toBe('Chennai');
        expect(f.latitude).toBeGreaterThan(12.0);
        expect(f.latitude).toBeLessThan(14.0);
        expect(f.longitude).toBeGreaterThan(80.0);
        expect(f.longitude).toBeLessThan(81.0);
      }
    });
  });
});
