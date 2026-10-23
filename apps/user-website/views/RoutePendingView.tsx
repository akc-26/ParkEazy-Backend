import React from 'react';
import {
  Search,
  MapPin,
  Clock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  CalendarCheck,
  User as UserIcon,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Car,
  Lock,
} from 'lucide-react';
import { Button, Badge } from '../../../packages/ui';
import { SessionUser } from '../../../packages/contracts';

interface BasePendingViewProps {
  onNavigate: (path: string) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
}

// 1. Search Screen Pending View (/search)
export const SearchPendingView: React.FC<
  BasePendingViewProps & { searchParams: URLSearchParams }
> = ({ onNavigate, searchParams }) => {
  const query = searchParams.get('q') || searchParams.get('city') || '';
  const duration = searchParams.get('duration') || '';
  const bayType = searchParams.get('bayType') || '';

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">Search Spaces</span>
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
              <Search className="w-3.5 h-3.5" />
              <span>Milestone 3 — Discovery & Search</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              Search & Filter Marketplace
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Route <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">/search</code> resolved and ready for Milestone 3 filter implementation.
            </p>
          </div>
          <Badge variant="info">REQ-SR-01</Badge>
        </div>

        {/* Query Parameter Context Preserved */}
        {(query || duration || bayType) && (
          <div className="bg-[#F4F8F7] rounded-xl p-4 border border-teal-100 space-y-2">
            <div className="text-xs font-bold text-[#075762] uppercase tracking-wider">
              Preserved Search Intent
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {query && (
                <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-700">
                  Destination: <strong>{query}</strong>
                </span>
              )}
              {duration && (
                <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-700">
                  Duration: <strong>{duration}h</strong>
                </span>
              )}
              {bayType && (
                <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-700">
                  Type: <strong>{bayType}</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Feature Scope Roadmap Notice */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Milestone 3 Scope Under Active Implementation:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-800 mb-1">
                Refinement Bar & Drawer
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                City selector, booking date & time bounds, EV charging toggle, and covered garage amenities filters.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-800 mb-1">
                Dynamic Sorting
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sort locations by hourly rate (low-to-high, high-to-low), user rating, and walking distance.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-800 mb-1">
                Live Inventory Cards
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Live queries to <code className="font-mono text-[11px]">/api/v1/inventory/locations</code> with active filter chips and count indicator.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            themeContext="user"
            onClick={() => onNavigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse Featured Spaces on Homepage</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('/spaces/loc-dt-001')}
            className="gap-2"
          >
            <span>Preview Sample Space Details</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// 2. Parking Space Details Screen Pending View (/spaces/:id)
export const SpaceDetailsPendingView: React.FC<
  BasePendingViewProps & { spaceId: string }
> = ({ onNavigate, spaceId }) => {
  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => onNavigate('/search')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Spaces
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">{spaceId}</span>
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>Milestone 3 — Space Details & Bay Selection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              Parking Space Details
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Discrete Space ID <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-[#087E8A]">{spaceId}</code> preserved from route path.
            </p>
          </div>
          <Badge variant="info">REQ-PD-01</Badge>
        </div>

        {/* Architecture Notice */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Milestone 3 / 4 Implementation Blueprint:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-800 mb-1">
                Discrete Bay List
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connects to <code className="font-mono text-[11px]">/api/v1/inventory/locations/:id/bays</code> to display physical bays with level, bay number, and EV specs.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-800 mb-1">
                10-Minute Hold Lock
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trigger authoritative server hold via <code className="font-mono text-[11px]">POST /api/v1/bookings/hold</code> to guarantee space reservation during checkout.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs font-bold text-slate-800 mb-1">
                Access & Security Policies
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Displays verified gate PIN codes, CCTV coverage, clearance height, and host access rules.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            themeContext="user"
            onClick={() => onNavigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('/search')}
          >
            Browse Other Locations
          </Button>
        </div>
      </div>
    </div>
  );
};

// 3. Booking Review Screen Pending View (/booking/review)
export const BookingReviewPendingView: React.FC<BasePendingViewProps> = ({
  onNavigate,
}) => {
  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">Booking Review</span>
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Milestone 5 — Booking Review & Hold Lock</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              Reservation Review & Quote Snapshot
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Route <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">/booking/review</code> resolved.
            </p>
          </div>
          <Badge variant="info">REQ-BR-01</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Authoritative Quote
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Base price, 15% platform fee, 10% taxes, and segregated escrow security deposit breakdown.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Live 600s Hold Lock
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Persistent 10-minute hold countdown timer enforced by backend hold registry.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Vehicle Registration
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              License plate input and validation with driver session prefill.
            </p>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <Button
            variant="primary"
            themeContext="user"
            onClick={() => onNavigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// 4. Checkout Screen Pending View (/checkout)
export const CheckoutPendingView: React.FC<BasePendingViewProps> = ({
  onNavigate,
}) => {
  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">Checkout</span>
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Milestone 5 — Checkout & Escrow Settlement</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              Payment & Idempotent Confirmation
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Route <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">/checkout</code> resolved.
            </p>
          </div>
          <Badge variant="info">REQ-CO-01</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Double-Entry Ledger
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Segregates driver security deposits in escrow from platform revenue and host payouts.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Server Payment Intent
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Integrates <code className="font-mono text-[11px]">POST /api/v1/payments/intent</code> with client-safe payment tokens.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Idempotency Protection
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cryptographic idempotency keys prevent double billing during network interruptions.
            </p>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-3">
          <Button
            variant="primary"
            themeContext="user"
            onClick={() => onNavigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// 5. Booking Confirmation Screen Pending View (/booking/confirmation/:id)
export const BookingConfirmationPendingView: React.FC<
  BasePendingViewProps & { bookingId: string }
> = ({ onNavigate, bookingId }) => {
  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <button
          type="button"
          onClick={() => onNavigate('/bookings')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Bookings
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">Confirmation</span>
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Milestone 5 — Confirmed Booking Receipt</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              Booking Confirmation & Digital Pass
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Booking Identifier <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-[#087E8A]">{bookingId}</code> preserved from path.
            </p>
          </div>
          <Badge variant="success">REQ-BC-01</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Authoritative Reference
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Validates server record with receipt generation and idempotency on browser refresh.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Digital Access Pass
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated gate PIN, QR access pass preview, and navigation instructions.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="text-xs font-bold text-slate-800 mb-1">
              Receipt & Print View
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Downloadable tax invoice with segregated deposit line item.
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            themeContext="user"
            onClick={() => onNavigate('/bookings')}
            className="gap-2"
          >
            <span>View All My Bookings</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => onNavigate('/')}
          >
            Return to Homepage
          </Button>
        </div>
      </div>
    </div>
  );
};

// 6. User Bookings Screen Pending View (/bookings)
export const BookingsPendingView: React.FC<BasePendingViewProps> = ({
  onNavigate,
  onOpenAuthModal,
  currentUser,
}) => {
  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">My Bookings</span>
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Milestone 6 — Customer Bookings Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              My Reservations & Access Passes
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Route <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">/bookings</code> resolved and linked to customer session.
            </p>
          </div>
          <Badge variant="info">REQ-UB-01</Badge>
        </div>

        {/* Authentication-Aware Status */}
        {currentUser ? (
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#087E8A] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {currentUser.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {currentUser.firstName} {currentUser.lastName}
                </div>
                <div className="text-xs text-slate-600">
                  {currentUser.email} · Driver Account ({currentUser.id})
                </div>
              </div>
            </div>
            <Badge variant="success">Authenticated</Badge>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                Authentication Required
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Please sign in with your customer account to view your active reservations and gate PIN codes.
              </p>
            </div>
            <Button
              variant="primary"
              themeContext="user"
              size="sm"
              onClick={onOpenAuthModal}
              className="shrink-0"
            >
              Sign In as Driver
            </Button>
          </div>
        )}

        {/* Status Filter Tabs Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-500 overflow-x-auto">
            <span className="px-3 py-1.5 rounded-lg bg-teal-50 text-[#087E8A]">
              All Reservations (0)
            </span>
            <span className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer">
              Active (0)
            </span>
            <span className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer">
              Upcoming (0)
            </span>
            <span className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer">
              Completed (0)
            </span>
            <span className="px-3 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer">
              Cancelled (0)
            </span>
          </div>

          <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl">
            <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              No Active Reservations Recorded
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              When bookings are created through the checkout journey, they will populate here with live status badges, PIN codes, and cancellation options.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('/')}
            >
              Find a Parking Bay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 7. Profile Screen Pending View (/profile)
export const ProfilePendingView: React.FC<
  BasePendingViewProps & { onSignOut: () => void }
> = ({ onNavigate, onOpenAuthModal, currentUser, onSignOut }) => {
  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">Profile & Settings</span>
      </nav>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
              <UserIcon className="w-3.5 h-3.5" />
              <span>Milestone 6 — Customer Profile & Vehicles</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              Driver Account & Preferences
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Route <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">/profile</code> resolved.
            </p>
          </div>
          <Badge variant="info">REQ-PR-01</Badge>
        </div>

        {currentUser ? (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Full Name
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {currentUser.firstName} {currentUser.lastName}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Email Address
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5">
                  {currentUser.email}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  User Role
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-0.5 capitalize">
                  {currentUser.roles?.[0] || 'Customer'}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Account ID
                </div>
                <div className="text-xs font-mono font-semibold text-slate-700 mt-0.5">
                  {currentUser.id}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <Car className="w-4 h-4 text-[#087E8A]" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Registered Vehicles Preview (Milestone 6)
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                Manage license plates, vehicle makes, and default payment methods for one-click checkout.
              </p>
              <div className="text-xs text-slate-500 italic">
                Demo Vehicle: Tesla Model 3 · Plate: 7XYZ890 (Pre-linked)
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('/')}
              >
                Return to Homepage
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onSignOut}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 space-y-4">
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
                Authentication Required
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Please sign in with your customer account to view or edit your profile and registered vehicles.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                themeContext="user"
                size="sm"
                onClick={onOpenAuthModal}
              >
                Sign In as Driver
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('/')}
              >
                Return to Homepage
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
