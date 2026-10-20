import React from 'react';
import { PortalId } from '@parkeazy/shared-types';
import { Badge } from './Badge';

export interface PortalBannerProps {
  portal: PortalId;
  port: number;
  designRef?: string;
}

export const PortalBanner: React.FC<PortalBannerProps> = ({
  portal,
  port,
  designRef,
}) => {
  const portalTitles: Record<PortalId, { title: string; color: string; bg: string }> = {
    website: {
      title: 'Customer Marketplace Portal',
      color: 'text-[#0F766E]',
      bg: 'bg-[#E6F7F4]',
    },
    host: {
      title: 'Host Operations Portal',
      color: 'text-[#006B5F]',
      bg: 'bg-[#E0F2FE]',
    },
    admin: {
      title: 'Platform Administration Panel',
      color: 'text-[#7C3AED]',
      bg: 'bg-[#F3E8FF]',
    },
  };

  const info = portalTitles[portal];

  return (
    <div className="w-full bg-[#101828] text-white px-4 py-2 border-b border-[#1E293B] flex flex-wrap items-center justify-between text-xs gap-2">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 font-semibold text-[#14B8A6]">
          <span className="w-2 h-2 rounded-full bg-[#12B76A] animate-pulse" />
          ParkEazy Monorepo
        </span>
        <span className="text-[#64748B]">|</span>
        <span className="text-[#E2E8F0] font-medium">{info.title}</span>
        <span className="bg-[#1E293B] text-[#94A3B8] px-2 py-0.5 rounded font-mono text-[11px]">
          Port {port}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="brand" className="text-[10px] py-0">
          White-Label Ready
        </Badge>
        {designRef && (
          <span className="text-[#94A3B8] text-[11px] font-mono hidden sm:inline">
            Design Ref: <span className="text-[#38BDF8]">{designRef}</span>
          </span>
        )}
      </div>
    </div>
  );
};
