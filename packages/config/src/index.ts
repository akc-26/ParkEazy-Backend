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
