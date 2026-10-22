import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { TenantConfig, ThemeMode } from '@parkeazy/shared-types';
import { DEFAULT_TENANT_CONFIG } from './tokens';
import { applyTenantThemeToDocument } from './theme';

interface BrandContextValue {
  tenant: TenantConfig;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  setTenant: (tenant: TenantConfig) => void;
}

const BrandContext = createContext<BrandContextValue>({
  tenant: DEFAULT_TENANT_CONFIG,
  themeMode: 'light',
  setThemeMode: () => {},
  setTenant: () => {},
});

export interface BrandProviderProps {
  initialTenant?: TenantConfig;
  initialMode?: ThemeMode;
  children: React.ReactNode;
}

export const BrandProvider: React.FC<BrandProviderProps> = ({
  initialTenant = DEFAULT_TENANT_CONFIG,
  initialMode = 'light',
  children,
}) => {
  const [tenant, setTenant] = useState<TenantConfig>(initialTenant);
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);

  useEffect(() => {
    applyTenantThemeToDocument(tenant, themeMode);
  }, [tenant, themeMode]);

  const value = useMemo(
    () => ({
      tenant,
      themeMode,
      setThemeMode,
      setTenant,
    }),
    [tenant, themeMode]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
};

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return ctx;
}
