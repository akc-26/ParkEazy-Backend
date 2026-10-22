/**
 * @fileoverview Shared configuration constants and environment definitions for ParkEazy
 */

export interface WorkspacePorts {
  website: number;
  host: number;
  admin: number;
  api: number;
  preview: number;
}

export const WORKSPACE_PORTS: WorkspacePorts = {
  preview: 3000,
  website: 3001,
  host: 3002,
  admin: 3003,
  api: 4000,
};

export const API_CONFIG = {
  defaultPort: 4000,
  defaultHost: 'localhost',
  prefix: '/api/v1',
  serviceName: 'parkeazy-backend-api',
  version: '0.1.0',
};

export const DEFAULT_TENANT_ID = 'default';

export const SUPPORTED_PORTALS = ['website', 'host', 'admin'] as const;
export type SupportedPortal = (typeof SUPPORTED_PORTALS)[number];

export const SAME_ORIGIN_ROUTES = {
  website: '/',
  host: '/host/',
  admin: '/admin/',
  api: '/api/v1',
  health: '/health',
  overview: '/overview',
} as const;

export type ApplicationRouteTarget = 'website' | 'host' | 'admin' | 'api' | 'health' | 'overview';

/**
 * Deterministically resolves the intended application or service target from a URL pathname.
 * Ensures consistent handling of paths with or without trailing slashes.
 */
export function resolveApplicationFromPath(pathname: string): ApplicationRouteTarget {
  // Extract path portion without query string or hash anchor
  const cleanPath = (pathname.split('?')[0] || '').split('#')[0] || '/';
  const normalized = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

  if (normalized === '/health' || normalized.startsWith('/health/')) {
    return 'health';
  }
  if (normalized === '/api/v1' || normalized.startsWith('/api/v1/')) {
    return 'api';
  }
  if (normalized === '/host' || normalized === '/host/' || normalized.startsWith('/host/')) {
    return 'host';
  }
  if (normalized === '/admin' || normalized === '/admin/' || normalized.startsWith('/admin/')) {
    return 'admin';
  }
  if (normalized === '/overview' || normalized.startsWith('/overview/')) {
    return 'overview';
  }
  return 'website';
}
