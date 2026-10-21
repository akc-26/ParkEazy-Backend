import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { dbManager } from './connection';

export interface MigrationFile {
  name: string;
  version: string;
  path: string;
  checksum?: string;
}

export interface MigrationStatus {
  isConfigured: boolean;
  applied: string[];
  pending: string[];
}

export class MigrationManager {
  private static instance: MigrationManager;
  private migrationsDir: string;

  private constructor() {
    this.migrationsDir = path.resolve(process.cwd(), 'apps/api/database/migrations');
    if (!fs.existsSync(this.migrationsDir)) {
      this.migrationsDir = path.resolve(process.cwd(), 'services/api/src/database/migrations');
    }
  }

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  public getAvailableMigrationFiles(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const fileNames = fs.readdirSync(this.migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    return fileNames.map((name) => {
      const match = name.match(/^(\d+)/);
      const version = match ? match[1] : name.split('_')[0];
      return {
        name,
        version,
        path: path.join(this.migrationsDir, name),
      };
    });
  }

  public calculateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  public async getMigrationStatus(): Promise<MigrationStatus> {
    const isConfigured = dbManager.isPostgresConnected();
    const available = this.getAvailableMigrationFiles();

    if (!isConfigured) {
      return {
        isConfigured: false,
        applied: ['000_in_memory_baseline.sql (in-memory baseline schema active)'],
        pending: available.map((f) => f.name),
      };
    }

    try {
      const res = await dbManager.query(
        'SELECT migration_name FROM schema_migrations ORDER BY migration_name ASC'
      );
      const applied = res.rows.map((r: any) => r.migration_name);
      const appliedSet = new Set(applied);
      const pending = available
        .filter((f) => !appliedSet.has(f.name))
        .map((f) => f.name);

      return {
        isConfigured: true,
        applied,
        pending,
      };
    } catch {
      return {
        isConfigured: true,
        applied: [],
        pending: available.map((f) => f.name),
      };
    }
  }

  public async runMigrations(): Promise<{ applied: string[]; errors: string[] }> {
    const status = await this.getMigrationStatus();
    if (!status.isConfigured) {
      return { applied: [], errors: [] };
    }

    const available = this.getAvailableMigrationFiles();
    const applied: string[] = [];
    const errors: string[] = [];

    const client = await dbManager.getClient();
    if (!client) return { applied: [], errors: ['No database client available'] };

    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      for (const file of available) {
        if (status.applied.includes(file.name)) continue;

        const content = fs.readFileSync(file.path, 'utf8');
        const checksum = this.calculateChecksum(content);

        try {
          await client.query('BEGIN');
          await client.query(content);
          await client.query(
            'INSERT INTO schema_migrations (migration_name, checksum) VALUES ($1, $2)',
            [file.name, checksum]
          );
          await client.query('COMMIT');
          applied.push(file.name);
        } catch (err: any) {
          await client.query('ROLLBACK');
          errors.push(`Failed to apply ${file.name}: ${err.message}`);
          break;
        }
      }
    } finally {
      if (typeof client.release === 'function') {
        client.release();
      }
    }

    return { applied, errors };
  }
}

export const migrationManager = MigrationManager.getInstance();
