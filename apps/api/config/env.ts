/**
 * Environment configuration, validation, and security hardening for ParkEazy API.
 * Follows 12-factor application guidelines and enforces strict fail-fast rules
 * for production while preserving seamless local development and testing workflows.
 */

export type Environment = 'development' | 'test' | 'production';

export interface DatabaseConfig {
  url?: string;
  sanitizedUrl?: string;
  isConfigured: boolean;
  isRequired: boolean;
  poolMin: number;
  poolMax: number;
  connectionTimeoutMs: number;
  idleTimeoutMs: number;
}

export interface RedisConfig {
  url?: string;
  sanitizedUrl?: string;
  isConfigured: boolean;
  isRequired: boolean;
  connectTimeoutMs: number;
}

export interface AuthConfig {
  jwtSecret: string;
  tokenExpirySeconds: number;
  allowDemoAuth: boolean;
}

export interface ShutdownConfig {
  timeoutMs: number;
}

export interface SecurityConfig {
  configEncryptionKey: string;
}

export interface AppConfig {
  nodeEnv: Environment;
  port: number;
  host: string;
  apiPrefix: string;
  bodyLimit: string;
  corsOrigins: string[];
  database: DatabaseConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  security: SecurityConfig;
  shutdown: ShutdownConfig;
}

export class ConfigurationError extends Error {
  constructor(message: string, public readonly variable?: string) {
    super(`[ParkEazy-Config] ${message}`);
    this.name = 'ConfigurationError';
  }
}

/**
 * Sanitizes connection URLs (e.g., PostgreSQL URIs) by masking credentials
 * so they can be safely logged, printed, or inspected without secret leakage.
 */
export function sanitizeDatabaseUrl(url?: string): string {
  if (!url) return 'unconfigured';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = '***';
    }
    return parsed.toString();
  } catch {
    // If not a standard URL, mask using regex pattern
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
  }
}

/**
 * Sanitizes Redis connection URLs by masking password and username credentials.
 */
export function sanitizeRedisUrl(url?: string): string {
  if (!url) return 'unconfigured';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    if (parsed.username) {
      parsed.username = '***';
    }
    return parsed.toString();
  } catch {
    return url.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
  }
}

const INSECURE_JWT_DEFAULTS = new Set([
  'parkeazy-dev-secret-key-do-not-use-in-production',
  'replace-with-secure-32-byte-hex-secret',
  'your-jwt-secret-key-here',
  'secret',
  'changeme',
]);

