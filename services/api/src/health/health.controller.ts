import { Controller, Get } from '@nestjs/common';
import type { HealthCheckResponse } from '@parkeazy/shared-types';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {
    if (!this.healthService) {
      this.healthService = new HealthService();
    }
  }

  @Get('health')
  getHealth(): HealthCheckResponse {
    const service = this.healthService || new HealthService();
    return service.getHealth();
  }
}
