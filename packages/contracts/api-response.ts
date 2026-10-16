/**
 * Standard API Response envelope and error contracts for ParkEazy
 */

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  correlationId: string;
  timestamp: string;
}

export interface ApiErrorDetail {
  field?: string;
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    correlationId: string;
    timestamp: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  activeModules: string[];
}

export interface ReadinessDependencyStatus {
  status: 'up' | 'down' | 'unconfigured';
  latencyMs?: number;
  message?: string;
}

export interface SystemReadinessResponse {
  ready: boolean;
  timestamp: string;
  checks: {
    database: ReadinessDependencyStatus;
    cache: ReadinessDependencyStatus;
    storage: ReadinessDependencyStatus;
    paymentGateways: ReadinessDependencyStatus;
  };
}
