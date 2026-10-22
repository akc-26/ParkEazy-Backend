import { API_CONFIG } from '@parkeazy/config';
import {
  LoginCredentials,
  SignupPayload,
  OtpChallengeRequest,
  OtpChallengeResponse,
  VerifyOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthUserResponse,
  UserAccount,
  HostProfile,
  HostKycSubmissionPayload,
  AuthTokenPair,
  ParkingFacility,
  ParkingSpace,
  CreateFacilityPayload,
  UpdateFacilityPayload,
  CreateSpacePayload,
  BulkCreateSpacesPayload,
  UpdateSpacePayload,
  PublicationReadinessResult,
  PublicListingSummary,
  SpaceStatus,
  SearchQueryPayload,
  SearchResponse,
  LocationSuggestion,
  ExploreCatalogHub,
  FallbackSuggestionsResponse,
  Booking,
  BookingDetailsResponse,
  ReservationHold,
  PricingCalculationResult,
  CreateBookingPayload,
  TaxInvoiceReceipt,
  HostEarningsSummary,
  AdminPlatformOverview,
  UserVehicle,
  PaymentTransaction,
  HostSettlement,
  CancelPreviewResponse,
  BookingOverstayRecord,
  BookingSupportTicket,
  AlternativeSpaceSuggestion,
} from '@parkeazy/shared-types';

export interface ApiClientOptions {
  baseUrl?: string;
  tenantId?: string;
  timeoutMs?: number;
  initialToken?: string;
}

export class ParkEazyApiClient {
  private baseUrl: string;
  private tenantId: string;
  private timeoutMs: number;
  private accessToken: string | null = null;

  constructor(options: ApiClientOptions = {}) {
    const envUrl = typeof process !== 'undefined' && (process.env?.VITE_API_URL || process.env?.REACT_APP_API_URL);
    this.baseUrl = options.baseUrl || envUrl || `http://${API_CONFIG.defaultHost}:${API_CONFIG.defaultPort}${API_CONFIG.prefix}`;
    this.tenantId = options.tenantId || 'default';
    this.timeoutMs = options.timeoutMs || 8000;
    this.accessToken = options.initialToken || this.readStoredToken();
  }

