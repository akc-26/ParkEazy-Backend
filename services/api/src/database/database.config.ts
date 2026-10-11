import { Injectable } from '@nestjs/common';
import type { PoolConfig } from 'pg';

export interface DatabaseConfig {
  url?: string;
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  isConfigured: boolean;
}

@Injectable()
export class DatabaseConfigService {
  private config: DatabaseConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): DatabaseConfig {
    const rawUrl = process.env.DATABASE_URL?.trim();
    const host = process.env.DB_HOST?.trim() || 'localhost';
    const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
    const user = process.env.DB_USER?.trim() || 'parkeazy_user';
    const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'parkeazy_password';
    const database = process.env.DB_NAME?.trim() || 'parkeazy_db';
    const ssl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';
    const maxConnections = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10;
    const idleTimeoutMillis = process.env.DB_POOL_IDLE_TIMEOUT_MS ? parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10) : 30000;
    const connectionTimeoutMillis = process.env.DB_CONNECTION_TIMEOUT_MS ? parseInt(process.env.DB_CONNECTION_TIMEOUT_MS, 10) : 5000;

    const isConfigured = Boolean(rawUrl || process.env.DB_HOST || process.env.DB_NAME);

    return {
      url: rawUrl,
      host,
      port,
      user,
      password,
      database,
      ssl,
      maxConnections,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      isConfigured,
    };
  }

  public getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  public getPoolConfig(): PoolConfig {
    if (this.config.url) {
      return {
        connectionString: this.config.url,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMillis,
        connectionTimeoutMillis: this.config.connectionTimeoutMillis,
      };
    }

    return {
      host: this.config.host,
      port: this.config.port,
      user: this.config.user,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : undefined,
      max: this.config.maxConnections,
      idleTimeoutMillis: this.config.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis,
    };
  }

  /**
   * Returns a sanitized connection summary safe for logging and health checks.
   * Never leaks passwords or private tokens.
   */
  public getSanitizedSummary(): Record<string, unknown> {
    return {
      engine: 'PostgreSQL',
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      ssl: this.config.ssl,
      maxConnections: this.config.maxConnections,
      isConfigured: this.config.isConfigured,
    };
  }

  public validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (this.config.port < 1 || this.config.port > 65535) {
      errors.push(`Invalid database port: ${this.config.port}`);
    }
    if (!this.config.database || this.config.database.trim().length === 0) {
      errors.push('Database name must not be empty');
    }
    if (this.config.maxConnections < 1) {
      errors.push('Database pool max connections must be at least 1');
    }
    return { valid: errors.length === 0, errors };
  }
}
