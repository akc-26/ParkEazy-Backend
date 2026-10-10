#!/usr/bin/env node
/**
 * @fileoverview Database Seeder CLI Runner for ParkEazy.
 * Cross-platform script to seed default tenant, users, and Chennai parking facilities.
 *
 * Usage:
 *   node scripts/seed.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

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

// Production safety guard: Prevent accidental data seeding in production environment
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error('\n❌ Refusing to seed database: NODE_ENV is "production". Set ALLOW_PRODUCTION_SEED=true if this was intentional.');
  process.exit(1);
}

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
  console.log('  ParkEazy — Database Seeder (Part 03)');
  console.log('==============================================================================\n');

  const poolConfig = getPoolConfig();
  const pool = new pg.Pool(poolConfig);

  try {
    const client = await pool.connect();
    try {
      console.log('Executing idempotent database seed for Chennai facilities and default tenant...');
      await client.query('BEGIN;');

      // 1. Tenant
      await client.query(`
        INSERT INTO tenants (id, display_name, legal_name, tagline, primary_domain, theme_tokens, assets, status)
        VALUES ('default', 'ParkEazy', 'ParkEazy Technologies Pvt. Ltd.', 'Smart Parking Marketplace', 'localhost',
          '{"colors":{"primary":"#0F766E","secondary":"#14B8A6","accent":"#D6A84F","background":"#F8FAFC","surface":"#FFFFFF","border":"#E2E8F0"},"typography":{"headingFont":"Plus Jakarta Sans","bodyFont":"Plus Jakarta Sans"},"radii":{"sm":"4px","md":"8px","lg":"12px"}}'::jsonb,
          '{"logoUrl":"/branding/logos/parkeazy-logo.svg","iconUrl":"/branding/logos/parkeazy-icon.svg","faviconUrl":"/favicon.ico"}'::jsonb,
          'active')
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW();
      `);

      // 2. Users
      const users = [
        { id: '00000000-0000-4000-a000-000000000001', email: 'admin@parkeazy.com', name: 'Platform Admin', phone: '+919876500001', role: 'superadmin' },
        { id: '00000000-0000-4000-a000-000000000002', email: 'host.chennai@parkeazy.com', name: 'Senthil Murugan', phone: '+919876500002', role: 'host' },
        { id: '00000000-0000-4000-a000-000000000003', email: 'driver.arun@parkeazy.com', name: 'Arun Kumar', phone: '+919876500003', role: 'customer' }
      ];

      for (const u of users) {
        await client.query(`
          INSERT INTO users (id, tenant_id, email, phone, full_name, is_email_verified, is_phone_verified, status)
          VALUES ($1, 'default', $2, $3, $4, TRUE, TRUE, 'active')
          ON CONFLICT (tenant_id, email) DO UPDATE SET updated_at = NOW();
        `, [u.id, u.email, u.phone, u.name]);

        await client.query(`
          INSERT INTO role_assignments (user_id, tenant_id, role)
          VALUES ($1, 'default', $2)
          ON CONFLICT (user_id, tenant_id, role) DO NOTHING;
        `, [u.id, u.role]);
      }

      // 3. Facilities
      const facilities = [
        {
          id: '10000000-0000-4000-b000-000000000104',
          code: '#FAC-0104',
          name: 'Anna Nagar Plaza Parking',
          addr1: '2nd Avenue, Near Roundtana',
          addr2: 'Anna Nagar East',
          pin: '600102',
          lat: 13.085038,
          lng: 80.210137,
          covered: true,
          is24x7: false,
          spacesCount: 24,
          rate: 40.0
        },
        {
          id: '10000000-0000-4000-b000-000000000208',
          code: '#FAC-0208',
          name: 'T. Nagar Commercial Multi-Level Parking',
          addr1: 'Pondy Bazaar Main Road',
          addr2: 'Opposite Naidu Hall, T. Nagar',
          pin: '600017',
          lat: 13.040520,
          lng: 80.233688,
          covered: true,
          is24x7: true,
          spacesCount: 36,
          rate: 50.0
        },
        {
          id: '10000000-0000-4000-b000-000000000315',
          code: '#FAC-0315',
          name: 'OMR IT Corridor Parking Hub',
          addr1: 'Rajiv Gandhi Salai, Thoraipakkam',
          addr2: 'Near Cognizant & ASV Suntech Park',
          pin: '600097',
          lat: 12.939226,
          lng: 80.234857,
          covered: false,
          is24x7: true,
          spacesCount: 48,
          rate: 35.0
        }
      ];

      let totalSpaces = 0;
      for (const f of facilities) {
        await client.query(`
          INSERT INTO parking_facilities (
            id, tenant_id, host_id, facility_code, name, address_line1, address_line2,
            city, postal_code, latitude, longitude, entrance_instructions, gate_pin_code,
            is_covered, is_24_7, status, amenities
          ) VALUES (
            $1, 'default', '00000000-0000-4000-a000-000000000002', $2, $3, $4, $5,
            'Chennai', $6, $7, $8, 'Scan QR code at entry boom barrier.', '1234',
            $9, $10, 'published', '["CCTV", "EV Charging", "Security Guard"]'::jsonb
          )
          ON CONFLICT (tenant_id, facility_code) DO UPDATE SET updated_at = NOW();
        `, [f.id, f.code, f.name, f.addr1, f.addr2, f.pin, f.lat, f.lng, f.covered, f.is24x7]);

        for (let day = 0; day <= 6; day++) {
          await client.query(`
            INSERT INTO operating_schedules (facility_id, day_of_week, open_time, close_time, is_closed)
            VALUES ($1, $2, '06:00:00', '23:00:00', FALSE)
            ON CONFLICT (facility_id, day_of_week) DO NOTHING;
          `, [f.id, day]);
        }

        for (let i = 1; i <= f.spacesCount; i++) {
          const bay = `A-${String(i).padStart(2, '0')}`;
          const isEv = i <= 4;
          await client.query(`
            INSERT INTO parking_spaces (
              facility_id, tenant_id, bay_identifier, floor_level, vehicle_category,
              has_ev_charger, ev_charger_power_kw, is_disabled_accessible, hourly_rate_inr, is_active
            ) VALUES (
              $1, 'default', $2, 'Ground', 'car', $3, $4, $5, $6, TRUE
            )
            ON CONFLICT (facility_id, bay_identifier) DO UPDATE SET hourly_rate_inr = EXCLUDED.hourly_rate_inr;
          `, [f.id, bay, isEv, isEv ? 22.0 : null, i === 1, f.rate]);
          totalSpaces++;
        }
      }

      await client.query('COMMIT;');
      console.log(`\n✅ Database seed succeeded:`);
      console.log(`   - 1 Default White-Label Tenant (ParkEazy)`);
      console.log(`   - 3 Users (Admin, Host, Customer)`);
      console.log(`   - 3 Chennai Parking Facilities (${facilities.map(f => f.name).join(', ')})`);
      console.log(`   - ${totalSpaces} Parking Bays configured`);
      console.log(`   - 21 Operating Schedule entries\n`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