  private readStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const pathname = window.location.pathname;
      const key = pathname.startsWith('/host')
        ? 'parkeazy_host_token'
        : pathname.startsWith('/admin')
          ? 'parkeazy_admin_token'
          : 'parkeazy_customer_token';
      return window.localStorage.getItem(key);
    } catch {
      // Storage may be disabled by browser privacy settings; callers can still pass initialToken.
      return null;
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  public getTenantId(): string {
    return this.tenantId;
  }

  public setTenantId(tenantId: string): void {
    this.tenantId = tenantId;
  }

  public setToken(token: string | null): void {
    this.accessToken = token;
  }

  public getToken(): string | null {
    return this.accessToken;
  }

  public clearToken(): void {
    this.accessToken = null;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': this.tenantId,
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  public async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: this.buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorBody: any;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { message: response.statusText };
        }
        const errorMsg = errorBody.error?.message || errorBody.message || `API HTTP Error: ${response.status} ${response.statusText}`;
        const err = new Error(errorMsg);
        (err as any).statusCode = response.status;
        (err as any).body = errorBody;
        throw err;
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  public async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  public async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  public async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  public async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  public async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  // --- Auth Subsystem Endpoints ---
  public readonly auth = {
    login: async (credentials: LoginCredentials): Promise<AuthUserResponse> => {
      const res = await this.post<{ data: AuthUserResponse }>('/auth/login', credentials);
      const data = res.data || (res as unknown as AuthUserResponse);
      if (data.tokens?.accessToken) {
        this.setToken(data.tokens.accessToken);
      }
      return data;
    },

    register: async (payload: SignupPayload): Promise<AuthUserResponse> => {
      const res = await this.post<{ data: AuthUserResponse }>('/auth/register', payload);
      const data = res.data || (res as unknown as AuthUserResponse);
      if (data.tokens?.accessToken) {
        this.setToken(data.tokens.accessToken);
      }
      return data;
    },

    sendOtp: async (req: OtpChallengeRequest): Promise<OtpChallengeResponse> => {
      const res = await this.post<{ data: OtpChallengeResponse }>('/auth/otp/send', req);
      return res.data || (res as unknown as OtpChallengeResponse);
    },

    verifyOtp: async (req: VerifyOtpRequest): Promise<AuthUserResponse> => {
      const res = await this.post<{ data: AuthUserResponse }>('/auth/otp/verify', req);
      const data = res.data || (res as unknown as AuthUserResponse);
      if (data.tokens?.accessToken) {
        this.setToken(data.tokens.accessToken);
      }
      return data;
    },

    refreshToken: async (refreshToken: string): Promise<AuthTokenPair> => {
      const res = await this.post<{ data: AuthTokenPair }>('/auth/refresh', { refreshToken });
      const data = res.data || (res as unknown as AuthTokenPair);
      if (data.accessToken) {
        this.setToken(data.accessToken);
      }
      return data;
    },

    logout: async (): Promise<{ success: boolean }> => {
      try {
        await this.post('/auth/logout');
      } finally {
        this.clearToken();
      }
      return { success: true };
    },

    forgotPassword: async (req: ForgotPasswordRequest): Promise<{ success: boolean; message: string; resetToken?: string }> => {
      const res = await this.post<{ data: { success: boolean; message: string; resetToken?: string } }>('/auth/forgot-password', req);
      return res.data || (res as any);
    },

    resetPassword: async (req: ResetPasswordRequest): Promise<{ success: boolean; message: string }> => {
      const res = await this.post<{ data: { success: boolean; message: string } }>('/auth/reset-password', req);
      return res.data || (res as any);
    },

    getMe: async (): Promise<UserAccount & { hostProfile?: HostProfile }> => {
      const res = await this.get<{ data: UserAccount & { hostProfile?: HostProfile } }>('/auth/me');
      return res.data || (res as any);
    },

    me: async (): Promise<UserAccount & { hostProfile?: HostProfile }> => {
      const res = await this.get<{ data: UserAccount & { hostProfile?: HostProfile } }>('/auth/me');
      return res.data || (res as any);
    },
  };

  // --- Users & Profiles Endpoints ---
  public readonly users = {
    getProfile: async (): Promise<UserAccount> => {
      const res = await this.get<{ data: UserAccount }>('/users/profile');
      return res.data || (res as any);
    },

    getHostProfile: async (): Promise<HostProfile | null> => {
      const res = await this.get<{ data: HostProfile | null }>('/users/host-profile');
      return res.data || (res as any);
    },

    updateHostProfile: async (payload: Partial<HostKycSubmissionPayload>): Promise<HostProfile> => {
      const res = await this.put<{ data: HostProfile }>('/users/host-profile', payload);
      return res.data || (res as any);
    },

    submitHostKyc: async (payload: HostKycSubmissionPayload): Promise<HostProfile> => {
      const res = await this.post<{ data: HostProfile }>('/users/host-kyc/submit', payload);
      return res.data || (res as any);
    },

    updateProfile: async (payload: Partial<UserAccount>): Promise<UserAccount> => {
      const res = await this.put<{ data: UserAccount }>('/users/profile', payload);
      return res.data || (res as any);
    },
  };

  // --- Facilities Subsystem (PH05) ---
  public readonly facilities = {
    list: async (): Promise<ParkingFacility[]> => {
      const res = await this.get<{ data: ParkingFacility[] }>('/facilities');
      return res.data || (res as any);
    },

    get: async (id: string): Promise<ParkingFacility> => {
      const res = await this.get<{ data: ParkingFacility }>(`/facilities/${id}`);
      return res.data || (res as any);
    },

    create: async (payload: CreateFacilityPayload): Promise<ParkingFacility> => {
      const res = await this.post<{ data: ParkingFacility }>('/facilities', payload);
      return res.data || (res as any);
    },

    update: async (id: string, payload: UpdateFacilityPayload): Promise<ParkingFacility> => {
      const res = await this.put<{ data: ParkingFacility }>(`/facilities/${id}`, payload);
      return res.data || (res as any);
    },

    getSpaces: async (facilityId: string): Promise<ParkingSpace[]> => {
      const res = await this.get<{ data: ParkingSpace[] }>(`/facilities/${facilityId}/spaces`);
      return res.data || (res as any);
    },

    createSpace: async (facilityId: string, payload: CreateSpacePayload): Promise<ParkingSpace> => {
      const res = await this.post<{ data: ParkingSpace }>(`/facilities/${facilityId}/spaces`, payload);
      return res.data || (res as any);
    },

    bulkCreateSpaces: async (facilityId: string, payload: BulkCreateSpacesPayload): Promise<ParkingSpace[]> => {
      const res = await this.post<{ data: ParkingSpace[] }>(`/facilities/${facilityId}/spaces/bulk`, payload);
      return res.data || (res as any);
    },

    getReadiness: async (facilityId: string): Promise<PublicationReadinessResult> => {
      const res = await this.get<{ data: PublicationReadinessResult }>(`/facilities/${facilityId}/readiness`);
      return res.data || (res as any);
    },

    publish: async (facilityId: string): Promise<ParkingFacility> => {
      const res = await this.post<{ data: ParkingFacility }>(`/facilities/${facilityId}/publish`);
      return res.data || (res as any);
    },
  };

  // --- Spaces Subsystem (PH05) ---
  public readonly spaces = {
    get: async (id: string): Promise<ParkingSpace> => {
      const res = await this.get<{ data: ParkingSpace }>(`/spaces/${id}`);
      return res.data || (res as any);
    },

    update: async (id: string, payload: UpdateSpacePayload): Promise<ParkingSpace> => {
      const res = await this.put<{ data: ParkingSpace }>(`/spaces/${id}`, payload);
      return res.data || (res as any);
    },

    updateStatus: async (id: string, status: SpaceStatus): Promise<ParkingSpace> => {
      const res = await this.patch<{ data: ParkingSpace }>(`/spaces/${id}/status`, { status });
      return res.data || (res as any);
    },
  };

  // --- Public Customer Feed (PH05) ---
  public readonly publicListings = {
    list: async (): Promise<PublicListingSummary[]> => {
      const res = await this.get<{ data: PublicListingSummary[] }>('/public/listings');
      return res.data || (res as any);
    },

    get: async (id: string): Promise<PublicListingSummary> => {
      const res = await this.get<{ data: PublicListingSummary }>(`/public/listings/${id}`);
      return res.data || (res as any);
    },
  };

  // --- Search & Discovery Subsystem (PH06) ---
  public readonly search = {
    query: async (payload: SearchQueryPayload): Promise<SearchResponse> => {
      const res = await this.post<{ data: SearchResponse }>('/search/query', payload);
      return res.data || (res as any);
    },
    getSuggestions: async (q?: string): Promise<LocationSuggestion[]> => {
      const queryParam = q ? `?q=${encodeURIComponent(q)}` : '';
      const res = await this.get<{ data: LocationSuggestion[] }>(`/search/suggestions${queryParam}`);
      return res.data || (res as any);
    },
    getExploreCatalog: async (): Promise<ExploreCatalogHub[]> => {
      const res = await this.get<{ data: ExploreCatalogHub[] }>('/search/explore');
      return res.data || (res as any);
    },
    getFallback: async (location?: string): Promise<FallbackSuggestionsResponse> => {
      const queryParam = location ? `?location=${encodeURIComponent(location)}` : '';
      const res = await this.get<{ data: FallbackSuggestionsResponse }>(`/search/fallback${queryParam}`);
      return res.data || (res as any);
    },
  };

  // --- Booking Lifecycle Subsystem ---
  public readonly bookings = {
    calculatePricing: async (payload: { spaceId: string; startsAt: string; endsAt: string }): Promise<PricingCalculationResult> => {
      const res = await this.post<{ data: PricingCalculationResult }>('/bookings/calculate', payload);
      return res.data || (res as any);
    },
    hold: async (payload: { spaceId: string; startsAt: string; endsAt: string }): Promise<ReservationHold> => {
      const res = await this.post<{ data: ReservationHold }>('/bookings/hold', payload);
      return res.data || (res as any);
    },
    create: async (payload: CreateBookingPayload): Promise<Booking> => {
      const res = await this.post<{ data: Booking }>('/bookings', payload);
      return res.data || (res as any);
    },
    getMyBookings: async (): Promise<BookingDetailsResponse[]> => {
      const res = await this.get<{ data: BookingDetailsResponse[] }>('/bookings/my');
      return res.data || (res as any);
    },
    get: async (id: string): Promise<BookingDetailsResponse> => {
      const res = await this.get<{ data: BookingDetailsResponse }>(`/bookings/${id}`);
      return res.data || (res as any);
    },
    checkIn: async (id: string): Promise<Booking> => {
      const res = await this.post<{ data: Booking }>(`/bookings/${id}/check-in`);
      return res.data || (res as any);
    },
    checkOut: async (id: string): Promise<Booking> => {
      const res = await this.post<{ data: Booking }>(`/bookings/${id}/check-out`);
      return res.data || (res as any);
    },
    extend: async (id: string, additionalHours: number): Promise<Booking> => {
      const res = await this.post<{ data: Booking }>(`/bookings/${id}/extend`, { additionalHours });
      return res.data || (res as any);
    },
    cancel: async (id: string, reason?: string): Promise<Booking & { refundAmountInr?: number }> => {
      const res = await this.post<{ data: Booking & { refundAmountInr?: number } }>(`/bookings/${id}/cancel`, { reason });
      return res.data || (res as any);
    },
    renewHold: async (holdId: string): Promise<ReservationHold> => {
      const res = await this.post<{ data: ReservationHold }>('/bookings/renew-hold', { holdId });
      return res.data || (res as any);
    },
    releaseHold: async (holdId: string): Promise<{ released: boolean }> => {
      const res = await this.post<{ data: { released: boolean } }>('/bookings/release-hold', { holdId });
      return res.data || (res as any);
    },
    getPass: async (id: string): Promise<any> => {
      const res = await this.get<{ data: any }>(`/bookings/${id}/pass`);
      return res.data || (res as any);
    },
    cancelPreview: async (id: string): Promise<CancelPreviewResponse> => {
      const res = await this.post<{ data: CancelPreviewResponse }>(`/bookings/${id}/cancel-preview`);
      return res.data || (res as any);
    },
    getOverstay: async (id: string): Promise<BookingOverstayRecord> => {
      const res = await this.get<{ data: BookingOverstayRecord }>(`/bookings/${id}/overstay`);
      return res.data || (res as any);
    },
    createSupportTicket: async (id: string, payload: { category: string; description: string }): Promise<BookingSupportTicket> => {
      const res = await this.post<{ data: BookingSupportTicket }>(`/bookings/${id}/support`, payload);
      return res.data || (res as any);
    },
    getAlternatives: async (spaceId: string, startsAt: string, endsAt: string): Promise<AlternativeSpaceSuggestion[]> => {
      const res = await this.get<{ data: AlternativeSpaceSuggestion[] }>(`/bookings/alternatives/search?spaceId=${encodeURIComponent(spaceId)}&startsAt=${encodeURIComponent(startsAt)}&endsAt=${encodeURIComponent(endsAt)}`);
      return res.data || (res as any);
    },
    getReceipt: async (id: string): Promise<TaxInvoiceReceipt> => {
      const res = await this.get<{ data: TaxInvoiceReceipt }>(`/bookings/${id}/receipt`);
      return res.data || (res as any);
    },
  };

  // --- Payments Subsystem ---
  public readonly payments = {
    getMethods: async (): Promise<{ id: string; name: string; icon: string; popular?: boolean }[]> => {
      const res = await this.get<{ data: { id: string; name: string; icon: string; popular?: boolean }[] }>('/payments/methods');
      return res.data || (res as any);
    },
    initiate: async (payload: { bookingId: string; method: string; amountInr: number }): Promise<PaymentTransaction> => {
      const res = await this.post<{ data: PaymentTransaction }>('/payments/initiate', payload);
      return res.data || (res as any);
    },
    verify: async (payload: { transactionId: string; referenceId: string }): Promise<PaymentTransaction> => {
      const res = await this.post<{ data: PaymentTransaction }>('/payments/verify', payload);
      return res.data || (res as any);
    },
  };

  public readonly vehicles = {
    list: async (): Promise<UserVehicle[]> => {
      const res = await this.get<{ data: UserVehicle[] }>('/users/me/vehicles');
      return res.data || (res as any);
    },
    add: async (payload: Omit<UserVehicle, 'id' | 'userId' | 'createdAt'>): Promise<UserVehicle> => {
      const res = await this.post<{ data: UserVehicle }>('/users/me/vehicles', payload);
      return res.data || (res as any);
    },
    update: async (id: string, payload: Partial<Omit<UserVehicle, 'id' | 'userId' | 'createdAt'>>): Promise<UserVehicle> => {
      const res = await this.put<{ data: UserVehicle }>(`/users/me/vehicles/${id}`, payload);
      return res.data || (res as any);
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      const res = await this.delete<{ data: { success: boolean } }>(`/users/me/vehicles/${id}`);
      return res.data || (res as any);
    },
  };

  public readonly favorites = {
    list: async (): Promise<ParkingFacility[]> => {
      const res = await this.get<{ data: ParkingFacility[] }>('/users/me/favorites');
      return res.data || (res as any);
    },
    toggle: async (facilityId: string): Promise<{ isFavorited: boolean }> => {
      const res = await this.post<{ data: { isFavorited: boolean } }>(`/users/me/favorites/${facilityId}/toggle`);
      return res.data || (res as any);
    },
  };

  // --- Host Operations Subsystem ---
  public readonly hostOps = {
    getBookings: async (): Promise<BookingDetailsResponse[]> => {
      const res = await this.get<{ data: BookingDetailsResponse[] }>('/host/bookings');
      return res.data || (res as any);
    },
    getOccupancy: async (): Promise<{ facilityId: string; facilityName: string; totalSpaces: number; occupiedSpaces: number; availableSpaces: number; spaces: any[] }[]> => {
      const res = await this.get<{ data: any[] }>('/host/occupancy');
      return res.data || (res as any);
    },
    getEarnings: async (): Promise<HostEarningsSummary> => {
      const res = await this.get<{ data: HostEarningsSummary }>('/host/earnings');
      return res.data || (res as any);
    },
    getLedger: async (): Promise<any[]> => {
      const res = await this.get<{ data: any[] }>('/host/ledger');
      return res.data || (res as any);
    },
    getPayouts: async (): Promise<HostSettlement[]> => {
      const res = await this.get<{ data: HostSettlement[] }>('/host/payouts');
      return res.data || (res as any);
    },
    requestPayout: async (): Promise<HostSettlement> => {
      const res = await this.post<{ data: HostSettlement }>('/host/payouts/request');
      return res.data || (res as any);
    },
    getExtensionRequests: async (): Promise<any[]> => {
      const res = await this.get<{ data: any[] }>('/host/extension-requests');
      return res.data || (res as any);
    },
    getAuditEvents: async (): Promise<any[]> => {
      const res = await this.get<{ data: any[] }>('/host/operations/audit');
      return res.data || (res as any);
    },
    decideExtensionRequest: async (requestId: string, decision: string): Promise<any> => {
      const res = await this.post<{ data: any }>(`/host/extension-requests/${requestId}/decision`, { decision });
      return res.data || (res as any);
    },
    checkIn: async (id: string): Promise<any> => {
      const res = await this.post<{ data: any }>(`/host/bookings/${encodeURIComponent(id)}/check-in`);
      return res.data || (res as any);
    },
    checkOut: async (id: string): Promise<any> => {
      const res = await this.post<{ data: any }>(`/host/bookings/${encodeURIComponent(id)}/check-out`);
      return res.data || (res as any);
    },
  };

  public readonly host = this.hostOps;

  // --- Web Admin Governance Subsystem ---
  public readonly admin = {
    getOverview: async (): Promise<AdminPlatformOverview> => {
      const res = await this.get<{ data: AdminPlatformOverview }>('/admin/overview');
      return res.data || (res as any);
    },
    getUsers: async (role?: string): Promise<UserAccount[]> => {
      const query = role ? `?role=${role}` : '';
      const res = await this.get<{ data: UserAccount[] }>(`/admin/users${query}`);
      return res.data || (res as any);
    },
    updateUserStatus: async (userId: string, status: string): Promise<UserAccount> => {
      const res = await this.put<{ data: UserAccount }>(`/admin/users/${userId}/status`, { status });
      return res.data || (res as any);
    },
    getHosts: async (): Promise<(HostProfile & { email?: string; fullName?: string; phone?: string })[]> => {
      const res = await this.get<{ data: any[] }>('/admin/hosts');
      return res.data || (res as any);
    },
    approveHost: async (hostId: string): Promise<HostProfile> => {
      const res = await this.post<{ data: HostProfile }>(`/admin/hosts/${hostId}/approve`);
      return res.data || (res as any);
    },
    rejectHost: async (hostId: string, reason?: string): Promise<HostProfile> => {
      const res = await this.post<{ data: HostProfile }>(`/admin/hosts/${hostId}/reject`, { reason });
      return res.data || (res as any);
    },
    getFacilities: async (): Promise<ParkingFacility[]> => {
      const res = await this.get<{ data: ParkingFacility[] }>('/admin/facilities');
      return res.data || (res as any);
    },
    moderateFacility: async (facilityId: string, status: string): Promise<ParkingFacility> => {
      const res = await this.post<{ data: ParkingFacility }>(`/admin/facilities/${facilityId}/moderate`, { status });
      return res.data || (res as any);
    },
    getBookings: async (status?: string): Promise<BookingDetailsResponse[]> => {
      const query = status ? `?status=${status}` : '';
      const res = await this.get<{ data: BookingDetailsResponse[] }>(`/admin/bookings${query}`);
      return res.data || (res as any);
    },
    getAuditLogs: async (): Promise<any[]> => {
      const res = await this.get<{ data: any[] }>('/admin/audit-logs');
      return res.data || (res as any);
    },
  };
}

export { ParkEazyApiClient as ApiClient };
