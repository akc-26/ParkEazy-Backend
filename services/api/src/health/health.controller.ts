import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}
  @Get()
  getHealth() {
    const db = this.database.getHealthStatus();
    return { status: db.connected ? 'ok' : 'degraded', service: 'parkeazy-backend-api', version: '0.1.0', timestamp: new Date().toISOString(), uptimeSeconds: Math.floor(process.uptime()), environment: process.env.NODE_ENV || 'development', details: { apiPrefix: '/api/v1', plannedDatabase: db.configured ? (db.connected ? 'connected' : 'configured-but-unavailable') : 'not-configured', monorepoMode: true } };
  }
}
