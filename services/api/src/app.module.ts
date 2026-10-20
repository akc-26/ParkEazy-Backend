import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { FacilitiesModule } from './modules/facilities/facilities.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { BookingsModule } from './modules/bookings/bookings.module.js';
import { PaymentsModule } from './modules/payments/payments.module.js';
import { HostOpsModule } from './modules/host/host.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

/**
 * Root Application Module for ParkEazy Backend REST API
 *
 * Modules:
 * - HealthModule: Liveness, readiness, and diagnostics
 * - DatabaseModule: PostgreSQL pool lifecycle, configuration, migrations & seeding
 * - AuthModule: Multi-tenant JWT auth, OTP challenges, password reset, session lifecycle
 * - UsersModule: Customer & Host profiles, RBAC, KYC verification, vehicles, favorites
 * - FacilitiesModule: Space listings, inventory management, entrance rules & public feed (PH05)
 * - SearchModule: High-performance radius search, autocomplete suggestions & discovery (PH06)
 * - BookingsModule: Booking lifecycle, pricing calculation, holds, check-in/out, receipts
 * - PaymentsModule: Payment methods, transaction initialization & verification
 * - HostOpsModule: Host operations, occupancy, gate operations, earnings ledger & payouts
 * - AdminModule: Platform governance, user/host administration, facility moderation & audit logs
 */
@Module({
  imports: [
    HealthModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    FacilitiesModule,
    SearchModule,
    BookingsModule,
    PaymentsModule,
    HostOpsModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

