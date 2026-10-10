import { Injectable, Optional } from '@nestjs/common';
import { HealthCheckResponse } from '@parkeazy/shared-types';
import { API_CONFIG } from '@parkeazy/config';
import { DatabaseService, DatabaseHealthStatus } from '../database/database.service';

export interface ExtendedHealthCheckResponse extends HealthCheckResponse {
  details: {
    apiPrefix: string;
    plannedDatabase: string;
    monorepoMode: boolean;
    database?: DatabaseHealthStatus;
  };
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(@Optional() private readonly databaseService?: DatabaseService) {}

  getHealth(): ExtendedHealthCheckResponse {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    const dbHealth: DatabaseHealthStatus = this.databaseService
      ? this.databaseService.getHealthStatus()
      : {
          engine: 'PostgreSQL',
          configured: false,
          connected: false,
        };

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
        database: dbHealth,
      },
    };
  }

  getDatabaseHealth(): DatabaseHealthStatus {
    if (this.databaseService) {
      return this.databaseService.getHealthStatus();
    }
    return {
      engine: 'PostgreSQL',
      configured: false,
      connected: false,
      error: 'DatabaseService not available',
    };
  }
}
