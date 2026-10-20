import React, { useState } from 'react';
import { Mail, Lock, UserCheck, AlertCircle } from 'lucide-react';
import { Modal, Button, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { SessionUser } from '../../../packages/contracts';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: SessionUser) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [email, setEmail] = useState('driver@parkeazy.com');
  const [password, setPassword] = useState('••••••••');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await apiClient.login(email, password, 'user');
      onSuccess(response.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await apiClient.login(demoEmail, 'demo-pass', 'user');
      onSuccess(response.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Quick login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Customer Sign In"
      description="Access your bookings, vehicle registrations, and parking receipts."
      maxWidth="sm"
    >
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Button
          type="submit"
          variant="primary"
          themeContext="user"
          className="w-full"
          isLoading={isLoading}
        >
          Sign In as Driver
        </Button>
      </form>

      {/* Quick Demo Credentials for Reviewers */}
      <div className="mt-5 pt-4 border-t border-slate-200">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Instant Baseline Credentials
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => handleQuickDemo('driver@parkeazy.com')}
            className="text-left px-3 py-1.5 text-xs rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-between"
          >
            <span>Driver (Customer Role)</span>
            <span className="font-mono text-[10px] text-slate-500">driver@parkeazy.com</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
