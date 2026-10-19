import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseManager, dbManager } from '../apps/api/database/connection';
import { MigrationManager, migrationManager } from '../apps/api/database/migrator';

describe('Workstream 2.2 - PostgreSQL Connection and Migration Foundation', () => {
  test('DatabaseManager is a singleton and provides required lifecycle methods', () => {
    const instance1 = DatabaseManager.getInstance();
    const instance2 = DatabaseManager.getInstance();
    assert.strictEqual(instance1, instance2, 'DatabaseManager must be a singleton');
    assert.strictEqual(instance1, dbManager);

    assert.equal(typeof dbManager.initialize, 'function');
    assert.equal(typeof dbManager.checkHealth, 'function');
    assert.equal(typeof dbManager.query, 'function');
    assert.equal(typeof dbManager.getClient, 'function');
    assert.equal(typeof dbManager.close, 'function');
  });

  test('reports unconfigured status truthfully when DATABASE_URL is not set', async () => {
    // When URL is not set or empty, checkHealth returns unconfigured
    const unconfiguredHealth = await dbManager.checkHealth('');
    assert.equal(unconfiguredHealth.status, 'unconfigured');
    assert.ok(
      unconfiguredHealth.message?.includes('in-memory'),
      'Message must indicate in-memory mode'
    );
  });

  test('reports down status truthfully when PostgreSQL is unreachable (verifies actual connectivity)', async () => {
    // Probing an unreachable local port to verify actual connectivity
    const downHealth = await dbManager.checkHealth('postgresql://user:pass@127.0.0.1:54329/nonexistent_db');
    assert.equal(downHealth.status, 'down');
    assert.ok(typeof downHealth.latencyMs === 'number');
    assert.ok(downHealth.message?.includes('Database connection failed'));
    // Password must be redacted
    assert.ok(!downHealth.message?.includes('pass'));
  });

  test('MigrationManager discovers available SQL migration files in deterministic order', () => {
    const files = migrationManager.getAvailableMigrationFiles();
    assert.ok(files.length > 0, 'Must discover at least one migration file');

    const first = files[0];
    assert.equal(first.name, '001_initial_schema.sql');
    assert.equal(first.version, '001');

    // Verify deterministic alphabetical order
    const names = files.map((f) => f.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    assert.deepEqual(names, sorted, 'Migration files must be deterministically sorted');
  });

  test('MigrationManager calculates deterministic sha256 checksums', () => {
    const contentA = 'CREATE TABLE test_tbl (id INT);';
    const contentB = 'CREATE TABLE test_tbl (id INT);';
    const contentC = 'CREATE TABLE test_tbl_different (id INT);';

    const hashA = migrationManager.calculateChecksum(contentA);
    const hashB = migrationManager.calculateChecksum(contentB);
    const hashC = migrationManager.calculateChecksum(contentC);

    assert.equal(hashA, hashB, 'Identical content must yield identical checksums');
    assert.notEqual(hashA, hashC, 'Different content must yield different checksums');
    assert.equal(hashA.length, 64, 'SHA-256 hex string must be 64 characters');
  });

  test('returns truthful migration status when in in-memory mode', async () => {
    const status = await migrationManager.getMigrationStatus();
    assert.ok(Array.isArray(status.applied));
    assert.ok(Array.isArray(status.pending));

    if (!status.isConfigured) {
      assert.ok(status.applied[0].includes('in-memory baseline'));
    }
  });

  test('safe database shutdown does not throw on repeated close calls', async () => {
    await assert.doesNotReject(async () => {
      await dbManager.close();
      await dbManager.close();
    });
  });
});
