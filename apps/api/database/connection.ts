import { Pool, PoolClient as PgPoolClient } from 'pg';

export type PoolClient = PgPoolClient | any;

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool | null = null;
  private isConnected = false;

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async initialize(connectionUrl?: string): Promise<void> {
    const url = connectionUrl || process.env.DATABASE_URL;
    if (!url) {
      this.isConnected = false;
      return;
    }

    try {
      if (this.pool) {
        await this.pool.end().catch(() => {});
        this.pool = null;
      }

      this.pool = new Pool({
        connectionString: url,
        connectionTimeoutMillis: 5000,
      });

      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.isConnected = true;
      console.log('[ParkEazy-DB] Connected to PostgreSQL successfully.');
    } catch (err: any) {
      this.isConnected = false;
      if (this.pool) {
        await this.pool.end().catch(() => {});
        this.pool = null;
      }
      console.warn(`[ParkEazy-DB] PostgreSQL connection failed: ${err.message}`);
      // Propagate database failures in production or when connection URL was explicitly supplied
      if (process.env.NODE_ENV === 'production' || connectionUrl) {
        throw err;
      }
    }
  }

  public isPostgresConnected(): boolean {
    return this.isConnected;
  }

  public async checkHealth(customUrl?: string): Promise<{
    status: 'up' | 'down' | 'unconfigured';
    latencyMs?: number;
    message?: string;
  }> {
    const targetUrl = customUrl !== undefined ? customUrl : (process.env.DATABASE_URL || '');
    if (!targetUrl.trim()) {
      return {
        status: 'unconfigured',
        message: 'PostgreSQL connection unconfigured. Running in in-memory mode.',
      };
    }

    // Sanitize credentials for message logging
    const sanitizeUrl = (url: string) => {
      try {
        const parsed = new URL(url);
        if (parsed.password) {
          parsed.password = '***';
        }
        return parsed.toString();
      } catch {
        return url.replace(/:\/\/[^:]+:([^@]+)@/, '://[user]:***@');
      }
    };

    const sanitized = sanitizeUrl(targetUrl);
    const start = Date.now();

    let probePool: Pool | null = null;
    try {
      probePool = new Pool({
        connectionString: targetUrl,
        connectionTimeoutMillis: 3000,
      });

      const client = await probePool.connect();
      await client.query('SELECT 1');
      client.release();
      await probePool.end().catch(() => {});

      const latencyMs = Date.now() - start;
      return {
        status: 'up',
        latencyMs,
        message: `Database connection verified for ${sanitized}`,
      };
    } catch (err: any) {
      if (probePool) {
        await probePool.end().catch(() => {});
      }
      const latencyMs = Date.now() - start;
      const rawError = err?.message || 'Connection refused';
      // Ensure no raw passwords leaked in error message
      const sanitizedMsg = rawError.replace(/(:\/\/[^:]+:)[^@]+(@)/g, '$1***$2');
      return {
        status: 'down',
        latencyMs,
        message: `Database connection failed (${sanitized}): ${sanitizedMsg}`,
      };
    }
  }

  public async query(sql: string, params: any[] = []): Promise<any> {
    if (this.pool && this.isConnected) {
      try {
        return await this.pool.query(sql, params);
      } catch (err) {
        // Propagate database failures instead of treating them as successful empty results
        console.error('[ParkEazy-DB] Query failure:', err);
        throw err;
      }
    }
    return { rows: [], rowCount: 0 };
  }

  public async getClient(): Promise<PoolClient | null> {
    if (this.pool && this.isConnected) {
      return await this.pool.connect();
    }
    return null;
  }

  public async close(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
      }
    } catch {
      // safe shutdown does not throw on repeated close calls
    } finally {
      this.pool = null;
      this.isConnected = false;
    }
  }
}

export const DatabaseConnectionManager = DatabaseManager;
export const dbManager = DatabaseManager.getInstance();
