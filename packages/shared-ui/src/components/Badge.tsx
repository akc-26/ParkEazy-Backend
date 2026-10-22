import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'brand' | 'gold' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider select-none';

  const variantClasses: Record<BadgeVariant, { bg: string; dotColor: string }> = {
    brand: {
      bg: 'bg-[#E6F7F4] text-[#0F766E] border border-[#0F766E]/20',
      dotColor: 'bg-[#0F766E]',
    },
    success: {
      bg: 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]',
      dotColor: 'bg-[#12B76A]',
    },
    warning: {
      bg: 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]',
      dotColor: 'bg-[#F79009]',
    },
    danger: {
      bg: 'bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]',
      dotColor: 'bg-[#F04438]',
    },
    gold: {
      bg: 'bg-[#FEF6E7] text-[#9A6700] border border-[#FCE2A6]',
      dotColor: 'bg-[#D6A84F]',
    },
    neutral: {
      bg: 'bg-[#F2F4F7] text-[#344054] border border-[#E4E7EC]',
      dotColor: 'bg-[#667085]',
    },
  };

  const current = variantClasses[variant];

  return (
    <span className={`${baseClasses} ${current.bg} ${className}`} {...props}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor} animate-pulse`} />}
      <span>{children}</span>
    </span>
  );
};
