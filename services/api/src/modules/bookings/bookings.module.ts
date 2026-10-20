import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { FacilitiesModule } from '../facilities/facilities.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [FacilitiesModule, AuthModule],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
