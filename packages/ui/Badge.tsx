import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'default';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  const effectiveVariant = variant === 'default' ? 'neutral' : variant;
  const variantStyles = {
    neutral: 'text-slate-600 bg-slate-100 border-slate-200',
    success: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-800 bg-amber-50 border-amber-200',
    danger: 'text-red-700 bg-red-50 border-red-200',
    info: 'text-blue-700 bg-blue-50 border-blue-200',
  }[effectiveVariant];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
};
