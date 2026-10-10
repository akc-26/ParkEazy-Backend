import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';

/**
 * Root Application Module for ParkEazy Backend REST API
 *
 * Part 03 Foundations:
 * - HealthModule: Liveness, readiness, and diagnostics
 * - DatabaseModule: PostgreSQL pool lifecycle, configuration, migrations & seeding
 *
 * Planned future feature modules (deferred to later phases):
 * - AuthModule: Multi-tenant JWT auth, OTP verification (Part 04)
 * - UsersModule: Customer, Host, Admin profiles (Part 04)
 * - FacilitiesModule: Parking lots, spatial geocoding (Part 05/06)
 * - SpacesModule: Slot inventory, dimensions, EV tags (Part 05)
 * - BookingsModule: Booking state machine, reservations (Part 07)
 * - PaymentsModule: Escrow, commission ledger, settlements (Part 08)
 */
@Module({
  imports: [HealthModule, DatabaseModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
