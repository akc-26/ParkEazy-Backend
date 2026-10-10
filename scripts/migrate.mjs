#!/usr/bin/env node
/**
 * @fileoverview Database Migration CLI Runner for ParkEazy.
 * Cross-platform script to run pending PostgreSQL migrations or inspect migration status.
 *
 * Usage:
 *   node scripts/migrate.mjs          # Run pending migrations
 *   node scripts/migrate.mjs --status # Inspect migration status
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env if present
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config({ path: path.join(rootDir, '.env.example') });
}

const isStatusOnly = process.argv.includes('--status');

function getPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'parkeazy_user',
    password: process.env.DB_PASSWORD || 'parkeazy_password',
    database: process.env.DB_NAME || 'parkeazy_db',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

async function run() {
  console.log('\n==============================================================================');
  console.log('  ParkEazy — Database Migration Runner (Part 03)');
  console.log('==============================================================================\n');

  const poolConfig = getPoolConfig();
  console.log(`Target Database: ${poolConfig.database || 'default'} @ ${poolConfig.host || 'connectionString'}:${poolConfig.port || ''}`);

  const pool = new pg.Pool(poolConfig);
  const migrationsDir = path.join(rootDir, 'services/api/src/database/migrations');

  try {
    const client = await pool.connect();
    try {
      // Ensure schema_migrations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          checksum VARCHAR(64) NOT NULL,
          executed_at TIMESTAMPTZ DEFAULT NOW(),
          execution_time_ms INTEGER NOT NULL
        );
      `);

      const res = await client.query('SELECT name, checksum, executed_at, execution_time_ms FROM schema_migrations ORDER BY id ASC;');
      const applied = res.rows;
      const appliedMap = new Map(applied.map(a => [a.name, a.checksum]));

      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort()
        .map(fileName => {
          const filePath = path.join(migrationsDir, fileName);
          const sql = fs.readFileSync(filePath, 'utf8');
          const checksum = crypto.createHash('sha256').update(sql).digest('hex');
          return { name: fileName, filePath, sql, checksum };
        });

      console.log(`Found ${files.length} migration files in ${migrationsDir}`);
      console.log(`Applied in database: ${applied.length} | Pending: ${files.length - applied.length}\n`);

      if (isStatusOnly) {
        console.log('--- Migration Status ---');
        for (const file of files) {
          const isApplied = appliedMap.has(file.name);
          const status = isApplied ? '\x1b[32mAPPLIED\x1b[0m' : '\x1b[33mPENDING\x1b[0m';
          console.log(`  [${status}] ${file.name} (SHA: ${file.checksum.slice(0, 10)}...)`);
        }
        process.exit(0);
      }

      let newlyApplied = 0;
      for (const file of files) {
        if (appliedMap.has(file.name)) {
          console.log(`  [SKIP] ${file.name} (already applied)`);
          continue;
        }

        console.log(`  [APPLYING] ${file.name}...`);
        const start = Date.now();
        await client.query('BEGIN;');
        try {
          await client.query(file.sql);
          const duration = Date.now() - start;
          await client.query(
            'INSERT INTO schema_migrations (name, checksum, execution_time_ms) VALUES ($1, $2, $3);',
            [file.name, file.checksum, duration]
          );
          await client.query('COMMIT;');
          console.log(`  \x1b[32m[SUCCESS]\x1b[0m ${file.name} (${duration}ms)`);
          newlyApplied++;
        } catch (err) {
          await client.query('ROLLBACK;');
          console.error(`  \x1b[31m[FAILED]\x1b[0m ${file.name}:`, err.message);
          throw err;
        }
      }

      console.log(`\n✅ Migration run complete. ${newlyApplied} migrations newly applied.`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
