import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  bordered = true,
  className = '',
  ...props
}) => {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }[padding];

  return (
    <div
      className={`bg-white rounded-xl ${bordered ? 'border border-slate-200' : ''} shadow-xs ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
