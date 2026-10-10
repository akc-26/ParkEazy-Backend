import React from 'react';

export interface BaseProps extends React.HTMLAttributes<HTMLElement> { children?: React.ReactNode; className?: string; }
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }: BaseProps & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost'; size?: 'sm' | 'md' | 'lg' }) {
  const colors = variant === 'primary' ? 'bg-teal-700 text-white' : variant === 'secondary' ? 'bg-slate-100 text-slate-800' : variant === 'outline' ? 'border border-slate-300 text-slate-800' : 'text-slate-700';
  return <button className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors ${colors} ${size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-5 py-3' : 'px-4 py-2'} ${className}`} {...props as React.ButtonHTMLAttributes<HTMLButtonElement>}>{children}</button>;
}
export function Badge({ children, variant = 'neutral', className = '', ...props }: BaseProps & { variant?: 'neutral' | 'gold' | 'success' | 'warning' }) {
  const colors = variant === 'gold' ? 'bg-amber-100 text-amber-800' : variant === 'success' ? 'bg-emerald-100 text-emerald-800' : variant === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors} ${className}`} {...props as unknown as React.HTMLAttributes<HTMLSpanElement>}>{children}</span>;
}
export function Card({ children, className = '', padding = 'md', ...props }: BaseProps & { padding?: 'sm' | 'md' | 'lg' }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${padding === 'sm' ? 'p-3' : padding === 'lg' ? 'p-6' : 'p-4'} ${className}`} {...props}>{children}</section>;
}
export function PortalBanner({ title, subtitle, environment, children, className = '', portal, port, designRef }: { title?: string; subtitle?: string; environment?: string; children?: React.ReactNode; className?: string; portal?: string; port?: number; designRef?: string }) {
  return <div className={`border-b border-slate-200 bg-white px-5 py-3 ${className}`}><div className="flex items-center justify-between gap-3"><div>{title && <div className="font-semibold">{title}</div>}{subtitle && <div className="text-sm text-slate-500">{subtitle}</div>}{portal && <div className="text-sm text-slate-500">{portal === 'admin' ? 'Platform Administration' : portal}</div>}{designRef && <span className="sr-only">{designRef}</span>}</div>{(environment || port) && <Badge>{environment || `Port ${port}`}</Badge>}{children}</div></div>;
}
