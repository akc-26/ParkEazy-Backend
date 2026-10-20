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
  CustomerVehicle,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  ChangePasswordRequest,
  NotificationPreferences,
  HostRegisterRequest,
  HostRegisterResponse,
  VerificationStatusResponse,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  HostOnboardingProfile,
  UpdateHostOnboardingRequest,
  CreateFacilityRequest,
  UpdateFacilityRequest,
  CreateBayRequest,
  UpdateBayRequest,
  FacilityPublicationValidation,
  PublishFacilityResponse,
  FacilityPhoto,
  RatePlan,
  CreateRatePlanRequest,
  UpdateRatePlanRequest,
  FacilityOperatingDay,
  PricingPolicy,
  UpdatePricingPolicyRequest,
  FacilityClosure,
  CreateFacilityClosureRequest,
  PriceEstimateRequest,
  PriceEstimateResponse,
  BulkPriceUpdateRequest,
  BulkPriceUpdatePreviewResponse,
  PricingConflict,
  PricingAuditRecord,
  RecurringAvailabilitySchedule,
  AvailabilityOverride,
  MaintenanceBlock,
  CreateMaintenanceBlockRequest,
  CalendarEvent,
  SpaceAvailabilitySummary,
  ValidateAvailabilityChangeRequest,
  ValidateAvailabilityChangeResponse,
} from '../contracts';

export class ApiError extends Error {
  public code: string;
  public details?: any[];
  public correlationId: string;
  public timestamp: string;
  public statusCode?: number;
  public status?: number;

