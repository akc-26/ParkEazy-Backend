/** Runtime PostgreSQL configuration. No credentials are hard-coded. */
export class DatabaseConfigService {
  get connectionString(): string | undefined { return process.env.DATABASE_URL || undefined; }
  get host(): string { return process.env.DB_HOST || '127.0.0.1'; }
  get port(): number { return Number(process.env.DB_PORT || 5432); }
  get user(): string | undefined { return process.env.DB_USER || undefined; }
  get password(): string | undefined { return process.env.DB_PASSWORD || undefined; }
  get database(): string | undefined { return process.env.DB_NAME || undefined; }
  get ssl(): boolean { return process.env.DB_SSL === 'true'; }
  get enabled(): boolean { return Boolean(this.connectionString || (this.user && this.database)); }
}
