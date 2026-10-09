import { API_CONFIG } from '@parkeazy/config';

export interface ApiClientOptions {
  baseUrl?: string;
  tenantId?: string;
  timeoutMs?: number;
}

export class ParkEazyApiClient {
  private baseUrl: string;
  private tenantId: string;
  private timeoutMs: number;

  constructor(options: ApiClientOptions = {}) {
    const envUrl = typeof process !== 'undefined' && process.env?.VITE_API_URL;
    this.baseUrl = options.baseUrl || envUrl || `http://${API_CONFIG.defaultHost}:${API_CONFIG.defaultPort}${API_CONFIG.prefix}`;
    this.tenantId = options.tenantId || 'default';
    this.timeoutMs = options.timeoutMs || 5000;
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

  public async get<T>(path: string): Promise<T> {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.tenantId,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API HTTP Error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
