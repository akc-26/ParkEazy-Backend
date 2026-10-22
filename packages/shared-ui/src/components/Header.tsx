import React from 'react';
import { useBrand } from '@parkeazy/branding';
import { BrandLogo } from './BrandLogo';
import { Button } from './Button';

export interface HeaderNavAction {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'subtle';
  active?: boolean;
}

export interface HeaderProps {
  navLinks?: HeaderNavAction[];
  rightActions?: React.ReactNode;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  navLinks = [],
  rightActions,
  subtitle,
}) => {
  const { tenant } = useBrand();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E4E7EC] shadow-[0_1px_4px_rgba(16,24,40,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <BrandLogo size="md" showTagline={false} />
          {subtitle && (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#E4E7EC]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                {subtitle}
              </span>
            </div>
          )}

          {navLinks.length > 0 && (
            <nav className="hidden lg:flex items-center gap-6 ml-4">
              {navLinks.map((link, idx) => (
                <button
                  key={idx}
                  onClick={link.onClick}
                  className={`text-sm font-medium transition-colors ${
                    link.active
                      ? 'text-[#0F766E] font-semibold border-b-2 border-[#0F766E] pb-1 pt-1'
                      : 'text-[#344054] hover:text-[#101828]'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {rightActions ? (
            rightActions
          ) : (
            <>
              <Button variant="secondary" size="sm">
                Log In
              </Button>
              <Button variant="primary" size="sm">
                Sign Up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
