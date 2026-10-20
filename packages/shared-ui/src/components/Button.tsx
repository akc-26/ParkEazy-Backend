import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'destructive' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 disabled:opacity-50 disabled:cursor-not-allowed select-none cursor-pointer';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 rounded-[6px] gap-1.5 h-8',
    md: 'text-sm px-4 py-2 rounded-[8px] gap-2 h-10 font-semibold',
    lg: 'text-base px-5 py-2.5 rounded-[8px] gap-2.5 h-12 font-semibold',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-[#0F766E] text-white hover:bg-[#115E59] hover:-translate-y-0.5 shadow-sm active:translate-y-0 active:bg-[#0D4E4A]',
    secondary:
      'bg-white text-[#344054] border border-[#E4E7EC] hover:bg-[#F8FAFC] hover:border-[#D0D5DD] shadow-sm active:bg-[#F1F3FF]',
    outline:
      'bg-transparent text-[#0F766E] border border-[#0F766E]/40 hover:bg-[#E6F7F4] hover:border-[#0F766E]',
    subtle:
      'bg-transparent text-[#0F766E] hover:bg-[#E6F7F4] active:bg-[#CCF0E9]',
    destructive:
      'bg-white text-[#F04438] border border-[#FECDCA] hover:bg-[#FEF3F2] active:bg-[#FEE4E2]',
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : (
        icon && <span className="inline-flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
    </button>
  );
};
