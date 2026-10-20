import { HealthCheckResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from './client';

export class HealthApiClient {
  private client: ParkEazyApiClient;

  constructor(client?: ParkEazyApiClient) {
    this.client = client || new ParkEazyApiClient();
  }

  /**
   * Fetches health status from NestJS backend
   * Supports both direct /health endpoint and prefixed /api/v1/health
   */
  public async checkHealth(): Promise<HealthCheckResponse> {
    try {
      return await this.client.get<HealthCheckResponse>('/health');
    } catch {
      // Direct root fallback if called without prefix
      const rootClient = new ParkEazyApiClient({
        baseUrl: this.client.getBaseUrl().replace(/\/api\/v1\/?$/, ''),
      });
      return await rootClient.get<HealthCheckResponse>('/health');
    }
  }

  /**
   * Generates a baseline health response for offline dev / client preview mode
   */
  public getOfflineHealthSnapshot(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'parkeazy-backend-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 0,
      environment: 'development-offline-scaffold',
      details: {
        apiPrefix: '/api/v1',
        plannedDatabase: 'PostgreSQL',
        monorepoMode: true,
      },
    };
  }
}
