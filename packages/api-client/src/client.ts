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
    this.accessToken = options.initialToken || null;
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
  };
}
