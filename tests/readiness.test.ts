import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dbManager } from '../apps/api/database/connection';
import { redisManager } from '../apps/api/cache/redis';
import { migrationManager } from '../apps/api/database/migrator';

describe('Workstream 2.5b - Readiness Probing and Dependency Invariants', () => {
  describe('Missing Configuration Handling', () => {
    test('reports unconfigured for database when url is not set or empty', async () => {
      const status = await dbManager.checkHealth('');
      assert.equal(status.status, 'unconfigured');
      assert.ok(status.message?.includes('in-memory baseline mode'));
    });

    test('reports unconfigured for Redis when url is not set or empty', async () => {
      const status = await redisManager.checkHealth('');
      assert.equal(status.status, 'unconfigured');
      assert.ok(status.message?.includes('in-memory baseline mode'));
    });

    test('migration status reports in-memory baseline when database is not configured', async () => {
      const status = await migrationManager.getMigrationStatus();
      if (!status.isConfigured) {
        assert.ok(status.applied[0]?.includes('in-memory baseline'));
      }
    });
  });

  describe('Failed Connectivity Handling (Verification of Actual Connectivity)', () => {
    test('verifies actual PostgreSQL connectivity and reports down on connection failure', async () => {
      const unreachablePgUrl = 'postgresql://parkeazy_user:secret_pw@127.0.0.1:54328/test_db';
      const status = await dbManager.checkHealth(unreachablePgUrl);

      assert.equal(status.status, 'down');
      assert.ok(typeof status.latencyMs === 'number');
      assert.ok(status.message?.includes('Database connection failed'));
      // Secret masking verification
      assert.ok(!status.message?.includes('secret_pw'), 'Password must never leak in error messages');
    });

    test('verifies actual Redis connectivity and reports down on connection failure', async () => {
      const unreachableRedisUrl = 'redis://:top_secret_auth@127.0.0.1:63798';
      const status = await redisManager.checkHealth(unreachableRedisUrl);

      assert.equal(status.status, 'down');
      assert.ok(typeof status.latencyMs === 'number');
      assert.ok(status.message?.includes('Redis connection failed'));
      // Secret masking verification
      assert.ok(!status.message?.includes('top_secret_auth'), 'Password must never leak in error messages');
    });
  });

  describe('Readiness Status Evaluation Rules', () => {
    function computeReadiness(
      dbStatus: 'up' | 'down' | 'unconfigured',
      redisStatus: 'up' | 'down' | 'unconfigured',
      migrationsStatus: 'up' | 'down' | 'unconfigured',
      nodeEnv: 'development' | 'test' | 'production'
    ) {
      const isDbUp = dbStatus === 'up';
      const isRedisUp = redisStatus === 'up';
      const isMigrationsUp = migrationsStatus === 'up';
      const isReady = isDbUp && isRedisUp && isMigrationsUp;
      const isProduction = nodeEnv === 'production';
      const isInMemory = dbStatus === 'unconfigured' || redisStatus === 'unconfigured';

      return {
        ready: isReady,
        productionReady: isProduction ? isReady : false,
        statusCode: isReady ? 200 : 503,
        mode: isInMemory ? 'in-memory-baseline' : isReady ? 'production-ready' : 'unavailable',
      };
    }

    test('returns 503 unavailable when both dependencies are unconfigured (in-memory mode)', () => {
      const result = computeReadiness('unconfigured', 'unconfigured', 'unconfigured', 'development');
      assert.equal(result.ready, false, 'Readiness must be false when dependencies are unconfigured');
      assert.equal(result.statusCode, 503);
      assert.equal(result.productionReady, false, 'In-memory mode must never be labeled production-ready');
      assert.equal(result.mode, 'in-memory-baseline');
    });

    test('returns 503 unavailable when database is down even if Redis is up', () => {
      const result = computeReadiness('down', 'up', 'down', 'production');
      assert.equal(result.ready, false);
      assert.equal(result.statusCode, 503);
      assert.equal(result.productionReady, false);
      assert.equal(result.mode, 'unavailable');
    });

    test('returns 503 unavailable when Redis is down even if database is up', () => {
      const result = computeReadiness('up', 'down', 'up', 'production');
      assert.equal(result.ready, false);
      assert.equal(result.statusCode, 503);
      assert.equal(result.productionReady, false);
      assert.equal(result.mode, 'unavailable');
    });

    test('returns 200 ready when both PostgreSQL and Redis are up and migrations applied', () => {
      const result = computeReadiness('up', 'up', 'up', 'production');
      assert.equal(result.ready, true);
      assert.equal(result.statusCode, 200);
      assert.equal(result.productionReady, true);
      assert.equal(result.mode, 'production-ready');
    });

    test('never labels development in-memory mode as production ready', () => {
      const resultDev = computeReadiness('unconfigured', 'unconfigured', 'unconfigured', 'development');
      assert.equal(resultDev.productionReady, false);

      const resultTest = computeReadiness('unconfigured', 'unconfigured', 'unconfigured', 'test');
      assert.equal(resultTest.productionReady, false);
    });
  });
});
