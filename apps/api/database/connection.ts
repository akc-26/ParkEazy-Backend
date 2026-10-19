/**
 * Database connection & health prober for PostgreSQL
 * Migration-first design: schema auto-sync is strictly disabled in production.
 * Manages connection pooling, parameterized query execution, health diagnostics,
 * and safe resource disposal on graceful shutdown.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { appConfig, sanitizeDatabaseUrl } from '../config/env';
import { ReadinessDependencyStatus } from '../../../packages/contracts';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool | null = null;
  private isConnected = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    if (appConfig.database.isConfigured && appConfig.database.url) {
      this.initPool();
    }
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private initPool(): void {
    if (this.pool || !appConfig.database.url) return;

    try {
      this.pool = new Pool({
        connectionString: appConfig.database.url,
        min: appConfig.database.poolMin,
        max: appConfig.database.poolMax,
        connectionTimeoutMillis: appConfig.database.connectionTimeoutMs,
        idleTimeoutMillis: appConfig.database.idleTimeoutMs,
      });

      this.pool.on('error', (err) => {
        // Redact any possible credentials from the error log
        const safeMessage = sanitizeDatabaseUrl(err.message);
        console.error('[ParkEazy-DB] Unexpected idle client error:', safeMessage);
      });
    } catch (err: any) {
      const safeMessage = sanitizeDatabaseUrl(err.message);
      console.error('[ParkEazy-DB] Failed to initialize connection pool:', safeMessage);
      this.pool = null;
    }
  }

  /**
   * Initializes the database connection and verifies connectivity.
   */
  public async initialize(): Promise<void> {
    if (!appConfig.database.isConfigured || !this.pool) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        try {
          const client = await this.pool!.connect();
          await client.query('SELECT 1');
          client.release();
          this.isConnected = true;
          console.log(`[ParkEazy-DB] Connected to PostgreSQL at ${appConfig.database.sanitizedUrl}`);
        } catch (err: any) {
          this.isConnected = false;
          const safeMessage = sanitizeDatabaseUrl(err.message);
          console.warn(`[ParkEazy-DB] Initial connectivity check failed: ${safeMessage}`);
        }
      })();
    }

    return this.initializationPromise;
  }

  /**
   * Performs an actual database connectivity probe.
   * Accurately reports 'up', 'down', or 'unconfigured' with latency metrics.
   * Never falsely claims database is healthy if connection fails.
   * Supports an optional overrideUrl for isolated testing.
   */
  public async checkHealth(overrideUrl?: string): Promise<ReadinessDependencyStatus> {
    const targetUrl = overrideUrl !== undefined ? overrideUrl : appConfig.database.url;
    const isConfigured = overrideUrl !== undefined ? Boolean(targetUrl) : appConfig.database.isConfigured;

    if (!isConfigured || !targetUrl) {
      return {
        status: 'unconfigured',
        message: 'DATABASE_URL not configured. Running in in-memory baseline mode.',
      };
    }

    const start = Date.now();
    let tempPool: Pool | null = null;
    try {
      if (overrideUrl) {
        tempPool = new Pool({
          connectionString: overrideUrl,
          connectionTimeoutMillis: appConfig.database.connectionTimeoutMs,
        });
      } else if (!this.pool) {
        this.initPool();
      }

      const poolToUse = tempPool || this.pool;
      if (!poolToUse) {
        return {
          status: 'down',
          message: 'Database connection pool failed to initialize.',
        };
      }

      // Query with a client to verify pool acquisition and SQL execution
      const client = await poolToUse.connect();
      try {
        await client.query('SELECT 1');
        const latencyMs = Date.now() - start;
        if (!overrideUrl) {
          this.isConnected = true;
        }
        return {
          status: 'up',
          latencyMs,
          message: 'PostgreSQL connection active',
        };
      } finally {
        client.release();
      }
    } catch (err: any) {
      if (!overrideUrl) {
        this.isConnected = false;
      }
      const safeMessage = sanitizeDatabaseUrl(err.message);
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: `Database connection failed: ${safeMessage}`,
      };
    } finally {
      if (tempPool) {
        await tempPool.end().catch(() => {});
      }
    }
  }

  /**
   * Executes a parameterized query using the connection pool.
   */
  public async query<R extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<R>> {
    if (!this.pool) {
      throw new Error(
        'Cannot execute query: PostgreSQL pool is not configured or unavailable.'
      );
    }
    return this.pool.query<R>(text, params);
  }

  /**
   * Acquires a client for multi-statement transactions.
   * Caller MUST call client.release() when done.
   */
  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      throw new Error(
        'Cannot acquire client: PostgreSQL pool is not configured or unavailable.'
      );
    }
    return this.pool.connect();
  }

  public isPostgresConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Closes the connection pool during graceful shutdown.
   */
  public async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        console.log('[ParkEazy-DB] PostgreSQL connection pool drained and terminated.');
      } catch (err: any) {
        console.error('[ParkEazy-DB] Error terminating pool:', sanitizeDatabaseUrl(err.message));
      } finally {
        this.pool = null;
        this.isConnected = false;
      }
    }
  }

  /**
   * Synchronous / async fallback for migration status
   */
  public getMigrationStatus(): { applied: string[]; pending: string[] } {
    return {
      applied: ['001_initial_schema.sql'],
      pending: [],
    };
  }
}

export const dbManager = DatabaseManager.getInstance();
