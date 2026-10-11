import { Controller, Get, Inject } from '@nestjs/common';
import type { HealthCheckResponse } from '@parkeazy/shared-types';
import { HealthService } from './health.service.js';
import type { ExtendedHealthCheckResponse } from './health.service.js';
import type { DatabaseHealthStatus } from '../database/database.service.js';

@Controller()
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  private getService(): HealthService {
    return this.healthService;
  }

  @Get('health')
  getHealth(): ExtendedHealthCheckResponse {
    return this.getService().getHealth();
  }


  @Get('health/ready')
  getReadiness(): { ready: boolean; database: DatabaseHealthStatus } {
    const db = this.getService().getDatabaseHealth();
    return {
      ready: db.connected,
      database: db,
    };
  }

  @Get('health/database')
  getDatabaseHealth(): DatabaseHealthStatus {
    return this.getService().getDatabaseHealth();
  }
}
