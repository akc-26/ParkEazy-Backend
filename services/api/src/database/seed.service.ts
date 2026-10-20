import { Injectable, Logger } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { SEED_TENANT, SEED_USERS, SEED_FACILITIES, SeedSpace } from './seed.data.js';

export interface SeedResult {
  tenant: string;
  usersSeeded: number;
  facilitiesSeeded: number;
  spacesSeeded: number;
  schedulesSeeded: number;
  durationMs: number;
}

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  public async runSeed(pool: Pool): Promise<SeedResult> {
    // Production safety check: Prevent accidental seeding in production
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
      const err = new Error(
        '[SeedService] Refusing to seed database: NODE_ENV is "production". Set ALLOW_PRODUCTION_SEED=true if this was intentional.'
      );
      this.logger.error(err.message);
      throw err;
    }

    const startTime = Date.now();
    const client = await pool.connect();

    try {
      await client.query('BEGIN;');

      // 1. Seed Tenant
      await client.query(
        `INSERT INTO tenants (id, display_name, legal_name, tagline, primary_domain, theme_tokens, assets, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           theme_tokens = EXCLUDED.theme_tokens,
           assets = EXCLUDED.assets,
           updated_at = NOW();`,
        [
          SEED_TENANT.id,
          SEED_TENANT.displayName,
          SEED_TENANT.legal_name,
          SEED_TENANT.tagline,
          SEED_TENANT.primary_domain,
          JSON.stringify(SEED_TENANT.theme_tokens),
          JSON.stringify(SEED_TENANT.assets),
          SEED_TENANT.status,
        ]
      );

      // 2. Seed Users & Role Assignments
      let usersCount = 0;
      for (const u of SEED_USERS) {
        await client.query(
          `INSERT INTO users (id, tenant_id, email, phone, full_name, is_email_verified, is_phone_verified, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           ON CONFLICT (tenant_id, email) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             updated_at = NOW();`,
          [u.id, SEED_TENANT.id, u.email, u.phone, u.fullName, u.isEmailVerified, u.isPhoneVerified]
        );

        await client.query(
          `INSERT INTO role_assignments (user_id, tenant_id, role)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, tenant_id, role) DO NOTHING;`,
          [u.id, SEED_TENANT.id, u.role]
        );
        usersCount++;
      }

      // Find Host User ID
      const hostUser = SEED_USERS.find((u) => u.role === 'host')!;

      // 3. Seed Facilities, Spaces, and Schedules
      let facilitiesCount = 0;
      let spacesCount = 0;
      let schedulesCount = 0;

      for (const f of SEED_FACILITIES) {
        await client.query(
          `INSERT INTO parking_facilities (
             id, tenant_id, host_id, facility_code, name, address_line1, address_line2,
             city, postal_code, latitude, longitude, entrance_instructions, gate_pin_code,
             is_covered, is_24_7, status, amenities
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
           )
           ON CONFLICT (tenant_id, facility_code) DO UPDATE SET
             name = EXCLUDED.name,
             address_line1 = EXCLUDED.address_line1,
             latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             status = EXCLUDED.status,
             amenities = EXCLUDED.amenities,
             updated_at = NOW();`,
          [
            f.id,
            SEED_TENANT.id,
            hostUser.id,
            f.facilityCode,
            f.name,
            f.addressLine1,
            f.addressLine2,
            f.city,
            f.postalCode,
            f.latitude,
            f.longitude,
            f.entranceInstructions,
            f.gatePinCode,
            f.isCovered,
            f.is24x7,
            f.status,
            JSON.stringify(f.amenities),
          ]
        );
        facilitiesCount++;

        // Seed Operating Schedules (Days 0 to 6)
        for (let day = 0; day <= 6; day++) {
          await client.query(
            `INSERT INTO operating_schedules (facility_id, day_of_week, open_time, close_time, is_closed)
             VALUES ($1, $2, $3, $4, FALSE)
             ON CONFLICT (facility_id, day_of_week) DO UPDATE SET
               open_time = EXCLUDED.open_time,
               close_time = EXCLUDED.close_time;`,
            [f.id, day, f.operatingHours.open, f.operatingHours.close]
          );
          schedulesCount++;
        }

        // Seed Spaces
        for (const s of f.spaces as SeedSpace[]) {
          await client.query(
            `INSERT INTO parking_spaces (
               facility_id, tenant_id, bay_identifier, floor_level, vehicle_category,
               has_ev_charger, ev_charger_power_kw, is_disabled_accessible, hourly_rate_inr, is_active
             ) VALUES (
               $1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE
             )
             ON CONFLICT (facility_id, bay_identifier) DO UPDATE SET
               vehicle_category = EXCLUDED.vehicle_category,
               has_ev_charger = EXCLUDED.has_ev_charger,
               ev_charger_power_kw = EXCLUDED.ev_charger_power_kw,
               hourly_rate_inr = EXCLUDED.hourly_rate_inr;`,
            [
              f.id,
              SEED_TENANT.id,
              s.bay,
              s.floor,
              s.category,
              s.hasEv,
              s.evKw ?? null,
              s.accessible,
              s.rate,
            ]
          );
          spacesCount++;
        }
      }

      await client.query('COMMIT;');
      const durationMs = Date.now() - startTime;
      this.logger.log(
        `[SeedService] Seed completed successfully: ${facilitiesCount} facilities, ${spacesCount} spaces, ${usersCount} users in ${durationMs}ms`
      );

      return {
        tenant: SEED_TENANT.displayName,
        usersSeeded: usersCount,
        facilitiesSeeded: facilitiesCount,
        spacesSeeded: spacesCount,
        schedulesSeeded: schedulesCount,
        durationMs,
      };
    } catch (err: any) {
      await client.query('ROLLBACK;');
      this.logger.error(`[SeedService] Seed failed: ${err.message}`);
      throw err;
    } finally {
      client.release();
    }
  }
}
