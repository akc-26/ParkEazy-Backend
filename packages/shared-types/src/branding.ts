export interface BrandColors {
  primary: string;
  primaryHover: string;
  primaryContainer: string;
  secondary: string;
  secondaryContainer?: string;
  accent: string;
  background: string;
  surface: string;
  surfaceLow?: string;
  onSurface: string;
  onSurfaceVariant: string;
  border: string;
  statusSuccess: string;
  statusWarning: string;
  statusDanger: string;
}

export interface BrandTypography {
  headingFont: string;
  bodyFont: string;
  tabularNumbers: boolean;
}

export interface BrandAssets {
  logoUrl: string;
  logoDarkUrl?: string;
  iconUrl: string;
  faviconUrl: string;
}

export interface BrandSupport {
  email?: string;
  phone?: string;
  helpUrl?: string;
}

export interface TenantConfig {
  schemaVersion: '1.0.0';
  tenantId: string;
  displayName: string;
  legalName?: string;
  tagline: string;
  description: string;
  colors: BrandColors;
  typography: BrandTypography;
  assets: BrandAssets;
  support?: BrandSupport;
}

export type ThemeMode = 'light' | 'dark';
