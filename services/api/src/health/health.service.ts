import { Injectable } from '@nestjs/common';
import { HealthCheckResponse } from '@parkeazy/shared-types';
import { API_CONFIG } from '@parkeazy/config';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  getHealth(): HealthCheckResponse {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'ok',
      service: API_CONFIG.serviceName,
      version: API_CONFIG.version,
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      environment: process.env.NODE_ENV || 'development',
      details: {
        apiPrefix: API_CONFIG.prefix,
        plannedDatabase: 'PostgreSQL',
        monorepoMode: true,
      },
    };
  }
}
