import React from 'react';
import { Card } from './Card';

export interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtext?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  subtext,
  icon,
}) => {
  return (
    <Card padding="md" className="flex flex-col justify-between group hover:border-[#14B8A6] transition-all">
      <div className="flex items-center justify-between text-[#667085] mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
          {label}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="flex flex-col mt-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-[#101828] tracking-tight tabular-nums font-['Plus_Jakarta_Sans']">
            {value}
          </span>
          {change && (
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-semibold tabular-nums ${
                isPositive
                  ? 'bg-[#ECFDF3] text-[#027A48]'
                  : 'bg-[#FEF3F2] text-[#B42318]'
              }`}
            >
              {change}
            </span>
          )}
        </div>
        {subtext && <p className="text-xs text-[#667085] mt-1">{subtext}</p>}
      </div>
    </Card>
  );
};
