import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Car,
  QrCode,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  XCircle,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Booking, User, Facility } from '../../types';
import { api } from '../../api';

interface HostBookingsProps {
  currentUser: User;
  facilities: Facility[];
}

export const HostBookings: React.FC<HostBookingsProps> = ({
  currentUser,
  facilities
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Gate Barrier Simulation State
  const [gateArmState, setGateArmState] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed');
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [isProcessingGate, setIsProcessingGate] = useState(false);

  useEffect(() => {
    loadBookings();
  }, [currentUser.id]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const list = await api.getBookings();
      setBookings(list);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateCheckIn = async (booking: Booking) => {
    try {
      setIsProcessingGate(true);
      setGateMessage(`Scanning QR / LPR: ${booking.licensePlate}...`);
      setGateArmState('opening');

      await new Promise(r => setTimeout(r, 600));
      const res = await api.checkInBooking(booking.id);
      setGateArmState('open');
      setGateMessage(`Gate barrier OPEN. Customer ${booking.customerName} checked in.`);

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(res.booking);
      }

      // Auto lower barrier after 4s
      setTimeout(() => {
        setGateArmState('closing');
        setTimeout(() => {
          setGateArmState('closed');
          setGateMessage('Barrier closed and secured.');
        }, 800);
      }, 3500);
    } catch (err: any) {
      setGateArmState('closed');
      setGateMessage(`Gate Error: ${err.message}`);
    } finally {
      setIsProcessingGate(false);
    }
  };

  const handleSimulateCheckOut = async (booking: Booking) => {
    try {
      setIsProcessingGate(true);
      setGateMessage(`Departure scan for ${booking.licensePlate}...`);
      setGateArmState('opening');

      await new Promise(r => setTimeout(r, 600));
      const res = await api.checkOutBooking(booking.id);
      setGateArmState('open');
      setGateMessage(`Gate barrier OPEN. Customer checked out. Bay marked available.`);

      await loadBookings();
      if (selectedBooking?.id === booking.id) {
        setSelectedBooking(res.booking);
      }

      setTimeout(() => {
        setGateArmState('closing');
        setTimeout(() => {
          setGateArmState('closed');
          setGateMessage('Barrier closed and secured.');
        }, 800);
      }, 3500);
    } catch (err: any) {
      setGateArmState('closed');
      setGateMessage(`Gate Error: ${err.message}`);
    } finally {
      setIsProcessingGate(false);
    }
  };

  const filtered = bookings.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        b.bookingReference.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.licensePlate.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls & Gate Simulation Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Search and Filters */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Live Bookings & Gate Verification
              </h2>
              <p className="text-xs text-slate-500">
                Track arrivals, departures, customer vehicles, and gate access authorizations.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium"
              >
                <option value="all">All Statuses ({bookings.length})</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Booking Ref (PKZ-...), Customer Name, or License Plate..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Right 1 Col: Visual Automated Barrier Gate Controller */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="font-bold text-sky-400 uppercase tracking-wider text-[10px]">
                IoT Access Controller
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                GATE ONLINE
              </span>
            </div>

            {/* Visual Gate Arm Animation */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden h-24 mb-3">
              {/* Gate Pedestal */}
              <div className="absolute left-8 bottom-3 w-6 h-14 bg-slate-700 rounded-xs flex flex-col items-center justify-start pt-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping mb-1" />
                <div className="w-3 h-5 bg-slate-900 rounded-xs" />
              </div>

              {/* Barrier Arm */}
              <div
                className={`absolute left-12 bottom-12 h-3.5 bg-repeating-linear-gradient rounded-r-md transition-all duration-700 origin-left shadow-lg ${
                  gateArmState === 'open' || gateArmState === 'opening'
                    ? '-rotate-75 w-32 bg-amber-400'
                    : 'rotate-0 w-44 bg-red-500'
                }`}
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 10px, #1e293b 10px, #1e293b 20px)'
                }}
              />

              <div className="absolute right-4 top-2 text-[10px] text-slate-400 font-mono">
                ARM: <span className="font-bold text-white uppercase">{gateArmState}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-300 font-mono bg-slate-800/80 p-2 rounded-lg border border-slate-700 line-clamp-2">
              {gateMessage || 'Awaiting access scan or manual gate command...'}
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading bookings...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No bookings match the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Vehicle & Plate</th>
                  <th className="py-3 px-4">Time Window</th>
                  <th className="py-3 px-4">Earnings</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Gate Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(booking => {
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {booking.bookingReference}
                        <div className="text-[10px] text-slate-400 font-sans font-normal">
                          PIN: <span className="font-mono text-sky-600">{booking.gateAccessCode}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{booking.customerName}</div>
                        <div className="text-[11px] text-slate-400">{booking.customerPhone}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px] border border-slate-200">
                          {booking.licensePlate}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{booking.vehicleMakeModel}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700">
                          {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                          {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(booking.startTime).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-emerald-600 text-sm">
                          +${booking.hostNetEarnings.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Gross: ${booking.grossAmount.toFixed(2)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                            booking.status === 'checked_in'
                              ? 'bg-emerald-100 text-emerald-800'
                              : booking.status === 'confirmed'
                              ? 'bg-sky-100 text-sky-800'
                              : booking.status === 'completed'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {booking.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {booking.status === 'confirmed' && (
                          <button
                            disabled={isProcessingGate}
                            onClick={() => handleSimulateCheckIn(booking)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] rounded-lg shadow-xs transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Open Gate (Check-In)</span>
                          </button>
                        )}

                        {booking.status === 'checked_in' && (
                          <button
                            disabled={isProcessingGate}
                            onClick={() => handleSimulateCheckOut(booking)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] rounded-lg shadow-xs transition-colors"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Open Gate (Check-Out)</span>
                          </button>
                        )}

                        {booking.status === 'completed' && (
                          <span className="text-[11px] text-slate-400 italic">
                            Departed
                          </span>
                        )}

                        {booking.status === 'cancelled' && (
                          <span className="text-[11px] text-rose-500">
                            Refunded ${booking.refundAmount?.toFixed(2) || '0.00'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
