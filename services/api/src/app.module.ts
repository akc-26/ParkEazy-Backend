import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { FacilitiesModule } from './modules/facilities/facilities.module.js';

/**
 * Root Application Module for ParkEazy Backend REST API
 *
 * Modules:
 * - HealthModule: Liveness, readiness, and diagnostics
 * - DatabaseModule: PostgreSQL pool lifecycle, configuration, migrations & seeding
 * - AuthModule: Multi-tenant JWT auth, OTP challenges, password reset, session lifecycle
 * - UsersModule: Customer & Host profiles, RBAC, KYC verification
 * - FacilitiesModule: Space listings, inventory management, entrance rules, validation & public feed (PH05)
 */
@Module({
  imports: [HealthModule, DatabaseModule, AuthModule, UsersModule, FacilitiesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