  constructor(
    message: string,
    code: string,
    correlationId: string,
    timestamp: string,
    details?: any[],
    statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.correlationId = correlationId;
    this.timestamp = timestamp;
    this.details = details;
    this.statusCode = statusCode;
    this.status = statusCode;
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
            json.error.details,
            response.status
          );
        }
        throw new ApiError(
          `Request failed with HTTP status ${response.status}`,
          'HTTP_ERROR',
          correlationId,
          new Date().toISOString(),
          undefined,
          response.status
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

  public async getProfile(): Promise<SessionUser> {
    return this.request<SessionUser>('/users/profile');
  }

  public async updateProfile(data: { firstName?: string; lastName?: string; phoneNumber?: string }): Promise<SessionUser> {
    return this.request<SessionUser>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Host & Unified Registration & Verification Endpoints
  public async register(data: HostRegisterRequest): Promise<HostRegisterResponse> {
    const response = await this.request<HostRegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.token) {
      this.setAuthToken(response.token);
    }
    return response;
  }

  public async getVerificationStatus(): Promise<VerificationStatusResponse> {
    return this.request<VerificationStatusResponse>('/auth/verification-status');
  }

  public async verifyCode(
    code: string,
    type: 'EMAIL' | 'SMS' = 'EMAIL'
  ): Promise<{ success: boolean; message: string; user: SessionUser }> {
    return this.request<{ success: boolean; message: string; user: SessionUser }>('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code, type }),
    });
  }

  public async resendVerificationCode(
    type: 'EMAIL' | 'SMS' = 'EMAIL'
  ): Promise<{ success: boolean; message: string; target: string; code?: string }> {
    return this.request<{ success: boolean; message: string; target: string; code?: string }>(
      '/auth/resend-code',
      {
        method: 'POST',
        body: JSON.stringify({ type }),
      }
    );
  }

  public async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    return this.request<ForgotPasswordResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getHostOnboarding(hostId: string): Promise<HostOnboardingProfile> {
    return this.request<HostOnboardingProfile>(`/hosts/${hostId}/onboarding`);
  }

  public async updateHostOnboarding(
    hostId: string,
    data: UpdateHostOnboardingRequest
  ): Promise<HostOnboardingProfile> {
    return this.request<HostOnboardingProfile>(`/hosts/${hostId}/onboarding`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async submitHostOnboarding(hostId: string): Promise<HostOnboardingProfile> {
    return this.request<HostOnboardingProfile>(`/hosts/${hostId}/onboarding/submit`, {
      method: 'POST',
    });
  }

  // Customer Account Features
  public async getVehicles(): Promise<CustomerVehicle[]> {
    return this.request<CustomerVehicle[]>('/users/vehicles');
  }

  public async addVehicle(data: CreateVehicleRequest): Promise<CustomerVehicle> {
    return this.request<CustomerVehicle>('/users/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateVehicle(vehicleId: string, data: UpdateVehicleRequest): Promise<CustomerVehicle> {
    return this.request<CustomerVehicle>(`/users/vehicles/${vehicleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteVehicle(vehicleId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
  }

  public async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getNotificationPreferences(): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/users/notifications/preferences');
  }

  public async updateNotificationPreferences(data: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/users/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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

  // Host Facility & Inventory Management (Phase 2)
  public async getHostFacilities(hostId: string): Promise<ParkingLocation[]> {
    return this.request<ParkingLocation[]>(`/hosts/${hostId}/facilities`);
  }

  public async getHostFacility(hostId: string, facilityId: string): Promise<ParkingLocation> {
    return this.request<ParkingLocation>(`/hosts/${hostId}/facilities/${facilityId}`);
  }

  public async createHostFacility(hostId: string, data: CreateFacilityRequest): Promise<ParkingLocation> {
    return this.request<ParkingLocation>(`/hosts/${hostId}/facilities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateHostFacility(
    hostId: string,
    facilityId: string,
    data: UpdateFacilityRequest
  ): Promise<ParkingLocation> {
    return this.request<ParkingLocation>(`/hosts/${hostId}/facilities/${facilityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteHostFacility(hostId: string, facilityId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/hosts/${hostId}/facilities/${facilityId}`, {
      method: 'DELETE',
    });
  }

  public async getHostSpaces(hostId: string, facilityId: string): Promise<ParkingBay[]> {
    return this.request<ParkingBay[]>(`/hosts/${hostId}/facilities/${facilityId}/spaces`);
  }

  public async getHostFacilityBays(hostId: string, facilityId: string): Promise<ParkingBay[]> {
    return this.getHostSpaces(hostId, facilityId);
  }

  public async getHostSpace(hostId: string, facilityId: string, spaceId: string): Promise<ParkingBay> {
    return this.request<ParkingBay>(`/hosts/${hostId}/facilities/${facilityId}/spaces/${spaceId}`);
  }

  public async createHostSpace(
    hostId: string,
    facilityId: string,
    data: CreateBayRequest
  ): Promise<ParkingBay> {
    return this.request<ParkingBay>(`/hosts/${hostId}/facilities/${facilityId}/spaces`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateHostSpace(
    hostId: string,
    facilityId: string,
    spaceId: string,
    data: UpdateBayRequest
  ): Promise<ParkingBay> {
    return this.request<ParkingBay>(`/hosts/${hostId}/facilities/${facilityId}/spaces/${spaceId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  public async deleteHostSpace(
    hostId: string,
    facilityId: string,
    spaceId: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/hosts/${hostId}/facilities/${facilityId}/spaces/${spaceId}`, {
      method: 'DELETE',
    });
  }

  public async getPublicationReadiness(
    hostId: string,
    facilityId: string
  ): Promise<FacilityPublicationValidation> {
    return this.request<FacilityPublicationValidation>(
      `/hosts/${hostId}/facilities/${facilityId}/publish-readiness`
    );
  }

  public async publishHostFacility(
    hostId: string,
    facilityId: string
  ): Promise<PublishFacilityResponse> {
    return this.request<PublishFacilityResponse>(`/hosts/${hostId}/facilities/${facilityId}/publish`, {
      method: 'POST',
    });
  }

  public async unpublishHostFacility(
    hostId: string,
    facilityId: string
  ): Promise<ParkingLocation> {
    return this.request<ParkingLocation>(`/hosts/${hostId}/facilities/${facilityId}/unpublish`, {
      method: 'POST',
    });
  }

  public async addFacilityPhoto(
    hostId: string,
    facilityId: string,
    photo: Partial<FacilityPhoto>
  ): Promise<ParkingLocation> {
    return this.request<ParkingLocation>(`/hosts/${hostId}/facilities/${facilityId}/photos`, {
      method: 'POST',
      body: JSON.stringify(photo),
    });
  }

  public async deleteFacilityPhoto(
    hostId: string,
    facilityId: string,
    photoId: string
  ): Promise<ParkingLocation> {
    return this.request<ParkingLocation>(`/hosts/${hostId}/facilities/${facilityId}/photos/${photoId}`, {
      method: 'DELETE',
    });
  }

  public async uploadMedia(data: {
    name: string;
    type?: string;
    base64?: string;
    dataUrl?: string;
  }): Promise<{ id: string; url: string; mimeType: string; sizeBytes: number; filename: string }> {
    return this.request<{ id: string; url: string; mimeType: string; sizeBytes: number; filename: string }>(
      '/media/upload',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
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

  public async cancelBooking(bookingId: string, idempotencyKey?: string): Promise<BookingSummary> {
    return this.request<BookingSummary>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey }),
    });
  }

  public async checkInBooking(bookingId: string): Promise<BookingSummary> {
    return this.request<BookingSummary>(`/bookings/${bookingId}/check-in`, {
      method: 'POST',
    });
  }

  public async checkOutBooking(bookingId: string): Promise<BookingSummary> {
    return this.request<BookingSummary>(`/bookings/${bookingId}/check-out`, {
      method: 'POST',
    });
  }

  public async extendBooking(
    bookingId: string,
    additionalMinutes: number,
    paymentIntentId?: string
  ): Promise<BookingSummary> {
    return this.request<BookingSummary>(`/bookings/${bookingId}/extend`, {
      method: 'POST',
      body: JSON.stringify({ additionalMinutes, paymentIntentId }),
    });
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

  public async getIntegration(id: string): Promise<any> {
    return this.request<any>(`/admin/integrations/${id}`);
  }

  public async getIntegrationAuditHistory(id?: string): Promise<any[]> {
    const endpoint = id ? `/admin/integrations/${id}/audit-history` : '/admin/integrations/audit-history';
    return this.request<any[]>(endpoint);
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

  // --------------------------------------------------------------------------
  // HP-05 Pricing & Policies Client Methods
  // --------------------------------------------------------------------------

  public async getPricingOverview(hostId: string): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/pricing/overview`);
  }

  public async getRatePlans(hostId: string, facilityId?: string): Promise<RatePlan[]> {
    const query = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
    return this.request<RatePlan[]>(`/hosts/${hostId}/pricing/rates${query}`);
  }

  public async getRatePlan(hostId: string, rateId: string): Promise<RatePlan> {
    return this.request<RatePlan>(`/hosts/${hostId}/pricing/rates/${rateId}`);
  }

  public async createRatePlan(hostId: string, req: CreateRatePlanRequest): Promise<RatePlan> {
    return this.request<RatePlan>(`/hosts/${hostId}/pricing/rates`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async updateRatePlan(
    hostId: string,
    rateId: string,
    req: UpdateRatePlanRequest
  ): Promise<RatePlan> {
    return this.request<RatePlan>(`/hosts/${hostId}/pricing/rates/${rateId}`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  }

  public async deactivateRatePlan(hostId: string, rateId: string): Promise<RatePlan> {
    return this.request<RatePlan>(`/hosts/${hostId}/pricing/rates/${rateId}`, {
      method: 'DELETE',
    });
  }

  public async getOperatingHours(hostId: string, facilityId: string): Promise<FacilityOperatingDay[]> {
    return this.request<FacilityOperatingDay[]>(`/hosts/${hostId}/pricing/schedule/${facilityId}`);
  }

  public async updateOperatingHours(
    hostId: string,
    facilityId: string,
    schedule: FacilityOperatingDay[]
  ): Promise<FacilityOperatingDay[]> {
    return this.request<FacilityOperatingDay[]>(`/hosts/${hostId}/pricing/schedule`, {
      method: 'PUT',
      body: JSON.stringify({ facilityId, schedule }),
    });
  }

  public async getPricingPolicy(hostId: string, facilityId: string): Promise<PricingPolicy> {
    return this.request<PricingPolicy>(`/hosts/${hostId}/pricing/policies/${facilityId}`);
  }

  public async updatePricingPolicy(
    hostId: string,
    req: UpdatePricingPolicyRequest
  ): Promise<PricingPolicy> {
    return this.request<PricingPolicy>(`/hosts/${hostId}/pricing/policies`, {
      method: 'PUT',
      body: JSON.stringify(req),
    });
  }

  public async getClosures(hostId: string, facilityId?: string): Promise<FacilityClosure[]> {
    const query = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
    return this.request<FacilityClosure[]>(`/hosts/${hostId}/pricing/closures${query}`);
  }

  public async createClosure(
    hostId: string,
    req: CreateFacilityClosureRequest
  ): Promise<FacilityClosure> {
    return this.request<FacilityClosure>(`/hosts/${hostId}/pricing/closures`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async removeClosure(hostId: string, closureId: string): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/pricing/closures/${closureId}`, {
      method: 'DELETE',
    });
  }

  public async calculateEstimate(
    hostId: string,
    req: PriceEstimateRequest
  ): Promise<PriceEstimateResponse> {
    return this.request<PriceEstimateResponse>(`/hosts/${hostId}/pricing/estimate`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async previewBulkPricing(
    hostId: string,
    req: BulkPriceUpdateRequest
  ): Promise<BulkPriceUpdatePreviewResponse> {
    return this.request<BulkPriceUpdatePreviewResponse>(`/hosts/${hostId}/pricing/bulk/preview`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async applyBulkPricing(
    hostId: string,
    req: BulkPriceUpdateRequest
  ): Promise<{ appliedCount: number; message: string }> {
    return this.request<{ appliedCount: number; message: string }>(
      `/hosts/${hostId}/pricing/bulk/apply`,
      {
        method: 'POST',
        body: JSON.stringify(req),
      }
    );
  }

  public async getPricingConflicts(hostId: string): Promise<PricingConflict[]> {
    return this.request<PricingConflict[]>(`/hosts/${hostId}/pricing/conflicts`);
  }

  public async getPricingHistory(hostId: string): Promise<PricingAuditRecord[]> {
    return this.request<PricingAuditRecord[]>(`/hosts/${hostId}/pricing/history`);
  }

  // --------------------------------------------------------------------------
  // HP-06 Availability & Calendar Client Methods
  // --------------------------------------------------------------------------

  public async getSpaceAvailability(
    hostId: string,
    facilityId: string,
    startTimeUtc: string,
    endTimeUtc: string,
    spaceId?: string
  ): Promise<SpaceAvailabilitySummary> {
    let url = `/hosts/${hostId}/availability?facilityId=${encodeURIComponent(facilityId)}&startTimeUtc=${encodeURIComponent(startTimeUtc)}&endTimeUtc=${encodeURIComponent(endTimeUtc)}`;
    if (spaceId) url += `&spaceId=${encodeURIComponent(spaceId)}`;
    return this.request<SpaceAvailabilitySummary>(url);
  }

  public async getCalendarEvents(
    hostId: string,
    facilityId: string,
    startRangeUtc?: string,
    endRangeUtc?: string,
    spaceId?: string
  ): Promise<CalendarEvent[]> {
    let url = `/hosts/${hostId}/availability/calendar?facilityId=${encodeURIComponent(facilityId)}`;
    if (startRangeUtc) url += `&startRangeUtc=${encodeURIComponent(startRangeUtc)}`;
    if (endRangeUtc) url += `&endRangeUtc=${encodeURIComponent(endRangeUtc)}`;
    if (spaceId) url += `&spaceId=${encodeURIComponent(spaceId)}`;
    return this.request<CalendarEvent[]>(url);
  }

  public async getRecurringSchedules(
    hostId: string,
    facilityId: string
  ): Promise<RecurringAvailabilitySchedule[]> {
    return this.request<RecurringAvailabilitySchedule[]>(
      `/hosts/${hostId}/availability/schedules/${facilityId}`
    );
  }

  public async setRecurringSchedules(
    hostId: string,
    facilityId: string,
    schedules: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      spaceId?: string;
    }>
  ): Promise<RecurringAvailabilitySchedule[]> {
    return this.request<RecurringAvailabilitySchedule[]>(
      `/hosts/${hostId}/availability/schedules`,
      {
        method: 'POST',
        body: JSON.stringify({ facilityId, schedules }),
      }
    );
  }

  public async getDateOverrides(
    hostId: string,
    facilityId: string
  ): Promise<AvailabilityOverride[]> {
    return this.request<AvailabilityOverride[]>(
      `/hosts/${hostId}/availability/overrides/${facilityId}`
    );
  }

  public async createDateOverride(
    hostId: string,
    data: {
      facilityId: string;
      spaceId?: string;
      date: string;
      isAvailable: boolean;
      startTime?: string;
      endTime?: string;
      reason: string;
    }
  ): Promise<AvailabilityOverride> {
    return this.request<AvailabilityOverride>(`/hosts/${hostId}/availability/overrides`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async removeDateOverride(hostId: string, overrideId: string): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/availability/overrides/${overrideId}`, {
      method: 'DELETE',
    });
  }

  public async getMaintenanceBlocks(
    hostId: string,
    facilityId?: string
  ): Promise<MaintenanceBlock[]> {
    const query = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
    return this.request<MaintenanceBlock[]>(`/hosts/${hostId}/availability/blocks${query}`);
  }

  public async createMaintenanceBlock(
    hostId: string,
    req: CreateMaintenanceBlockRequest
  ): Promise<MaintenanceBlock> {
    return this.request<MaintenanceBlock>(`/hosts/${hostId}/availability/blocks`, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  public async removeMaintenanceBlock(hostId: string, blockId: string): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/availability/blocks/${blockId}`, {
      method: 'DELETE',
    });
  }

  public async validateAvailabilityChange(
    hostId: string,
    req: ValidateAvailabilityChangeRequest
  ): Promise<ValidateAvailabilityChangeResponse> {
    return this.request<ValidateAvailabilityChangeResponse>(
      `/hosts/${hostId}/availability/validate`,
      {
        method: 'POST',
        body: JSON.stringify(req),
      }
    );
  }

  // --------------------------------------------------------------------------
  // Host Operations & Workflows Client Methods
  // --------------------------------------------------------------------------

  public async getHostExtensionRequests(hostId: string): Promise<any[]> {
    return this.request<any[]>(`/hosts/${hostId}/extension-requests`);
  }

  public async decideExtensionRequest(
    hostId: string,
    requestId: string,
    decision: 'APPROVE' | 'REJECT',
    notes?: string
  ): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/extension-requests/${requestId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    });
  }

  public async requestBookingExtension(bookingId: string, additionalHours: number): Promise<any> {
    return this.request<any>(`/bookings/${bookingId}/extension-request`, {
      method: 'POST',
      body: JSON.stringify({ additionalHours }),
    });
  }

  public async getHostPayoutMethods(hostId: string): Promise<any[]> {
    return this.request<any[]>(`/hosts/${hostId}/payout-methods`);
  }

  public async saveHostPayoutMethod(
    hostId: string,
    data: { beneficiaryName: string; bankName: string; routingNumber?: string; accountNumber: string }
  ): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/payout-methods`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async getHostPayouts(hostId: string): Promise<{ earnings: any; records: any[] }> {
    return this.request<{ earnings: any; records: any[] }>(`/hosts/${hostId}/payouts`);
  }

  public async requestHostPayout(hostId: string, amountCents: number): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/payouts`, {
      method: 'POST',
      body: JSON.stringify({ amountCents }),
    });
  }

  public async getHostReviews(hostId: string): Promise<any[]> {
    return this.request<any[]>(`/hosts/${hostId}/reviews`);
  }

  public async replyToReview(hostId: string, reviewId: string, reply: string): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    });
  }

  public async getHostNotifications(hostId: string): Promise<any[]> {
    return this.request<any[]>(`/hosts/${hostId}/notifications`);
  }

  public async markNotificationRead(hostId: string, notificationId: string): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  public async markAllNotificationsRead(hostId: string): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/notifications/read-all`, {
      method: 'POST',
    });
  }

  public async getHostDisputes(hostId: string): Promise<any[]> {
    return this.request<any[]>(`/hosts/${hostId}/disputes`);
  }

  public async createHostDispute(
    hostId: string,
    data: { category: string; description: string; bookingId?: string; facilityId?: string }
  ): Promise<any> {
    return this.request<any>(`/hosts/${hostId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async bulkCreateSpaces(
    facilityId: string,
    hostId: string,
    bays: CreateBayRequest[]
  ): Promise<ParkingBay[]> {
    return this.request<ParkingBay[]>(`/hosts/${hostId}/facilities/${facilityId}/spaces/bulk`, {
      method: 'POST',
      body: JSON.stringify({ bays }),
    });
  }
}

export const apiClient = new ParkEazyApiClient();
