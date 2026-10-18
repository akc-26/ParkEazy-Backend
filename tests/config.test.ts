import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadAndValidateConfig,
  sanitizeDatabaseUrl,
  sanitizeRedisUrl,
  ConfigurationError,
} from '../apps/api/config/env';

describe('Workstream 2.1 - Configuration and Server Hardening', () => {
  test('loads valid default development configuration', () => {
    const config = loadAndValidateConfig({
      NODE_ENV: 'development',
      PORT: '3000',
    });

    assert.equal(config.nodeEnv, 'development');
    assert.equal(config.port, 3000);
    assert.equal(config.apiPrefix, '/api/v1');
    assert.equal(config.database.isConfigured, false);
    assert.equal(config.database.isRequired, false);
    assert.equal(config.redis.isConfigured, false);
    assert.equal(config.redis.isRequired, false);
    assert.equal(config.auth.allowDemoAuth, true);
  });

  test('validates port number range and throws for invalid port', () => {
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'development',
          PORT: '999999',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'PORT'
    );

    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'development',
          PORT: 'not-a-port',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'PORT'
    );
  });

  test('enforces strict JWT_SECRET requirement in production environment', () => {
    const validDbUrl = 'postgresql://user:pass@localhost:5432/parkeazy_prod';
    const validRedisUrl = 'redis://localhost:6379';

    // Missing JWT_SECRET in production
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: validDbUrl,
          REDIS_URL: validRedisUrl,
          JWT_SECRET: '',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'JWT_SECRET'
    );

    // Default insecure key in production
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: validDbUrl,
          REDIS_URL: validRedisUrl,
          JWT_SECRET: 'parkeazy-dev-secret-key-do-not-use-in-production',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'JWT_SECRET'
    );

    // Short secret in production (< 32 chars)
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: validDbUrl,
          REDIS_URL: validRedisUrl,
          JWT_SECRET: 'too-short-secret',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'JWT_SECRET'
    );

    // Valid high-entropy production secret succeeds when DB and Redis are configured
    const validConfig = loadAndValidateConfig({
      NODE_ENV: 'production',
      DATABASE_URL: validDbUrl,
      REDIS_URL: validRedisUrl,
      JWT_SECRET: '9f8e7d6c5b4a3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    });
    assert.equal(validConfig.auth.jwtSecret, '9f8e7d6c5b4a3a2b1c0d9e8f7a6b5c4d3e2f1a0b');
    assert.equal(validConfig.auth.allowDemoAuth, false);
    assert.equal(validConfig.database.isRequired, true);
    assert.equal(validConfig.redis.isRequired, true);
  });

  test('enforces mandatory PostgreSQL DATABASE_URL in production environment', () => {
    // Missing DATABASE_URL in production
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: '',
          REDIS_URL: 'redis://localhost:6379',
          JWT_SECRET: '9f8e7d6c5b4a3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'DATABASE_URL'
    );

    // Invalid non-postgres protocol in production
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
          REDIS_URL: 'redis://localhost:6379',
          JWT_SECRET: '9f8e7d6c5b4a3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'DATABASE_URL'
    );
  });

  test('enforces mandatory Redis REDIS_URL in production environment', () => {
    // Missing REDIS_URL in production
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/parkeazy_prod',
          REDIS_URL: '',
          JWT_SECRET: '9f8e7d6c5b4a3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'REDIS_URL'
    );

    // Invalid non-redis protocol in production
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/parkeazy_prod',
          REDIS_URL: 'http://localhost:6379',
          JWT_SECRET: '9f8e7d6c5b4a3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'REDIS_URL'
    );
  });

  test('enforces valid DATABASE_URL when DATABASE_REQUIRED=true in development', () => {
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'development',
          DATABASE_REQUIRED: 'true',
          DATABASE_URL: '',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'DATABASE_URL'
    );

    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'development',
          DATABASE_REQUIRED: 'true',
          DATABASE_URL: 'mysql://user:pass@localhost:3306/db',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'DATABASE_URL'
    );
  });

  test('enforces valid REDIS_URL when REDIS_REQUIRED=true in development', () => {
    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'development',
          REDIS_REQUIRED: 'true',
          REDIS_URL: '',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'REDIS_URL'
    );

    assert.throws(
      () => {
        loadAndValidateConfig({
          NODE_ENV: 'development',
          REDIS_REQUIRED: 'true',
          REDIS_URL: 'memcached://localhost:11211',
        });
      },
      (err: any) => err instanceof ConfigurationError && err.variable === 'REDIS_URL'
    );
  });

  test('sanitizes connection string passwords to prevent credential leakage', () => {
    const rawPgUrl = 'postgresql://admin_user:super_secret_pw123@db.example.com:5432/parkeazy_prod';
    const sanitizedPg = sanitizeDatabaseUrl(rawPgUrl);

    assert.ok(!sanitizedPg.includes('super_secret_pw123'), 'Sanitized PG URL must not leak password');
    assert.ok(sanitizedPg.includes('***'), 'Sanitized PG URL must replace credentials with mask');
    assert.ok(sanitizedPg.includes('db.example.com:5432/parkeazy_prod'), 'Host and database name preserved');

    const rawRedisUrl = 'redis://:redis_secret_pass@cache.example.com:6379/0';
    const sanitizedRedis = sanitizeRedisUrl(rawRedisUrl);

    assert.ok(!sanitizedRedis.includes('redis_secret_pass'), 'Sanitized Redis URL must not leak password');
    assert.ok(sanitizedRedis.includes('***'), 'Sanitized Redis URL must replace credentials with mask');
    assert.ok(sanitizedRedis.includes('cache.example.com:6379'), 'Host and port preserved');
  });

  test('parses comma-separated CORS origins into distinct array', () => {
    const config = loadAndValidateConfig({
      CORS_ORIGIN: 'https://parkeazy.com, https://admin.parkeazy.com',
    });

    assert.deepEqual(config.corsOrigins, ['https://parkeazy.com', 'https://admin.parkeazy.com']);
  });
});
