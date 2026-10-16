import React from 'react';

export interface TabOption {
  id: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  options: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  options,
  activeId,
  onChange,
  className = '',
}) => {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 ${className}`}
    >
      {options.map((option) => {
        const isActive = option.id === activeId;
        return (
          <button
            key={option.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              isActive
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={`ml-1.5 font-mono text-[11px] tabular-nums ${
                  isActive ? 'text-slate-900' : 'text-slate-400'
                }`}
              >
                ({option.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
