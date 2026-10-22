import React from 'react';
import { useBrand } from '@parkeazy/branding';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const { tenant } = useBrand();

  const sizeDimensions = {
    sm: { icon: 28, text: 'text-lg', badge: 'text-[10px]' },
    md: { icon: 34, text: 'text-xl', badge: 'text-xs' },
    lg: { icon: 42, text: 'text-2xl', badge: 'text-xs' },
  };

  const dim = sizeDimensions[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Hexagon/P Emblem */}
      <div
        className="flex items-center justify-center rounded-xl shadow-sm text-white font-black tracking-tight shrink-0 transition-transform hover:scale-105"
        style={{
          width: dim.icon,
          height: dim.icon,
          backgroundColor: tenant.colors.primary,
        }}
      >
        <span className="font-extrabold text-sm tracking-tighter">P</span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-extrabold tracking-tight ${dim.text}`}
            style={{ color: tenant.colors.primary }}
          >
            Park
          </span>
          <span
            className={`font-extrabold tracking-tight ${dim.text} text-[#101828]`}
          >
            Eazy
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full inline-block ml-0.5"
            style={{ backgroundColor: tenant.colors.accent }}
          />
        </div>
        {showTagline && (
          <span className="text-[11px] text-[#667085] font-medium tracking-normal mt-0.5">
            {tenant.tagline}
          </span>
        )}
      </div>
    </div>
  );
};
