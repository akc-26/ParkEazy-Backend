import { Module } from '@nestjs/common';
import { FacilitiesController } from './facilities.controller.js';
import { FacilitiesService } from './facilities.service.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [FacilitiesController],
  providers: [FacilitiesService],
  exports: [FacilitiesService],
})
export class FacilitiesModule {}
