import { Controller, Get, Optional } from '@nestjs/common';
import type { HealthCheckResponse } from '@parkeazy/shared-types';
import { HealthService } from './health.service';
import type { ExtendedHealthCheckResponse } from './health.service';
import type { DatabaseHealthStatus } from '../database/database.service';

@Controller()
export class HealthController {
  constructor(@Optional() private readonly healthService?: HealthService) {}

  private getService(): HealthService {
    return this.healthService || new HealthService();
  }

  @Get('health')
  getHealth(): ExtendedHealthCheckResponse {
    return this.getService().getHealth();
  }

  @Get('api/v1/health')
  getApiV1Health(): ExtendedHealthCheckResponse {
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

  @Get('api/v1/health/database')
  getDatabaseHealth(): DatabaseHealthStatus {
    return this.getService().getDatabaseHealth();
  }
}
