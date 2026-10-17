import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { RedisManager, redisManager } from '../apps/api/cache/redis';

describe('Workstream 2.2b - Redis Cache Connection and Readiness Foundation', () => {
  test('RedisManager is a singleton and provides required lifecycle methods', () => {
    const instance1 = RedisManager.getInstance();
    const instance2 = RedisManager.getInstance();
    assert.strictEqual(instance1, instance2, 'RedisManager must be a singleton');
    assert.strictEqual(instance1, redisManager);

    assert.equal(typeof redisManager.initialize, 'function');
    assert.equal(typeof redisManager.checkHealth, 'function');
    assert.equal(typeof redisManager.getClient, 'function');
    assert.equal(typeof redisManager.isRedisConnected, 'function');
    assert.equal(typeof redisManager.close, 'function');
  });

  test('reports unconfigured status truthfully when REDIS_URL is not set', async () => {
    const unconfiguredHealth = await redisManager.checkHealth('');
    assert.equal(unconfiguredHealth.status, 'unconfigured');
    assert.ok(
      unconfiguredHealth.message?.includes('in-memory'),
      'Message must indicate in-memory mode'
    );
  });

  test('reports down status truthfully when Redis is unreachable (verifies actual connectivity)', async () => {
    // Probing an unreachable port to verify actual network connectivity
    const downHealth = await redisManager.checkHealth('redis://:supersecretpass@127.0.0.1:63799');
    assert.equal(downHealth.status, 'down');
    assert.ok(typeof downHealth.latencyMs === 'number');
    assert.ok(downHealth.message?.includes('Redis connection failed'));
    // Password must be redacted
    assert.ok(!downHealth.message?.includes('supersecretpass'));
  });

  test('safe Redis shutdown does not throw on repeated close calls', async () => {
    await assert.doesNotReject(async () => {
      await redisManager.close();
      await redisManager.close();
    });
  });
});
