import {
  User,
  Facility,
  ParkingBay,
  PricingRule,
  AvailabilityHold,
  Booking,
  LedgerEntry,
  PayoutRequest,
  Review,
  NotificationItem,
  DisputeTicket,
  ThirdPartyProviderConfig,
  AuditLog
} from './types';

class ApiClient {
  private activeContext: 'host' | 'admin' | 'customer' = 'customer';

  public setActiveContext(context: 'host' | 'admin' | 'customer') {
    this.activeContext = context;
  }

  public getHostToken(): string | null {
    return localStorage.getItem('parkeazy_host_token');
  }

  public setHostToken(token: string | null) {
    if (token) {
      localStorage.setItem('parkeazy_host_token', token);
    } else {
      localStorage.removeItem('parkeazy_host_token');
    }
  }

  public getAdminToken(): string | null {
    return localStorage.getItem('parkeazy_admin_token');
  }

  public setAdminToken(token: string | null) {
    if (token) {
      localStorage.setItem('parkeazy_admin_token', token);
    } else {
      localStorage.removeItem('parkeazy_admin_token');
    }
  }

  public getCustomerToken(): string | null {
    return localStorage.getItem('parkeazy_customer_token');
  }

  public setCustomerToken(token: string | null) {
    if (token) {
      localStorage.setItem('parkeazy_customer_token', token);
    } else {
      localStorage.removeItem('parkeazy_customer_token');
    }
  }

  public getActiveToken(): string | null {
    if (this.activeContext === 'host') {
      return this.getHostToken();
    }
    if (this.activeContext === 'admin') {
      return this.getAdminToken();
    }
    return this.getCustomerToken();
  }

  // Legacy compat helpers
  public setUserId(id: string) {
    if (this.activeContext === 'host') this.setHostToken(id);
    else if (this.activeContext === 'admin') this.setAdminToken(id);
    else this.setCustomerToken(id);
  }

  public getUserId(): string {
    return this.getActiveToken() || '';
  }

