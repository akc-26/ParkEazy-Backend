import React, { useState } from 'react';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
}

export function PrivacyConsentsClosurePage({
  currentUser,
  onNavigate,
  onLogout,
}: Props) {
  const [dataConsent, setDataConsent] = useState(false);
  const [locationConsent, setLocationConsent] = useState(false);
  const [anprConsent, setAnprConsent] = useState(false);

  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureReason, setClosureReason] = useState('no_longer_needed');
  const [confirmText, setConfirmText] = useState('');
  const [closureSubmitted, setClosureSubmitted] = useState(false);
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  const handleDownloadExport = () => {
    setDownloadingExport(false);
    setOperationError('A server-backed personal-data export is not available yet. No export file was generated.');
  };

  const handleExecuteClosure = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'DELETE') return;
    setClosureSubmitted(false);
    setOperationError('Account closure is not connected to a server-side deletion workflow. Your account has not been deleted.');
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
        {operationError && <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold" role="alert">{operationError}</div>}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">pe_uw_07_09</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Privacy, Consents &amp; Account Closure
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Exercise your statutory rights under the Digital Personal Data Protection Act (DPDP Act) and manage account lifecycle.
          </p>
        </div>

        {/* Section 1: Data Governance & Export */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Data Governance &amp; Export</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Download a machine-readable archive of all trip records, payment receipts, and vehicle telemetry.
              </p>
            </div>
            <button
              onClick={handleDownloadExport}
              disabled={downloadingExport}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
            >
              <span>{downloadingExport ? 'Preparing Archive...' : 'Download Data Archive (JSON)'}</span>
              <span>📥</span>
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">DPDP Act Compliance Statement</span>
            <p>
              The production data-storage, encryption, and retention details must be confirmed in ParkEazy's published privacy policy. This screen does not make unverified claims about infrastructure or statutory retention periods.
            </p>
          </div>
        </div>

        {/* Section 2: Consents */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Legal Consents &amp; Operational Processing</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These consent preferences are not yet connected to persistent server-side settings. Changing them in this screen would not change how services process data.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Facility access and vehicle-recognition processing</span>
                <span className="text-slate-500">Allow facility cameras to match registered license plate for touchless entry</span>
              </div>
              <input
                type="checkbox"
                checked={anprConsent}
                onChange={(e) => setAnprConsent(e.target.checked)}
                disabled
                aria-label="ANPR consent unavailable until preferences are connected"
                className="w-5 h-5 text-teal-700 rounded focus:ring-teal-700"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="font-bold text-slate-900 block">Precise Geolocation for Turnstile Proximity</span>
                <span className="text-slate-500">Auto-unlock parking barcode pass when within 50 meters of barrier gate</span>
              </div>
              <input
                type="checkbox"
                checked={locationConsent}
                onChange={(e) => setLocationConsent(e.target.checked)}
                disabled
                aria-label="Location consent unavailable until preferences are connected"
                className="w-5 h-5 text-teal-700 rounded focus:ring-teal-700"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <span className="font-bold text-slate-900 block">Statistical Commute Analytics</span>
                <span className="text-slate-500">Anonymized traffic load metrics used to optimize facility pricing</span>
              </div>
              <input
                type="checkbox"
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
                disabled
                aria-label="Data processing consent unavailable until preferences are connected"
                className="w-5 h-5 text-teal-700 rounded focus:ring-teal-700"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Destructive Zone - Account Closure */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-rose-200 shadow-sm space-y-4">
          <div className="border-b border-rose-100 pb-3">
            <h2 className="text-base font-bold text-rose-800">Close Your ParkEazy Customer Account</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Account closure is not connected to a server-side deletion workflow in this release.
            </p>
          </div>

          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-2">
            <span className="font-bold block">Warning: Irreversible Account Deletion</span>
            <ul className="list-disc pl-5 space-y-1">
              <li>Active bookings must be cancelled or completed before account deletion.</li>
              <li>Any payment or refund balances must be resolved through the payment provider before account closure.</li>
              <li>Account deletion and identity-data removal are not performed by this screen.</li>
            </ul>
          </div>

          <button
            onClick={() => setShowClosureModal(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            Initiate Account Deletion
          </button>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showClosureModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in">
            {closureSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="text-3xl">👋</div>
                <h3 className="font-bold text-base text-slate-900">Account Terminated</h3>
                <p className="text-xs text-slate-500">
                  Your customer profile and session have been destroyed. Logging out...
                </p>
              </div>
            ) : (
              <form onSubmit={handleExecuteClosure} className="space-y-4">
                <h3 className="font-extrabold text-lg text-rose-700">Confirm Account Closure</h3>
                <p className="text-xs text-slate-600">
                  Are you absolutely sure? To confirm permanent deletion, select a reason and type <strong className="font-mono text-slate-900">DELETE</strong> below.
                </p>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Leaving</label>
                  <select
                    value={closureReason}
                    onChange={(e) => setClosureReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="no_longer_needed">No longer commute in serviced cities</option>
                    <option value="privacy_concerns">Privacy or data governance reasons</option>
                    <option value="found_alternative">Using alternative parking option</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Type <code className="font-bold text-rose-700">DELETE</code> to confirm
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="DELETE"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowClosureModal(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirmText !== 'DELETE'}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    Permanently Delete Account
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
