import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  CalendarCheck,
  Clock,
  Car,
  MapPin,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Star,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  X
} from 'lucide-react';
import { Booking, User, Facility } from '../../types';
import { api } from '../../api';

interface CustomerBookingsProps {
  currentUser: User;
  onRefresh?: () => void;
}

export const CustomerBookings: React.FC<CustomerBookingsProps> = ({
  currentUser,
  onRefresh
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Digital Access Pass Modal
  const [activePassBooking, setActivePassBooking] = useState<Booking | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Extension Modal
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendHours, setExtendHours] = useState(1);
  const [extending, setExtending] = useState(false);

  // Cancellation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [cancelling, setCancelling] = useState(false);

  // Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Dispute Modal
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState<'bay_occupied_on_arrival' | 'overcharge' | 'gate_barrier_malfunction' | 'damage_safety_issue' | 'other'>('bay_occupied_on_arrival');
  const [disputeStatement, setDisputeStatement] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  // Gate feedback
  const [gateActionStatus, setGateActionStatus] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, [currentUser.id]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const list = await api.getBookings();
      setBookings(list);
    } catch (err) {
      console.error('Failed to load customer bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAccessPass = async (booking: Booking) => {
    setActivePassBooking(booking);
    try {
      const url = await QRCode.toDataURL(booking.qrCodeToken || `PKZ_PASS_${booking.id}`, {
        width: 250,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error('Failed to generate QR code', e);
    }
  };

  const handleCheckIn = async (bookingId: string) => {
    try {
      setGateActionStatus('Opening barrier gate...');
      const res = await api.checkInBooking(bookingId);
      setGateActionStatus('Barrier gate opened! Welcome to your bay.');
      await loadBookings();
      if (activePassBooking?.id === bookingId) {
        setActivePassBooking(res.booking);
      }
      setTimeout(() => setGateActionStatus(null), 4000);
    } catch (err: any) {
      alert(err.message);
      setGateActionStatus(null);
    }
  };

  const handleCheckOut = async (bookingId: string) => {
    try {
      setGateActionStatus('Opening departure gate...');
      const res = await api.checkOutBooking(bookingId);
      setGateActionStatus('Gate opened! Thank you for parking with ParkEazy.');
      await loadBookings();
      if (activePassBooking?.id === bookingId) {
        setActivePassBooking(res.booking);
      }
      setTimeout(() => setGateActionStatus(null), 4000);
    } catch (err: any) {
      alert(err.message);
      setGateActionStatus(null);
    }
  };

  const handleExtend = async () => {
    if (!activePassBooking) return;
    try {
      setExtending(true);
      const updated = await api.extendBooking(activePassBooking.id, extendHours);
      setActivePassBooking(updated);
      setShowExtendModal(false);
      await loadBookings();
      alert(`Booking extended by ${extendHours} hour(s) successfully!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setExtending(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!activePassBooking) return;
    try {
      setCancelling(true);
      const updated = await api.cancelBooking(activePassBooking.id, cancelReason);
      setActivePassBooking(updated);
      setShowCancelModal(false);
      await loadBookings();
      alert(`Reservation cancelled. Refund: $${updated.refundAmount?.toFixed(2) || '0.00'}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!activePassBooking) return;
    try {
      setSubmittingReview(true);
      await api.addReview(
        activePassBooking.facilityId,
        activePassBooking.id,
        reviewRating,
        reviewComment
      );
      setShowReviewModal(false);
      setReviewComment('');
      alert('Thank you for rating your parking experience!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!activePassBooking) return;
    try {
      setSubmittingDispute(true);
      await api.createDispute(activePassBooking.id, disputeReason, disputeStatement);
      setShowDisputeModal(false);
      setDisputeStatement('');
      alert('Support dispute submitted. An admin will review and process resolution.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingDispute(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Customer Dashboard
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            My Parking Reservations & Digital Passes
          </h2>
          <p className="text-xs text-slate-500">
            Access gate QR codes, monitor active sessions, extend parking time, or cancel bookings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
            {bookings.length} Total Reservations
          </span>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading your reservations...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            You don't have any reservations yet. Search for parking to reserve a bay!
          </div>
        ) : (
          bookings.map(b => (
            <div
              key={b.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-slate-900 text-base">
                    {b.bookingReference}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                      b.status === 'checked_in'
                        ? 'bg-emerald-100 text-emerald-800'
                        : b.status === 'confirmed'
                        ? 'bg-sky-100 text-sky-800'
                        : b.status === 'completed'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {b.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    {b.vehicleMakeModel} ({b.licensePlate})
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                    {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-semibold text-emerald-700">
                    Paid: ${b.grossAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenAccessPass(b)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Digital Pass & QR</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Digital Access Pass Modal */}
      {activePassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Gate Entry & Departure Pass
              </span>
              <button
                onClick={() => {
                  setActivePassBooking(null);
                  setGateActionStatus(null);
                }}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="mb-2">
              <span className="font-mono text-xs text-sky-600 font-bold">
                {activePassBooking.bookingReference}
              </span>
              <h3 className="font-bold text-slate-900 text-base">
                Hold Screen Up to Barrier Scanner
              </h3>
            </div>

            {/* QR Code Container */}
            <div className="my-3 p-3 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Access Pass" className="w-48 h-48 mx-auto" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Backup Keypad PIN */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Keypad Backup PIN:
              </span>
              <span className="font-mono text-xl font-black text-slate-900 tracking-widest">
                {activePassBooking.gateAccessCode}
              </span>
              <span className="block text-[10px] text-slate-500 mt-0.5">
                License Plate: <strong className="font-mono">{activePassBooking.licensePlate}</strong>
              </span>
            </div>

            {/* Gate Feedback Alert */}
            {gateActionStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3 animate-in fade-in">
                {gateActionStatus}
              </div>
            )}

            {/* Gate Trigger Actions */}
            <div className="space-y-2 text-xs">
              {activePassBooking.status === 'confirmed' && (
                <button
                  onClick={() => handleCheckIn(activePassBooking.id)}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Simulate Arrival / Open Barrier</span>
                </button>
              )}

              {activePassBooking.status === 'checked_in' && (
                <button
                  onClick={() => handleCheckOut(activePassBooking.id)}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simulate Departure / Open Gate</span>
                </button>
              )}

              {/* Auxiliary actions: Extend, Cancel, Review, Dispute */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                {(activePassBooking.status === 'confirmed' || activePassBooking.status === 'checked_in') && (
                  <button
                    onClick={() => setShowExtendModal(true)}
                    className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-center"
                  >
                    Extend Time
                  </button>
                )}

                {activePassBooking.status === 'confirmed' && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-center"
                  >
                    Cancel Booking
                  </button>
                )}

                {activePassBooking.status === 'completed' && (
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold rounded-lg text-center flex items-center justify-center gap-1"
                  >
                    <Star className="w-3 h-3 fill-current" /> Review
                  </button>
                )}

                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="py-1.5 px-2 text-slate-500 hover:text-slate-700 font-medium text-center"
                >
                  Report Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extend Booking Modal */}
      {showExtendModal && activePassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Extend Parking Duration
            </h3>
            <p className="text-slate-500 mb-3">
              Add extra hours to your reservation. Conflict checks are enforced automatically.
            </p>

            <div className="mb-4">
              <label className="block font-semibold text-slate-700 mb-1">
                Additional Hours
              </label>
              <select
                value={extendHours}
                onChange={e => setExtendHours(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              >
                <option value={1}>+1 Hour</option>
                <option value={2}>+2 Hours</option>
                <option value={3}>+3 Hours</option>
                <option value={4}>+4 Hours</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowExtendModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={extending}
                onClick={handleExtend}
                className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg shadow-xs"
              >
                {extending ? 'Extending...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && activePassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Cancel Reservation
            </h3>
            <p className="text-slate-500 mb-3 leading-relaxed">
              Cancellation policy: 100% full refund if &gt;= 2 hours prior to start, or 50% refund within 2 hours.
            </p>

            <div className="mb-4">
              <label className="block font-semibold text-slate-700 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep Booking
              </button>
              <button
                disabled={cancelling}
                onClick={handleCancelBooking}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shadow-xs"
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && activePassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Rate Parking Experience
            </h3>
            <p className="text-slate-500 mb-3">
              Help fellow drivers and host operator with your feedback.
            </p>

            <div className="mb-3">
              <label className="block font-semibold text-slate-700 mb-1">Star Rating</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewRating(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${s <= reviewRating ? 'fill-current text-amber-400' : 'text-slate-200'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block font-semibold text-slate-700 mb-1">Review Comments</label>
              <textarea
                rows={3}
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="How was the entrance clearance, lighting, EV charger, security?"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={submittingReview || !reviewComment.trim()}
                onClick={handleSubmitReview}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-lg"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support / Dispute Modal */}
      {showDisputeModal && activePassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              File Support Dispute Ticket
            </h3>
            <p className="text-slate-500 mb-3">
              If you experienced an access failure or bay issue, our resolution team will review.
            </p>

            <div className="mb-3">
              <label className="block font-semibold text-slate-700 mb-1">Dispute Reason</label>
              <select
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              >
                <option value="bay_occupied_on_arrival">Bay was occupied upon arrival</option>
                <option value="gate_barrier_malfunction">Gate barrier malfunction</option>
                <option value="overcharge">Pricing or rate dispute</option>
                <option value="damage_safety_issue">Facility safety / lighting issue</option>
                <option value="other">Other issue</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block font-semibold text-slate-700 mb-1">Statement & Details *</label>
              <textarea
                rows={3}
                required
                value={disputeStatement}
                onChange={e => setDisputeStatement(e.target.value)}
                placeholder="Explain what happened at the facility..."
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDisputeModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={submittingDispute || !disputeStatement.trim()}
                onClick={handleSubmitDispute}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg"
              >
                {submittingDispute ? 'Submitting...' : 'File Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
