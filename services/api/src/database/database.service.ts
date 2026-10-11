import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';
import { DatabaseConfigService } from './database.config';

export interface DatabaseHealthStatus {
  engine: 'PostgreSQL';
  configured: boolean;
  connected: boolean;
  latencyMs?: number;
  database?: string;
  pool?: {
    total: number;
    idle: number;
    waiting: number;
  };
  error?: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private isConnected = false;
  private lastError: string | null = null;

  constructor(private readonly configService: DatabaseConfigService) {}

  public async onModuleInit(): Promise<void> {
    const configValidation = this.configService.validate();
    if (!configValidation.valid) {
      const errDetail = configValidation.errors.join(', ');
      this.logger.warn(`[Database] Invalid database configuration: ${errDetail}`);
      this.lastError = `Invalid configuration: ${errDetail}`;
      return;
    }

    try {
      const poolConfig = this.configService.getPoolConfig();
      this.pool = new Pool(poolConfig);

      // Handle background errors on idle clients
      this.pool.on('error', (err) => {
        this.logger.error('[Database] Unexpected error on idle client', err.message);
        this.isConnected = false;
        this.lastError = `Unexpected idle client error: ${err.message}`;
      });

      // Attempt non-blocking verification ping
      const pingResult = await this.ping();
      if (pingResult.connected) {
        this.isConnected = true;
        this.lastError = null;
        this.logger.log(
          `[Database] Connected successfully to PostgreSQL (${this.configService.getConfig().database}) in ${pingResult.latencyMs}ms`
        );
      } else {
        this.isConnected = false;
        this.lastError = pingResult.error || 'Connection failed';
        this.logger.warn(
          `[Database] PostgreSQL instance currently unreachable (${this.lastError}). API will start in offline/degraded database mode.`
        );
      }
    } catch (err: any) {
      this.isConnected = false;
      this.lastError = err?.message || 'Failed to initialize connection pool';
      this.logger.warn(
        `[Database] Connection initialization warning: ${this.lastError}. API remaining responsive for liveness probes.`
      );
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
        this.logger.log('[Database] Connection pool drained and closed cleanly');
      } catch (err: any) {
        this.logger.error('[Database] Error closing connection pool', err?.message);
      } finally {
        this.pool = null;
        this.isConnected = false;
      }
    }
  }

  public async ping(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
    if (!this.pool) {
      return { connected: false, error: 'Database pool not initialized' };
    }

    const start = Date.now();
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1 AS alive;');
        const latencyMs = Date.now() - start;
        this.isConnected = true;
        this.lastError = null;
        return { connected: true, latencyMs };
      } finally {
        client.release();
      }
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const safeErrorMsg = err?.code ? `Code: ${err.code} (${err.message})` : (err?.message || 'Connection refused');
      this.isConnected = false;
      this.lastError = safeErrorMsg;
      return { connected: false, latencyMs, error: safeErrorMsg };
    }
  }

  public async query<T extends QueryResultRow = any>(
    text: string,
    params: any[] = []
  ): Promise<T[]> {
    if (!this.pool) {
      throw new Error('Database connection pool is not initialized');
    }
    const res = await this.pool.query<T>(text, params);
    return res.rows;
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database connection pool is not initialized');
    }
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN;');
      const result = await callback(client);
      await client.query('COMMIT;');
      return result;
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  }

  public getPoolStats(): { total: number; idle: number; waiting: number } {
    if (!this.pool) {
      return { total: 0, idle: 0, waiting: 0 };
    }
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  public getHealthStatus(): DatabaseHealthStatus {
    const config = this.configService.getConfig();
    return {
      engine: 'PostgreSQL',
      configured: config.isConfigured,
      connected: this.isConnected,
      database: config.database,
      pool: this.getPoolStats(),
      ...(this.lastError ? { error: this.lastError } : {}),
    };
  }

  public getPool(): Pool | null {
    return this.pool;
  }
}
