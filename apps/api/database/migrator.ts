import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PoolClient } from 'pg';
import { dbManager } from './connection';
import { appConfig } from '../config/env';

export interface MigrationRecord {
  version: string;
  name: string;
  appliedAt: string;
  checksum?: string;
}

export interface MigrationStatus {
  isConfigured: boolean;
  applied: string[];
  pending: string[];
  error?: string;
}

export class MigrationManager {
  private migrationsDir: string;

  constructor(migrationsDir?: string) {
    this.migrationsDir =
      migrationsDir ||
      path.resolve(process.cwd(), 'apps/api/database/migrations');
  }

  /**
   * Discovers all SQL migration files sorted deterministically by filename.
   */
  public getAvailableMigrationFiles(): { name: string; version: string; fullPath: string }[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    return files.map((name) => {
      // Version extracted from prefix e.g. 001_initial_schema.sql -> 001
      const versionMatch = name.match(/^(\d+)/);
      const version = versionMatch ? versionMatch[1] : name;
      return {
        name,
        version,
        fullPath: path.join(this.migrationsDir, name),
      };
    });
  }

  /**
   * Calculates a SHA-256 checksum of the migration file content
   * to guard against unintentional mutation of applied migrations.
   */
  public calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Retrieves current applied and pending migration status.
   * When PostgreSQL is configured, always verifies against the live database.
   */
  public async getMigrationStatus(): Promise<MigrationStatus> {
    const available = this.getAvailableMigrationFiles();

    if (!appConfig.database.isConfigured) {
      return {
        isConfigured: false,
        applied: ['001_initial_schema.sql (in-memory baseline)'],
        pending: [],
      };
    }

    try {
      await this.ensureMigrationTable();
      const res = await dbManager.query<{ name: string; version: string }>(
        'SELECT version, name FROM schema_migrations ORDER BY version ASC'
      );
      const appliedNames = new Set(res.rows.map((r) => r.name));

      const applied = available.filter((f) => appliedNames.has(f.name)).map((f) => f.name);
      const pending = available.filter((f) => !appliedNames.has(f.name)).map((f) => f.name);

      return {
        isConfigured: true,
        applied,
        pending,
      };
    } catch (err: any) {
      const safeMessage = err.message || 'Database connection error';
      console.warn('[ParkEazy-Migrator] Could not read migration status from PostgreSQL DB:', safeMessage);
      return {
        isConfigured: true,
        applied: [],
        pending: available.map((f) => f.name),
        error: `Database unreachable or migration table inaccessible: ${safeMessage}`,
      };
    }
  }

  /**
   * Ensures the schema_migrations tracking table exists.
   */
  private async ensureMigrationTable(client?: PoolClient): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        checksum VARCHAR(64)
      );
    `;
    if (client) {
      await client.query(ddl);
    } else {
      await dbManager.query(ddl);
    }
  }

  /**
   * Executes pending migrations in deterministic order wrapped in database transactions.
   * Rollback strategy: PostgreSQL DDL is transactional. If any migration fails,
   * the transaction rolls back cleanly, preventing partial schema corruption.
   */
  public async runMigrations(): Promise<{ applied: string[]; errors?: string[] }> {
    if (!appConfig.database.isConfigured) {
      console.log('[ParkEazy-Migrator] Database unconfigured; skipping SQL migrations.');
      return { applied: [] };
    }

    const available = this.getAvailableMigrationFiles();
    if (available.length === 0) {
      return { applied: [] };
    }

    const client = await dbManager.getClient();
    const appliedList: string[] = [];

    try {
      await client.query('BEGIN');
      await this.ensureMigrationTable(client);

      const existingRes = await client.query<{ name: string; version: string }>(
        'SELECT version, name FROM schema_migrations'
      );
      const appliedNames = new Set(existingRes.rows.map((r) => r.name));

      const pending = available.filter((m) => !appliedNames.has(m.name));

      for (const migration of pending) {
        console.log(`[ParkEazy-Migrator] Applying migration: ${migration.name}`);
        const sql = fs.readFileSync(migration.fullPath, 'utf-8');
        const checksum = this.calculateChecksum(sql);

        // Execute migration SQL inside transaction
        await client.query(sql);

        // Record successful execution
        await client.query(
          'INSERT INTO schema_migrations (version, name, applied_at, checksum) VALUES ($1, $2, NOW(), $3)',
          [migration.version, migration.name, checksum]
        );

        appliedList.push(migration.name);
      }

      await client.query('COMMIT');
      console.log(`[ParkEazy-Migrator] Successfully applied ${appliedList.length} migration(s).`);
      return { applied: appliedList };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`[ParkEazy-Migrator] Migration failed. Transaction rolled back cleanly: ${err.message}`);
      throw new Error(`Database migration failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
}

export const migrationManager = new MigrationManager();
