import { Module } from '@nestjs/common';
import { HostOpsController } from './host.controller.js';
import { HostOpsService } from './host.service.js';
import { BookingsModule } from '../bookings/bookings.module.js';
import { FacilitiesModule } from '../facilities/facilities.module.js';

@Module({
  imports: [BookingsModule, FacilitiesModule],
  controllers: [HostOpsController],
  providers: [HostOpsService],
  exports: [HostOpsService],
})
export class HostOpsModule {}
