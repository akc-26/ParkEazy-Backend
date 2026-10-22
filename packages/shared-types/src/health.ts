export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  details?: {
    apiPrefix: string;
    plannedDatabase: string;
    monorepoMode: boolean;
  };
}
