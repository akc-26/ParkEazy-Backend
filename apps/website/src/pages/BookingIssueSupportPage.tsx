import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  bookingId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function BookingIssueSupportPage({
  bookingId,
  currentUser: _currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [category, setCategory] = useState<'space_blocked' | 'gate_closed' | 'sensor_fault' | 'host_unreachable' | 'other'>('space_blocked');
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('+91 98765 00003');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketResult, setTicketResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const handleSubmitTicket = async () => {
    if (!description.trim()) {
      setErrorMsg('Please describe the issue in detail so facility marshals can respond.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await client.bookings.createSupportTicket(bookingId, {
        category,
        description,
      });
      setTicketResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate(`/bookings/${bookingId}`)}
            className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
          >
            <span>←</span> Back to Booking
          </button>
          <span className="text-xs bg-[#FEF0C7] text-[#DC6803] px-2.5 py-1 rounded-full font-mono font-bold">
            pe_uw_06_08 • Dispute Desk
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Report a Booking Issue
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Experiencing difficulties on-site? Facility supervisors and priority support intervene within minutes.
          </p>
        </div>

        {ticketResult ? (
          <div className="bg-white rounded-3xl p-8 border border-[#E4E7EC] shadow-sm text-center space-y-5">
            <div className="w-14 h-14 bg-[#E6F7F4] text-[#0F766E] rounded-full flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <h2 className="text-xl font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              Dispute Ticket #{ticketResult.id} Created
            </h2>
            <p className="text-xs text-[#475467] leading-relaxed max-w-md mx-auto">
              An on-site facility supervisor has been notified. For blocked stalls, the security marshal will direct you to a complimentary VIP replacement stall immediately.
            </p>
            <div className="p-4 bg-[#F8FAFC] rounded-2xl border border-[#E4E7EC] text-xs space-y-1">
              <div><strong>Status:</strong> {ticketResult.status.toUpperCase()}</div>
              <div><strong>SLA:</strong> Under 5 minutes on-site response</div>
            </div>
            <button
              onClick={() => onNavigate(`/bookings/${bookingId}`)}
              className="py-3 px-6 rounded-xl bg-[#0F766E] text-white font-bold text-xs cursor-pointer"
            >
              Return to Booking Details
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-sm space-y-6">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                What issue are you encountering?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'space_blocked', label: 'Space Blocked by Another Car', icon: '🚗' },
                  { id: 'gate_closed', label: 'Gate Barrier Not Opening', icon: '🚧' },
                  { id: 'sensor_fault', label: 'Sensor Overstay Dispute', icon: '⏱️' },
                  { id: 'host_unreachable', label: 'Host Unreachable at Gate', icon: '📵' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id as any)}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      category === cat.id
                        ? 'border-[#0F766E] bg-[#E6F7F4] ring-1 ring-[#0F766E]'
                        : 'border-[#E4E7EC] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="text-xl mb-1">{cat.icon}</div>
                    <div className="text-xs font-bold text-[#141B2C]">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Issue Description
              </label>
              <textarea
                rows={4}
                value={description}
                placeholder="Provide specific details (e.g. White Swift parked in Bay A-04 plate TN09AB1122)..."
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs font-medium p-3 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
              />
            </div>

            {/* Photo Attachment Simulation */}
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Attach Photo Evidence (Recommended)
              </label>
              <div
                onClick={() => setHasPhoto(!hasPhoto)}
                className="border-2 border-dashed border-[#D0D5DD] rounded-2xl p-4 text-center cursor-pointer hover:bg-[#F8FAFC]"
              >
                <div className="text-xl mb-1">📷</div>
                <span className="text-xs font-bold text-[#0F766E]">
                  {hasPhoto ? 'Photo Attached: vehicle_evidence.jpg (Click to remove)' : 'Tap to capture / upload stall photo'}
                </span>
                <p className="text-[11px] text-[#667085] mt-0.5">Expedites instant re-allocation to a backup stall.</p>
              </div>
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-xs font-bold text-[#344054] uppercase tracking-wider mb-2">
                Callback Phone Number
              </label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
              />
            </div>

            {errorMsg && (
              <div className="bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] p-3 rounded-xl text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Submit & Hotline */}
            <div className="space-y-3 pt-2">
              <button
                disabled={submitting}
                onClick={handleSubmitTicket}
                className="w-full py-3.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span>Dispatching Ticket...</span>
                ) : (
                  <span>Submit Support Ticket &amp; Request Backup Bay</span>
                )}
              </button>

              <button
                onClick={() => alert('Dialing Priority Hotline: +91 44 4800 2900')}
                className="w-full py-3 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#344054] hover:bg-[#F8FAFC] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>📞 Call 24/7 Facility Emergency Desk</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
