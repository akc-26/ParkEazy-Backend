import React, { createContext, useContext, ReactNode, useState } from 'react';

export interface TenantBrand {
  tenantId: string;
  displayName: string;
  name: string;
  tagline: string;
  colors: {
    primary: string;
    secondary: string;
    surface?: string;
  };
  logoUrl?: string;
}

export const DEFAULT_TENANT: TenantBrand = {
  tenantId: 'tenant-metro-01',
  displayName: 'ParkEazy Metro',
  name: 'ParkEazy',
  tagline: 'Smart parking simplified',
  colors: {
    primary: '#10b981',
    secondary: '#064e3b',
    surface: '#F4F8FC',
  },
};

interface BrandContextType {
  tenant: TenantBrand;
  setTenant: (tenant: TenantBrand) => void;
}

const BrandContext = createContext<BrandContextType>({
  tenant: DEFAULT_TENANT,
  setTenant: () => {},
});

export const BrandProvider: React.FC<{ children: ReactNode; initialTenant?: TenantBrand }> = ({
  children,
  initialTenant = DEFAULT_TENANT,
}) => {
  const [tenant, setTenant] = useState<TenantBrand>(initialTenant);

  return (
    <BrandContext.Provider value={{ tenant, setTenant }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => useContext(BrandContext);
