import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

/**
 * Root Application Module for ParkEazy Backend REST API
 *
 * Planned future feature modules (deferred to later phases):
 * - AuthModule: Multi-tenant JWT auth, OTP verification (deferred)
 * - UsersModule: Customer, Host, Admin profiles (deferred)
 * - FacilitiesModule: Parking lots, spatial geocoding (deferred)
 * - SpacesModule: Slot inventory, dimensions, EV tags (deferred)
 * - BookingsModule: Booking state machine, reservations (deferred)
 * - PaymentsModule: Escrow, commission ledger, settlements (deferred)
 * - NotificationsModule: Push alerts, transactional SMS (deferred)
 * - StorageModule: Facility photo upload & CDN delivery (deferred)
 */
@Module({
  imports: [HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
