import {
  ApiResponse,
  SystemHealthResponse,
  SystemReadinessResponse,
  SessionUser,
  LoginResponse,
  ParkingLocation,
  ParkingBay,
  BookingSummary,
  BookingHold,
  ConfirmBookingRequest,
  LedgerEntry,
  HostEarningsSummary,
} from '../contracts';

export class ApiError extends Error {
  public code: string;
  public details?: any[];
  public correlationId: string;
  public timestamp: string;

  constructor(message: string, code: string, correlationId: string, timestamp: string, details?: any[]) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.correlationId = correlationId;
    this.timestamp = timestamp;
    this.details = details;
  }
}

export class ParkEazyApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl = '/api/v1') {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem('parkeazy_auth_token');
        if (stored) {
          this.authToken = stored;
        }
      } catch {
        // Ignore localStorage access errors (e.g., in strict security environments)
      }
    }
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public setAuthToken(token: string | null) {
    this.authToken = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (token) {
          window.localStorage.setItem('parkeazy_auth_token', token);
        } else {
          window.localStorage.removeItem('parkeazy_auth_token');
        }
      } catch {
        // Ignore localStorage access errors
      }
    }
  }

  private generateCorrelationId(): string {
    return 'req-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const correlationId = this.generateCorrelationId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-Id': correlationId,
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const json: ApiResponse<T> = await response.json();

      if (!response.ok || !json.success) {
        if (response.status === 401) {
          this.setAuthToken(null);
        }
        if ('data' in json && (json as any).data) {
          return (json as any).data as T;
        }
        if ('error' in json) {
          throw new ApiError(
            json.error.message || 'API request failed',
            json.error.code || 'UNKNOWN_ERROR',
            json.error.correlationId || correlationId,
            json.error.timestamp || new Date().toISOString(),
            json.error.details
          );
        }
        throw new ApiError(
          `Request failed with HTTP status ${response.status}`,
          'HTTP_ERROR',
          correlationId,
          new Date().toISOString()
        );
      }

      return json.data;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(
        err.message || 'Network connection failed',
        'NETWORK_FAILURE',
        correlationId,
        new Date().toISOString()
      );
    }
  }

  // System & Health Endpoints
  public async getHealth(): Promise<SystemHealthResponse> {
    return this.request<SystemHealthResponse>('/health');
  }

  public async getReadiness(): Promise<SystemReadinessResponse> {
    return this.request<SystemReadinessResponse>('/readiness');
  }

  public async getOpenApiSpec(): Promise<any> {
    return this.request<any>('/docs');
  }

  // Auth Endpoints
  public async login(email: string, password?: string, requestedPortal?: 'user' | 'host' | 'admin'): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, requestedPortal }),
    });
    this.setAuthToken(response.token);
    return response;
  }

  public async getSession(): Promise<{ user: SessionUser | null }> {
    return this.request<{ user: SessionUser | null }>('/auth/session');
  }

  // Inventory Endpoints
  public async getLocations(): Promise<ParkingLocation[]> {
    return this.request<ParkingLocation[]>('/inventory/locations');
  }

  public async getLocation(locationId: string): Promise<ParkingLocation> {
    return this.request<ParkingLocation>(`/inventory/locations/${locationId}`);
  }

  public async getBays(locationId: string): Promise<ParkingBay[]> {
    return this.request<ParkingBay[]>(`/inventory/locations/${locationId}/bays`);
  }

  // Booking Endpoints
  public async getBookingRules(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('/bookings/rules');
  }

  public async getBookings(): Promise<BookingSummary[]> {
    return this.request<BookingSummary[]>('/bookings');
  }

  public async getBooking(bookingId: string): Promise<BookingSummary> {
    return this.request<BookingSummary>(`/bookings/${bookingId}`);
  }

  public async createHold(params: { bayId: string; locationId: string; durationMinutes: number }): Promise<BookingHold> {
    return this.request<BookingHold>('/bookings/hold', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async getHold(holdId: string): Promise<BookingHold> {
    return this.request<BookingHold>(`/bookings/hold/${holdId}`);
  }

  public async confirmBooking(params: ConfirmBookingRequest): Promise<BookingSummary> {
    return this.request<BookingSummary>('/bookings', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Payment Endpoints
  public async createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    bookingId: string;
    idempotencyKey: string;
    provider?: string;
  }): Promise<any> {
    return this.request<any>('/payments/intent', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  public async getPaymentStatus(transactionId: string): Promise<any> {
    return this.request<any>(`/payments/intent/${transactionId}`);
  }

  // Host & Admin Endpoints
  public async getHostEarnings(hostId: string): Promise<HostEarningsSummary> {
    return this.request<HostEarningsSummary>(`/hosts/${hostId}/earnings`);
  }

  public async getLedgerEntries(): Promise<LedgerEntry[]> {
    return this.request<LedgerEntry[]>('/admin/ledger');
  }

  public async getAuditLogs(): Promise<any[]> {
    return this.request<any[]>('/admin/audit/logs');
  }

  // Admin Settings & Integrations Endpoints
  public async getIntegrations(): Promise<any[]> {
    return this.request<any[]>('/admin/integrations');
  }

  public async getActiveGateway(): Promise<any> {
    return this.request<any>('/admin/integrations/active-gateway');
  }

  public async setActiveGateway(provider: string): Promise<any> {
    return this.request<any>('/admin/integrations/active-gateway', {
      method: 'PUT',
      body: JSON.stringify({ provider }),
    });
  }

  public async updateIntegration(id: string, dto: any): Promise<any> {
    return this.request<any>(`/admin/integrations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  public async testIntegration(id: string): Promise<any> {
    return this.request<any>(`/admin/integrations/${id}/test`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ParkEazyApiClient();
