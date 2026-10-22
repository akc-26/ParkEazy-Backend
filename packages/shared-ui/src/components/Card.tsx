import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'tinted' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = 'bg-white rounded-2xl border border-[#E4E7EC] transition-all duration-200';

  const paddingClasses: Record<string, string> = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6 sm:p-8',
  };

  const variantClasses: Record<string, string> = {
    default: 'shadow-[0_1px_3px_rgba(16,24,40,0.05),0_1px_2px_rgba(16,24,40,0.03)]',
    elevated: 'shadow-[0_8px_16px_-4px_rgba(16,24,40,0.08),0_4px_6px_-2px_rgba(16,24,40,0.03)]',
    tinted: 'bg-[#F9F9FF] border-[#E9EDFF] shadow-sm',
    interactive:
      'shadow-[0_1px_3px_rgba(16,24,40,0.05)] hover:shadow-[0_8px_16px_-4px_rgba(16,24,40,0.08)] hover:border-[#14B8A6] cursor-pointer',
  };

  return (
    <div
      className={`${baseClasses} ${paddingClasses[padding]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
