import React from 'react';
import { ArrowLeft, MapPinOff } from 'lucide-react';
import { Button } from '../packages/ui';

interface NotFoundPageProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ currentPath, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F4F8F7] flex flex-col items-center justify-center p-6 text-[#162A2D]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-[#087E8A]">
          <MapPinOff className="w-7 h-7" />
        </div>

        <div className="text-xs font-mono font-bold text-[#087E8A] uppercase tracking-wider mb-1">
          404 — Route Not Found
        </div>

        <h1 className="text-2xl font-extrabold text-[#162A2D] tracking-tight mb-3">
          Page does not exist
        </h1>

        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          The requested URL path <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">{currentPath}</code> is not a valid endpoint in the ParkEazy marketplace or workspaces.
        </p>

        <div className="space-y-2">
          <Button
            variant="primary"
            themeContext="user"
            className="w-full gap-2 py-2.5"
            onClick={() => onNavigate('/')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Driver Marketplace</span>
          </Button>

          <Button
            variant="outline"
            className="w-full py-2.5 text-xs text-slate-600"
            onClick={() => onNavigate('/host/')}
          >
            Open Host Portal
          </Button>
        </div>
      </div>
    </div>
  );
};
