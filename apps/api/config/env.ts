/**
 * Environment configuration and validation for ParkEazy API
 */

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[];
  database: {
    url?: string;
    isConfigured: boolean;
    poolMin: number;
    poolMax: number;
  };
  redis: {
    url?: string;
    isConfigured: boolean;
  };
  auth: {
    jwtSecret: string;
    tokenExpirySeconds: number;
  };
}

export function loadAndValidateConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const databaseUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;
  const jwtSecret = process.env.JWT_SECRET || 'parkeazy-dev-secret-key-do-not-use-in-production';

  return {
    nodeEnv,
    port,
    apiPrefix: '/api/v1',
    corsOrigins: ['*'],
    database: {
      url: databaseUrl,
      isConfigured: Boolean(databaseUrl && databaseUrl.startsWith('postgres')),
      poolMin: 2,
      poolMax: 10,
    },
    redis: {
      url: redisUrl,
      isConfigured: Boolean(redisUrl && redisUrl.startsWith('redis')),
    },
    auth: {
      jwtSecret,
      tokenExpirySeconds: 86400, // 24 hours
    },
  };
}

export const appConfig = loadAndValidateConfig();
