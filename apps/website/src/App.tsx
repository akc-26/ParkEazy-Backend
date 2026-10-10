import React, { useState, useEffect } from 'react';
import { useBrand, BrandProvider } from '@parkeazy/branding';
import { UserAccount, AuthTokenPair } from '@parkeazy/shared-types';
import { CustomerLandingPage } from './pages/CustomerLandingPage';
import { CustomerLoginPage } from './pages/CustomerLoginPage';
import { CustomerSignupPage } from './pages/CustomerSignupPage';
import { CustomerVerifyEmailPage } from './pages/CustomerVerifyEmailPage';
import { CustomerVerifyMobileOtpPage } from './pages/CustomerVerifyMobileOtpPage';
import { CustomerForgotPasswordPage } from './pages/CustomerForgotPasswordPage';
import { CustomerResetPasswordPage } from './pages/CustomerResetPasswordPage';
import { CustomerVerificationRequiredPage } from './pages/CustomerVerificationRequiredPage';
import { CustomerAuthErrorStatesPage } from './pages/CustomerAuthErrorStatesPage';
import { CustomerSessionExpiredPage } from './pages/CustomerSessionExpiredPage';
import { CustomerAccessSuccessPage } from './pages/CustomerAccessSuccessPage';

interface WebsiteAppProps {
  onNavigateToHost?: () => void;
}

export function CustomerWebsiteContent({ onNavigateToHost }: WebsiteAppProps = {}) {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  });

  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('parkeazy_customer_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const navigateTo = (path: string) => {
    if (path.startsWith('/host')) {
      if (onNavigateToHost) {
        onNavigateToHost();
        return;
      }
    }

    if (typeof window !== 'undefined') {
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleAuthSuccess = (user: UserAccount, tokens: AuthTokenPair) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('parkeazy_customer_user', JSON.stringify(user));
      localStorage.setItem('parkeazy_customer_token', tokens.accessToken);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('parkeazy_customer_user');
      localStorage.removeItem('parkeazy_customer_token');
    }
    navigateTo('/login');
  };

  // 1. Customer Login (pe_uw_02_01)
  if (currentPath === '/login') {
    return (
      <CustomerLoginPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
        returnUrl="/auth/success"
      />
    );
  }

  // 2. Customer Signup (pe_uw_02_02)
  if (currentPath === '/signup') {
    return (
      <CustomerSignupPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  // 3. Verify Email (pe_uw_02_03)
  if (currentPath === '/verify-email') {
    return (
      <CustomerVerifyEmailPage
        onNavigate={navigateTo}
        initialEmail={currentUser?.email}
      />
    );
  }

  // 4. Verify Mobile OTP (pe_uw_02_04)
  if (currentPath === '/verify-mobile') {
    return (
      <CustomerVerifyMobileOtpPage
        onNavigate={navigateTo}
        onSuccess={handleAuthSuccess}
        initialPhone={currentUser?.phone}
      />
    );
  }

  // 5. Forgot Password (pe_uw_02_05)
  if (currentPath === '/forgot-password') {
    return <CustomerForgotPasswordPage onNavigate={navigateTo} />;
  }

  // 6. Reset Password (pe_uw_02_06)
  if (currentPath === '/reset-password') {
    return <CustomerResetPasswordPage onNavigate={navigateTo} />;
  }

  // 7. Verification Required (pe_uw_02_07)
  if (currentPath === '/verification-required') {
    return (
      <CustomerVerificationRequiredPage
        currentUser={currentUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
      />
    );
  }

  // 8. Authentication Error States (pe_uw_02_08)
  if (currentPath === '/auth/error') {
    return <CustomerAuthErrorStatesPage onNavigate={navigateTo} />;
  }

  // 9. Session Expired (pe_uw_02_09)
  if (currentPath === '/session-expired') {
    return <CustomerSessionExpiredPage onNavigate={navigateTo} />;
  }

  // 10. Access Success / Account Verified (pe_uw_02_10)
  if (currentPath === '/auth/success' || currentPath === '/access-success') {
    return (
      <CustomerAccessSuccessPage
        currentUser={currentUser}
        onNavigate={navigateTo}
      />
    );
  }

  // Default: Customer Marketplace Landing Page (pe_uw_01_01)
  return (
    <CustomerLandingPage
      currentUser={currentUser}
      onNavigate={navigateTo}
      onLogout={handleLogout}
    />
  );
}

export default function CustomerWebsiteApp() {
  return (
    <BrandProvider>
      <CustomerWebsiteContent />
    </BrandProvider>
  );
}
