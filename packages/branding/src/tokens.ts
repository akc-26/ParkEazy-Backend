import { TenantConfig } from '@parkeazy/shared-types';

/**
 * Authoritative default branding configuration for ParkEazy
 * Grounded in parkeazy_design_system/DESIGN.md from ParkEazy-Web-Design
 */
export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  schemaVersion: '1.0.0',
  tenantId: 'default',
  displayName: 'ParkEazy',
  legalName: 'ParkEazy Mobility Technologies Pvt. Ltd.',
  tagline: 'Park smart. Arrive easy.',
  description: 'Premium white-label marketplace connecting urban drivers with guaranteed, secure parking spaces.',
  colors: {
    primary: '#0F766E', // Primary Emerald
    primaryHover: '#115E59',
    primaryContainer: '#0F766E',
    secondary: '#006B5F', // Secondary deep teal
    secondaryContainer: '#14B8A6', // Bright mint accent
    accent: '#D6A84F', // Restrained Gold
    background: '#F8FAFC', // Soft surface canvas
    surface: '#FFFFFF', // Pure white card elevation
    surfaceLow: '#F1F3FF', // Tonal container low
    onSurface: '#101828', // Deep ink
    onSurfaceVariant: '#344054', // Slate
    border: '#E4E7EC', // Border hairline
    statusSuccess: '#12B76A', // Space occupied, gate opened
    statusWarning: '#F79009', // Expiring reservation, 90% capacity
    statusDanger: '#F04438', // Overstay violation, payment failed
  },
  typography: {
    headingFont: 'Plus Jakarta Sans, sans-serif',
    bodyFont: 'Inter, sans-serif',
    tabularNumbers: true,
  },
  assets: {
    logoUrl: '/assets/branding/logo.svg',
    logoDarkUrl: '/assets/branding/logo-dark.svg',
    iconUrl: '/assets/branding/icon.svg',
    faviconUrl: '/assets/branding/favicon.svg',
  },
  support: {
    email: 'support@parkeazy.com',
    phone: '+91 44 4800 2200',
    helpUrl: '/help',
  },
};

export const PARKEAZY_DESIGN_TOKENS = {
  colors: {
    primaryEmerald: '#0F766E',
    brightMint: '#14B8A6',
    paleEmerald: '#E6F7F4',
    restrainedGold: '#D6A84F',
    deepInk: '#101828',
    slate: '#344054',
    mutedSlate: '#667085',
    softSurface: '#F8FAFC',
    pureWhite: '#FFFFFF',
    borderHairline: '#E4E7EC',
  },
  radii: {
    base: '8px',
    lg: '16px',
    xl: '24px',
    pill: '9999px',
  },
  fonts: {
    display: "'Plus Jakarta Sans', sans-serif",
    body: "'Inter', sans-serif",
  },
};
