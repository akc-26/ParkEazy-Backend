import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DatabaseConfigService } from './database.config.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  private connected = false;
  constructor(private readonly config: DatabaseConfigService) {}

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Database configuration is absent; running in degraded mode outside production.');
      return;
    }
    this.pool = new Pool(this.config.connectionString ? {
      connectionString: this.config.connectionString,
      ssl: this.config.ssl ? { rejectUnauthorized: true } : undefined,
      connectionTimeoutMillis: 2500,
    } : {
      host: this.config.host, port: this.config.port, user: this.config.user,
      password: this.config.password, database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: true } : undefined,
      connectionTimeoutMillis: 2500,
    });
    try { await this.pool.query('SELECT 1'); this.connected = true; }
    catch (error) { this.connected = false; this.logger.error('Database connection failed; persistent operations will be unavailable.', error instanceof Error ? error.message : String(error)); }
  }
  async onModuleDestroy(): Promise<void> { await this.pool?.end(); this.pool = null; this.connected = false; }
  getPool(): Pool | null { return this.pool; }
  getHealthStatus(): { connected: boolean; configured: boolean } { return { connected: this.connected, configured: this.config.enabled }; }
  async query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<QueryResult<T>> {
    if (!this.pool || !this.connected) throw new ServiceUnavailableException('Database persistence is unavailable');
    return this.pool.query<T>(sql, values);
  }
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool || !this.connected) throw new ServiceUnavailableException('Database persistence is unavailable');
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
