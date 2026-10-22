import { TenantConfig, ThemeMode } from '@parkeazy/shared-types';

export function getTenantCssVariables(tenant: TenantConfig, mode: ThemeMode = 'light'): Record<string, string> {
  const { colors } = tenant;
  return {
    '--pe-color-primary': colors.primary,
    '--pe-color-primary-hover': colors.primaryHover,
    '--pe-color-primary-container': colors.primaryContainer,
    '--pe-color-secondary': colors.secondary,
    '--pe-color-accent': colors.accent,
    '--pe-color-background': mode === 'light' ? colors.background : '#0F172A',
    '--pe-color-surface': mode === 'light' ? colors.surface : '#1E293B',
    '--pe-color-on-surface': mode === 'light' ? colors.onSurface : '#F8FAFC',
    '--pe-color-on-surface-variant': mode === 'light' ? colors.onSurfaceVariant : '#94A3B8',
    '--pe-color-border': mode === 'light' ? colors.border : '#334155',
    '--pe-color-status-success': colors.statusSuccess,
    '--pe-color-status-warning': colors.statusWarning,
    '--pe-color-status-danger': colors.statusDanger,
    '--pe-font-heading': tenant.typography.headingFont,
    '--pe-font-body': tenant.typography.bodyFont,
  };
}

export function applyTenantThemeToDocument(tenant: TenantConfig, mode: ThemeMode = 'light'): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const vars = getTenantCssVariables(tenant, mode);
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
