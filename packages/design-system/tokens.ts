/**
 * Design system tokens for ParkEazy
 * Defined centrally to enforce visual consistency across User Website, Host Portal, and Admin Panel.
 */

export const DESIGN_TOKENS = {
  // Application Palettes
  userWebsite: {
    primary: '#087E8A',
    primaryHover: '#076D77',
    primaryDeep: '#075762',
    canvas: '#F4F8F7',
    surface: '#FFFFFF',
    textMain: '#162A2D',
    textMuted: '#52696B',
    border: '#DEE7E6',
    accent: '#0E9AA7',
  },
  hostPortal: {
    primary: '#22C55E',
    primaryHover: '#16A34A',
    primaryDeep: '#0F766E',
    canvas: '#F0F4F3',
    surface: '#FFFFFF',
    surfaceDark: '#12211C',
    textMain: '#132A24',
    textMuted: '#4F6860',
    border: '#D8E2DE',
    accent: '#10B981',
  },
  adminPanel: {
    primary: '#2563EB',
    primaryHover: '#1D4ED8',
    primaryDeep: '#0F4C81',
    canvas: '#F4F8FC',
    surface: '#FFFFFF',
    surfaceDark: '#0B172B',
    textMain: '#10233F',
    textMuted: '#4B6282',
    border: '#DCE4F0',
    accent: '#3B82F6',
    warning: '#D97706',
    danger: '#DC2626',
    success: '#16A34A',
  },

  // Typography
  typography: {
    fontDisplay: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
  },

  // Radii
  radii: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    full: '9999px',
  },

  // Shadows
  shadows: {
    subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
    card: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
    elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
  },
} as const;

export type AppThemeType = 'user' | 'host' | 'admin';
