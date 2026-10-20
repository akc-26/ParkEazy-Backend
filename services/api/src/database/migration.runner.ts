import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Pool, PoolClient } from 'pg';

export interface MigrationFile {
  name: string;
  filePath: string;
  sql: string;
  checksum: string;
}

export interface MigrationRecord {
  id: number;
  name: string;
  checksum: string;
  executed_at: Date;
  execution_time_ms: number;
}

export interface MigrationStatus {
  appliedCount: number;
  pendingCount: number;
  applied: Array<{ name: string; executedAt: string; checksum: string }>;
  pending: Array<{ name: string; checksum: string }>;
}

export class MigrationRunner {
  private migrationsDir: string;

  constructor(private readonly pool: Pool, migrationsDir?: string) {
    this.migrationsDir =
      migrationsDir || path.resolve(__dirname, 'migrations');
  }

  public getMigrationFiles(): MigrationFile[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    return files.map((fileName) => {
      const filePath = path.join(this.migrationsDir, fileName);
      const sql = fs.readFileSync(filePath, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      return {
        name: fileName,
        filePath,
        sql,
        checksum,
      };
    });
  }

  public async ensureMigrationsTable(client: PoolClient): Promise<void> {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        execution_time_ms INTEGER NOT NULL
      );
    `);
  }

  public async getAppliedMigrations(client: PoolClient): Promise<MigrationRecord[]> {
    await this.ensureMigrationsTable(client);
    const res = await client.query<MigrationRecord>(
      'SELECT id, name, checksum, executed_at, execution_time_ms FROM schema_migrations ORDER BY id ASC;'
    );
    return res.rows;
  }

  public async getStatus(): Promise<MigrationStatus> {
    const client = await this.pool.connect();
    try {
      const applied = await this.getAppliedMigrations(client);
      const allFiles = this.getMigrationFiles();
      const appliedNames = new Set(applied.map((a) => a.name));

      const pending = allFiles
        .filter((f) => !appliedNames.has(f.name))
        .map((f) => ({ name: f.name, checksum: f.checksum }));

      return {
        appliedCount: applied.length,
        pendingCount: pending.length,
        applied: applied.map((a) => ({
          name: a.name,
          executedAt: a.executed_at ? new Date(a.executed_at).toISOString() : '',
          checksum: a.checksum,
        })),
        pending,
      };
    } finally {
      client.release();
    }
  }

  public async runPending(): Promise<{ applied: string[]; totalApplied: number }> {
    const client = await this.pool.connect();
    try {
      await this.ensureMigrationsTable(client);
      const applied = await this.getAppliedMigrations(client);
      const appliedMap = new Map(applied.map((a) => [a.name, a.checksum]));
      const allFiles = this.getMigrationFiles();

      const executedNames: string[] = [];

      for (const file of allFiles) {
        if (appliedMap.has(file.name)) {
          // Verify checksum hasn't been altered
          const recordedChecksum = appliedMap.get(file.name);
          if (recordedChecksum !== file.checksum) {
            console.warn(
              `[MigrationRunner] Warning: Checksum mismatch for already applied migration "${file.name}". Recorded: ${recordedChecksum}, Current: ${file.checksum}`
            );
          }
          continue;
        }

        console.log(`[MigrationRunner] Applying migration: ${file.name}...`);
        const start = Date.now();

        await client.query('BEGIN;');
        try {
          await client.query(file.sql);
          const duration = Date.now() - start;

          await client.query(
            'INSERT INTO schema_migrations (name, checksum, execution_time_ms) VALUES ($1, $2, $3);',
            [file.name, file.checksum, duration]
          );

          await client.query('COMMIT;');
          console.log(`[MigrationRunner] Successfully applied ${file.name} in ${duration}ms`);
          executedNames.push(file.name);
        } catch (err: any) {
          await client.query('ROLLBACK;');
          throw new Error(`Failed to apply migration ${file.name}: ${err.message}`);
        }
      }

      return { applied: executedNames, totalApplied: executedNames.length };
    } finally {
      client.release();
    }
  }
}
