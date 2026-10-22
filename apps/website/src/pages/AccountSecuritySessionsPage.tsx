import React, { useState } from 'react';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
}

interface SessionItem { id: string; device: string; browser: string; ip: string; location: string; lastActive: string; isCurrent: boolean; }

export function AccountSecuritySessionsPage({
  currentUser,
  onNavigate,
  onLogout,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [sessions] = useState<SessionItem[]>([]);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(false);
    setPasswordError('Password change is not connected to a server endpoint yet. No password was changed.');
  };

  const handleRevokeSession = (_sessionId: string) => {
    setPasswordError('Session revocation is not connected to the session service yet. No session was revoked.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              P
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-tight block">ParkEazy</span>
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Reserve &amp; Arrive</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/account/profile')}
            className="text-xs font-semibold text-slate-600 hover:text-teal-800"
          >
            ← Back to Profile
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">pe_uw_07_08</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Account Security &amp; Active Sessions
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Maintain your account credentials, manage active logins, and inspect security access logs.
          </p>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Change Password</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose a strong password with at least 8 characters. Changing your password terminates non-current sessions.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold">
              ✓ Password updated successfully. Security timestamp logged.
            </div>
          )}

          {passwordError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
              ✕ {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            </div>
            <button
              type="submit"
              disabled={changingPassword}
              className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {changingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Active Browser & Device Sessions */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Active Browser &amp; Device Sessions</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Revoke any unrecognized sessions to protect saved payment methods and active parking gate passes.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 && <p className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">Session inventory is not connected to the backend. No real active sessions are being displayed.</p>}
            {sessions.map((sess) => (
              <div
                key={sess.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shrink-0">
                    💻
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{sess.device}</span>
                      {sess.isCurrent && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          THIS DEVICE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {sess.browser} • {sess.location} (IP: {sess.ip})
                    </p>
                    <span className="text-[11px] text-slate-400 mt-1 block font-medium">
                      Last seen: {sess.lastActive}
                    </span>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(sess.id)}
                    className="px-3 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors self-end sm:self-auto"
                  >
                    Revoke Session
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent Security Activity Log */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Recent Security Activity Log
          </h2>
          <p className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">Security activity history is not connected to an authoritative backend audit log. No activity events are fabricated on this screen.</p>
        </div>
      </main>
    </div>
  );
}
