import { TenantConfig } from '@parkeazy/shared-types';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

export function validateTenantConfig(config: unknown): ValidationResult<TenantConfig> {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { success: false, errors: ['Configuration must be a non-null object'] };
  }

  const c = config as Record<string, any>;

  if (c.schemaVersion !== '1.0.0') {
    errors.push(`Invalid schemaVersion: expected "1.0.0", got "${c.schemaVersion}"`);
  }

  if (typeof c.tenantId !== 'string' || !/^[a-z0-9-]+$/.test(c.tenantId)) {
    errors.push('tenantId must be a non-empty alphanumeric slug with hyphens');
  }

  if (typeof c.displayName !== 'string' || c.displayName.trim().length === 0) {
    errors.push('displayName is required and cannot be empty');
  }

  if (typeof c.tagline !== 'string' || c.tagline.trim().length === 0) {
    errors.push('tagline is required and cannot be empty');
  }

  // Validate colors
  if (!c.colors || typeof c.colors !== 'object') {
    errors.push('colors object is required');
  } else {
    const requiredColors = ['primary', 'secondary', 'accent', 'background', 'surface', 'border'];
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    for (const key of requiredColors) {
      if (!c.colors[key] || !hexRegex.test(c.colors[key])) {
        errors.push(`colors.${key} must be a valid 6-character hex code (e.g. #0F766E)`);
      }
    }
  }

  // Validate typography
  if (!c.typography || typeof c.typography !== 'object') {
    errors.push('typography object is required');
  } else {
    if (!c.typography.headingFont) errors.push('typography.headingFont is required');
    if (!c.typography.bodyFont) errors.push('typography.bodyFont is required');
  }

  // Validate assets
  if (!c.assets || typeof c.assets !== 'object') {
    errors.push('assets object is required');
  } else {
    if (!c.assets.logoUrl) errors.push('assets.logoUrl is required');
    if (!c.assets.iconUrl) errors.push('assets.iconUrl is required');
    if (!c.assets.faviconUrl) errors.push('assets.faviconUrl is required');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: config as TenantConfig, errors: [] };
}
