export type PortalId = 'website' | 'host' | 'admin';

export interface PortalMetadata {
  id: PortalId;
  name: string;
  tagline: string;
  defaultPort: number;
  routePrefix: string;
  description: string;
  designRefPrefix: string;
}

export interface NavLinkItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  badge?: string;
}