  public async request<T>(endpoint: string, options: RequestInit = {}, explicitToken?: string | null): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const token = explicitToken !== undefined ? explicitToken : this.getActiveToken();
    if (token) {
      headers.set('x-user-id', token);
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers
    });

    if (!res.ok) {
      let errorMsg = `API request failed with status ${res.status}`;
      try {
        const body = await res.json();
        if (body.error) errorMsg = body.error;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // Dedicated Auth Methods
  async loginHost(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }, null);

    if (res.user.role !== 'host' && res.user.role !== 'admin') {
      throw new Error('This account does not have Host Portal privileges.');
    }

    this.setHostToken(res.token);
    this.setActiveContext('host');
    return res;
  }

  async logoutHost(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' }, this.getHostToken());
    } catch {
      // ignore
    } finally {
      this.setHostToken(null);
    }
  }

  async getHostUser(): Promise<User | null> {
    const token = this.getHostToken();
    if (!token) return null;
    try {
      const res = await this.request<{ user: User }>('/auth/me', {}, token);
      if (res.user.role === 'host' || res.user.role === 'admin') {
        return res.user;
      }
      this.setHostToken(null);
      return null;
    } catch {
      this.setHostToken(null);
      return null;
    }
  }

  async loginAdmin(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }, null);

    if (res.user.role !== 'admin') {
      throw new Error('Access denied: Administrator privileges required.');
    }

    this.setAdminToken(res.token);
    this.setActiveContext('admin');
    return res;
  }

  async logoutAdmin(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' }, this.getAdminToken());
    } catch {
      // ignore
    } finally {
      this.setAdminToken(null);
    }
  }

  async getAdminUser(): Promise<User | null> {
    const token = this.getAdminToken();
    if (!token) return null;
    try {
      const res = await this.request<{ user: User }>('/auth/me', {}, token);
      if (res.user.role === 'admin') {
        return res.user;
      }
      this.setAdminToken(null);
      return null;
    } catch {
      this.setAdminToken(null);
      return null;
    }
  }

  async loginCustomer(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }, null);

    this.setCustomerToken(res.token);
    this.setActiveContext('customer');
    return res;
  }

  async logoutCustomer(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' }, this.getCustomerToken());
    } catch {
      // ignore
    } finally {
      this.setCustomerToken(null);
    }
  }

  async getCustomerUser(): Promise<User | null> {
    const token = this.getCustomerToken();
    if (!token) return null;
    try {
      const res = await this.request<{ user: User }>('/auth/me', {}, token);
      return res.user;
    } catch {
      this.setCustomerToken(null);
      return null;
    }
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }, null);
  }

  async registerHost(data: any): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...data, role: 'host' })
    }, null);
    this.setHostToken(res.token);
    this.setActiveContext('host');
    return res;
  }

  // General auth helpers
  async login(email: string, password: string) {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }, null);
    this.setUserId(res.user.id);
    return res;
  }

  async register(data: any) {
    const res = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }, null);
    this.setUserId(res.user.id);
    return res;
  }

  async getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  async updateProfile(updates: Partial<User>): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async getDemoUsers(): Promise<User[]> {
    return this.request<User[]>('/auth/demo-users', {}, null);
  }

  // Facilities
  async getFacilities(params?: { hostId?: string; status?: string; city?: string }): Promise<Facility[]> {
    const q = new URLSearchParams();
    if (params?.hostId) q.set('hostId', params.hostId);
    if (params?.status) q.set('status', params.status);
    if (params?.city) q.set('city', params.city);
    return this.request<Facility[]>(`/facilities?${q.toString()}`);
  }

  async getFacility(id: string): Promise<Facility> {
    return this.request<Facility>(`/facilities/${id}`);
  }

  async createFacility(data: Partial<Facility>): Promise<Facility> {
    return this.request<Facility>('/facilities', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateFacility(id: string, data: Partial<Facility>): Promise<Facility> {
    return this.request<Facility>(`/facilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async submitFacility(id: string): Promise<Facility> {
    return this.request<Facility>(`/facilities/${id}/submit`, {
      method: 'POST'
    });
  }

  async toggleFacilityStatus(id: string): Promise<Facility> {
    return this.request<Facility>(`/facilities/${id}/toggle-status`, {
      method: 'POST'
    });
  }

  // Bays
  async getBays(facilityId: string): Promise<ParkingBay[]> {
    return this.request<ParkingBay[]>(`/facilities/${facilityId}/bays`);
  }

  async createBay(facilityId: string, data: Partial<ParkingBay>): Promise<ParkingBay> {
    return this.request<ParkingBay>(`/facilities/${facilityId}/bays`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async createBulkBays(facilityId: string, config: any): Promise<{ count: number; bays: ParkingBay[] }> {
    return this.request<{ count: number; bays: ParkingBay[] }>(`/facilities/${facilityId}/bays/bulk`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  async updateBay(id: string, data: Partial<ParkingBay>): Promise<ParkingBay> {
    return this.request<ParkingBay>(`/bays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async setBayStatus(id: string, status: string, reason?: string): Promise<ParkingBay> {
    return this.request<ParkingBay>(`/bays/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, reason })
    });
  }

  async deleteBay(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/bays/${id}`, {
      method: 'DELETE'
    });
  }

  // Pricing
  async getPricingRules(facilityId: string): Promise<PricingRule[]> {
    return this.request<PricingRule[]>(`/facilities/${facilityId}/pricing-rules`);
  }

  async createPricingRule(facilityId: string, data: Partial<PricingRule>): Promise<PricingRule> {
    return this.request<PricingRule>(`/facilities/${facilityId}/pricing-rules`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePricingRule(id: string, data: Partial<PricingRule>): Promise<PricingRule> {
    return this.request<PricingRule>(`/pricing-rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getPricingEstimate(facilityId: string, startTime: string, endTime: string, bayMultiplier = 1.0) {
    return this.request<{
      totalHours: number;
      baseHourlyRate: number;
      grossAmount: number;
      platformFee: number;
      taxAmount: number;
      hostNetEarnings: number;
      discountApplied: number;
      eventSurcharge: number;
      appliedSurge: number;
    }>('/pricing/estimate', {
      method: 'POST',
      body: JSON.stringify({ facilityId, startTime, endTime, bayMultiplier })
    });
  }

  // Holds & Bookings
  async createHold(bayId: string, facilityId: string, startTime: string, endTime: string): Promise<AvailabilityHold> {
    return this.request<AvailabilityHold>('/holds', {
      method: 'POST',
      body: JSON.stringify({ bayId, facilityId, startTime, endTime })
    });
  }

  async releaseHold(holdId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/holds/${holdId}`, {
      method: 'DELETE'
    });
  }

  async getBookings(params?: { facilityId?: string; status?: string }): Promise<Booking[]> {
    const q = new URLSearchParams();
    if (params?.facilityId) q.set('facilityId', params.facilityId);
    if (params?.status) q.set('status', params.status);
    return this.request<Booking[]>(`/bookings?${q.toString()}`);
  }

  async getBooking(id: string): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}`);
  }

  async createBooking(data: any): Promise<Booking> {
    return this.request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async checkInBooking(id: string): Promise<{ success: boolean; message: string; booking: Booking }> {
    return this.request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/check-in`, {
      method: 'POST'
    });
  }

  async checkOutBooking(id: string): Promise<{ success: boolean; message: string; booking: Booking }> {
    return this.request<{ success: boolean; message: string; booking: Booking }>(`/bookings/${id}/check-out`, {
      method: 'POST'
    });
  }

  async extendBooking(id: string, hours: number): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}/extend`, {
      method: 'POST',
      body: JSON.stringify({ hours })
    });
  }

  async cancelBooking(id: string, reason: string): Promise<Booking> {
    return this.request<Booking>(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  // Financials & Payouts
  async getEarningsSummary(hostId?: string) {
    const q = hostId ? `?hostId=${hostId}` : '';
    return this.request<{
      availableBalance: number;
      pendingPayouts: number;
      lifetimeEarnings: number;
      lifetimePayouts: number;
      lifetimeRefunds: number;
    }>(`/earnings/summary${q}`);
  }

  async getLedger(hostId?: string): Promise<LedgerEntry[]> {
    const q = hostId ? `?hostId=${hostId}` : '';
    return this.request<LedgerEntry[]>(`/ledger${q}`);
  }

  async getPayouts(hostId?: string): Promise<PayoutRequest[]> {
    const q = hostId ? `?hostId=${hostId}` : '';
    return this.request<PayoutRequest[]>(`/payouts${q}`);
  }

  async requestPayout(amount: number, method: string, destinationAccount: string): Promise<PayoutRequest> {
    return this.request<PayoutRequest>('/payouts', {
      method: 'POST',
      body: JSON.stringify({ amount, method, destinationAccount })
    });
  }

  // Reviews
  async getReviews(facilityId: string): Promise<Review[]> {
    return this.request<Review[]>(`/facilities/${facilityId}/reviews`);
  }

  async addReview(facilityId: string, bookingId: string, rating: number, comment: string): Promise<Review> {
    return this.request<Review>(`/facilities/${facilityId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ bookingId, rating, comment })
    });
  }

  async replyToReview(reviewId: string, text: string): Promise<Review> {
    return this.request<Review>(`/reviews/${reviewId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  }

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>('/notifications');
  }

  async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/notifications/mark-all-read', {
      method: 'POST'
    });
  }

  // Disputes
  async getDisputes(): Promise<DisputeTicket[]> {
    return this.request<DisputeTicket[]>('/disputes');
  }

  async createDispute(bookingId: string, reason: string, statement: string): Promise<DisputeTicket> {
    return this.request<DisputeTicket>('/disputes', {
      method: 'POST',
      body: JSON.stringify({ bookingId, reason, statement })
    });
  }

  async resolveDispute(ticketId: string, decision: string, refundAmount: number, notes: string): Promise<DisputeTicket> {
    return this.request<DisputeTicket>(`/admin/disputes/${ticketId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ decision, refundAmount, notes })
    });
  }

  // Admin
  async getAdminFacilities(status?: string): Promise<Facility[]> {
    const q = status ? `?status=${status}` : '';
    return this.request<Facility[]>(`/admin/facilities${q}`);
  }

  async moderateFacility(id: string, approved: boolean, notes: string): Promise<Facility> {
    return this.request<Facility>(`/admin/facilities/${id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ approved, notes })
    });
  }

  async getAdminHosts(): Promise<User[]> {
    return this.request<User[]>('/admin/hosts');
  }

  async updateHostStatus(id: string, status: string): Promise<User> {
    return this.request<User>(`/admin/hosts/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  async getProviders(): Promise<ThirdPartyProviderConfig[]> {
    return this.request<ThirdPartyProviderConfig[]>('/admin/providers');
  }

  async updateProvider(id: string, data: Partial<ThirdPartyProviderConfig>): Promise<ThirdPartyProviderConfig> {
    return this.request<ThirdPartyProviderConfig>(`/admin/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async testProvider(id: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    return this.request<{ success: boolean; latencyMs: number; message: string }>(`/admin/providers/${id}/test`, {
      method: 'POST'
    });
  }

  async getAuditLogs(entityType?: string, limit = 100): Promise<AuditLog[]> {
    const q = new URLSearchParams();
    if (entityType) q.set('entityType', entityType);
    if (limit) q.set('limit', limit.toString());
    return this.request<AuditLog[]>(`/admin/audit-logs?${q.toString()}`);
  }

  async getHostReports(hostId?: string) {
    const q = hostId ? `?hostId=${hostId}` : '';
    return this.request<{
      totalBays: number;
      occupiedBays: number;
      occupancyRate: number;
      grossRevenue: number;
      netEarnings: number;
      totalBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      cancellationRate: number;
      hourlyDistribution: number[];
    }>(`/reports/host${q}`);
  }
}

export const api = new ApiClient();