export function loadAndValidateConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawNodeEnv = (env.NODE_ENV || 'development').toLowerCase().trim();
  const nodeEnv: Environment =
    rawNodeEnv === 'production' || rawNodeEnv === 'prod'
      ? 'production'
      : rawNodeEnv === 'test'
      ? 'test'
      : 'development';

  // Port Validation
  let argPort: string | undefined;
  if (typeof process !== 'undefined' && Array.isArray(process.argv)) {
    for (let i = 0; i < process.argv.length; i++) {
      if (process.argv[i] === '--port' && process.argv[i + 1]) {
        argPort = process.argv[i + 1];
      } else if (process.argv[i].startsWith('--port=')) {
        argPort = process.argv[i].split('=')[1];
      }
    }
  }

  const rawPort =
    argPort ||
    (env.DEFAULT_APP_PORT && (env.PORT === env.NGINX_PORT || env.PORT === '8080')
      ? env.DEFAULT_APP_PORT
      : undefined) ||
    env.APP_PORT ||
    env.PORT ||
    '3000';
  const port = parseInt(rawPort, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new ConfigurationError(
      `Invalid PORT "${rawPort}". Must be an integer between 1 and 65535.`,
      'PORT'
    );
  }

  const host = env.HOST || '0.0.0.0';
  const apiPrefix = env.API_PREFIX || '/api/v1';
  const bodyLimit = env.BODY_LIMIT || '1mb';

  // CORS Origins Parsing
  const rawCors = env.CORS_ORIGIN || env.CORS_ORIGINS || '*';
  const corsOrigins = rawCors
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Database Configuration: Mandatory in production
  const databaseUrl = env.DATABASE_URL?.trim();
  const isPostgresUrl = Boolean(
    databaseUrl &&
      (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://'))
  );

  const databaseRequired = nodeEnv === 'production' || env.DATABASE_REQUIRED === 'true';

  if (databaseRequired && !isPostgresUrl) {
    throw new ConfigurationError(
      nodeEnv === 'production'
        ? 'DATABASE_URL is mandatory in production and must be a valid postgresql:// connection string.'
        : 'DATABASE_URL is required in this environment and must be a valid postgresql:// connection string.',
      'DATABASE_URL'
    );
  }

  const poolMin = Math.max(1, parseInt(env.DATABASE_POOL_MIN || '2', 10));
  const poolMax = Math.max(poolMin, parseInt(env.DATABASE_POOL_MAX || '10', 10));
  const connectionTimeoutMs = parseInt(env.DATABASE_TIMEOUT_MS || '5000', 10);
  const idleTimeoutMs = parseInt(env.DATABASE_IDLE_TIMEOUT_MS || '30000', 10);

  const databaseConfig: DatabaseConfig = {
    url: databaseUrl,
    sanitizedUrl: databaseUrl ? sanitizeDatabaseUrl(databaseUrl) : undefined,
    isConfigured: isPostgresUrl,
    isRequired: databaseRequired,
    poolMin,
    poolMax,
    connectionTimeoutMs,
    idleTimeoutMs,
  };

  // Redis Configuration: Mandatory in production
  const redisUrl = env.REDIS_URL?.trim();
  const isRedisUrl = Boolean(
    redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'))
  );

  const redisRequired = nodeEnv === 'production' || env.REDIS_REQUIRED === 'true';

  if (redisRequired && !isRedisUrl) {
    throw new ConfigurationError(
      nodeEnv === 'production'
        ? 'REDIS_URL is mandatory in production and must be a valid redis:// or rediss:// connection string.'
        : 'REDIS_URL is required in this environment and must be a valid redis:// or rediss:// connection string.',
      'REDIS_URL'
    );
  }

  const redisConnectTimeoutMs = parseInt(env.REDIS_TIMEOUT_MS || '3000', 10);

  const redisConfig: RedisConfig = {
    url: redisUrl,
    sanitizedUrl: redisUrl ? sanitizeRedisUrl(redisUrl) : undefined,
    isConfigured: isRedisUrl,
    isRequired: redisRequired,
    connectTimeoutMs: redisConnectTimeoutMs,
  };

  // Auth Configuration
  let jwtSecret = env.JWT_SECRET?.trim() || '';
  const allowDemoAuth =
    nodeEnv !== 'production' &&
    env.ENABLE_DEMO_AUTH !== 'false';

  if (nodeEnv === 'production') {
    if (!jwtSecret) {
      throw new ConfigurationError(
        'JWT_SECRET environment variable is mandatory in production.',
        'JWT_SECRET'
      );
    }
    if (INSECURE_JWT_DEFAULTS.has(jwtSecret) || jwtSecret.length < 32) {
      throw new ConfigurationError(
        'JWT_SECRET in production must be a secure, high-entropy key of at least 32 characters and cannot use known default placeholders.',
        'JWT_SECRET'
      );
    }
  } else {
    // In dev/test environments, fallback to safe development key
    if (!jwtSecret) {
      jwtSecret = 'parkeazy-dev-secret-key-do-not-use-in-production';
    }
  }

  const tokenExpirySeconds = parseInt(env.JWT_EXPIRY_SECONDS || '86400', 10);

  const authConfig: AuthConfig = {
    jwtSecret,
    tokenExpirySeconds,
    allowDemoAuth,
  };

  const configEncryptionKey =
    env.CONFIG_ENCRYPTION_KEY?.trim() ||
    jwtSecret ||
    'parkeazy-bootstrap-encryption-fallback-key';

  const shutdownTimeoutMs = parseInt(env.SHUTDOWN_TIMEOUT_MS || '10000', 10);

  return {
    nodeEnv,
    port,
    host,
    apiPrefix,
    bodyLimit,
    corsOrigins: corsOrigins.length > 0 ? corsOrigins : ['*'],
    database: databaseConfig,
    redis: redisConfig,
    auth: authConfig,
    security: {
      configEncryptionKey,
    },
    shutdown: {
      timeoutMs: shutdownTimeoutMs,
    },
  };
}

export const appConfig = loadAndValidateConfig();
