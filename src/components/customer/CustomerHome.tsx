import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Car,
  KeyRound,
  ShieldCheck,
  Zap,
  ArrowRight,
  Shield,
  Sparkles,
  Timer,
  CheckCircle2,
  X
} from 'lucide-react';
import { Facility, ParkingBay, User, VehicleCompatibility, AvailabilityHold, Booking } from '../../types';
import { LocationCard } from './LocationCard';
import { api } from '../../api';

interface CustomerHomeProps {
  currentUser: User;
  onBookingCreated: (booking: Booking) => void;
  onViewMyBookings: () => void;
  onNavigateToHostPortal: () => void;
}

export const CustomerHome: React.FC<CustomerHomeProps> = ({
  currentUser,
  onBookingCreated,
  onViewMyBookings,
  onNavigateToHostPortal
}) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  // Search Controls State
  const [locationQuery, setLocationQuery] = useState('');
  const [durationHours, setDurationHours] = useState(2);
  const [bayType, setBayType] = useState('ALL');

  // Hold & Reservation Modal State
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [facilityBays, setFacilityBays] = useState<ParkingBay[]>([]);
  const [selectedBay, setSelectedBay] = useState<ParkingBay | null>(null);
  const [activeHold, setActiveHold] = useState<AvailabilityHold | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(600); // 10 minutes

  // Checkout inputs
  const [licensePlate, setLicensePlate] = useState('WA-7BCK99');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('Tesla Model Y (Blue)');
  const [quoteEstimate, setQuoteEstimate] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadFacilities();
  }, []);

  // 10-minute hold countdown timer
  useEffect(() => {
    if (!activeHold) return;
    const interval = setInterval(() => {
      const expiresAt = new Date(activeHold.expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        clearInterval(interval);
        setActiveHold(null);
        setSelectedBay(null);
        alert('Booking hold expired after 10 minutes. The bay has been released.');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeHold]);

  const loadFacilities = async () => {
    try {
      setLoading(true);
      const list = await api.getFacilities({ status: 'active' });
      setFacilities(list);
    } catch (err) {
      console.error('Failed to load facilities', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFacility = async (fac: Facility) => {
    setSelectedFacility(fac);
    try {
      const bays = await api.getBays(fac.id);
      setFacilityBays(bays);
      const firstAvailable = bays.find(b => b.status === 'available');
      if (firstAvailable) {
        await handleSelectBay(firstAvailable, fac);
      }
    } catch (err) {
      console.error('Failed to load bays', err);
    }
  };

  const handleSelectBay = async (bay: ParkingBay, facilityObj?: Facility) => {
    const fac = facilityObj || selectedFacility;
    if (!fac || bay.status !== 'available') return;

    try {
      const now = new Date();
      const end = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
      const startIso = now.toISOString();
      const endIso = end.toISOString();

      const hold = await api.createHold(bay.id, fac.id, startIso, endIso);
      setActiveHold(hold);
      setSelectedBay(bay);

      const quote = await api.getPricingEstimate(fac.id, startIso, endIso, bay.hourlyRateMultiplier);
      setQuoteEstimate(quote);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility || !selectedBay || !licensePlate) return;

    try {
      setBookingLoading(true);
      const now = new Date();
      const end = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      const booking = await api.createBooking({
        facilityId: selectedFacility.id,
        bayId: selectedBay.id,
        licensePlate,
        vehicleMakeModel,
        startTime: now.toISOString(),
        endTime: end.toISOString(),
        idempotencyKey: 'idemp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
      });

      setActiveHold(null);
      setSelectedBay(null);
      setSelectedFacility(null);
      onBookingCreated(booking);
    } catch (err: any) {
      alert('Booking failed: ' + err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const filteredFacilities = facilities.filter(f => {
    if (locationQuery) {
      const q = locationQuery.toLowerCase();
      const matchCity = f.city.toLowerCase().includes(q);
      const matchAddress = f.address.toLowerCase().includes(q);
      const matchName = f.name.toLowerCase().includes(q);
      if (!matchCity && !matchAddress && !matchName) return false;
    }
    if (bayType === 'COVERED' && !f.amenities.covered) return false;
    if (bayType === 'EV_CHARGING' && !f.amenities.evCharging) return false;
    if (bayType === 'ACCESSIBLE' && !f.amenities.wheelchairAccessible) return false;
    return true;
  });

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full space-y-16 sm:space-y-20">
      {/* Hero Section with Search Interface and Invariants Strip */}
      <section className="relative overflow-hidden bg-[#F4F8F7] pt-8 sm:pt-12 pb-12 sm:pb-16 border-b border-[#DEE7E6]">
        <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Contextual Value Proposition & Search Card */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#075762] text-xs font-semibold mb-4 w-fit">
                <span className="w-2 h-2 rounded-full bg-[#087E8A] animate-pulse"></span>
                <span>PARKEAZY VERIFIED PARKING MARKETPLACE</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#162A2D] leading-[1.15] mb-4">
                Zero guessing.{' '}
                <span className="text-[#087E8A]">Guaranteed bays</span> reserved before you drive.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-8 max-w-xl">
                Directly book verified commercial and private parking bays with authoritative hold locks, automated gate codes, and upfront pricing.
              </p>

              {/* Direct Booking Search Card */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const locEl = document.getElementById('locations');
                  if (locEl) locEl.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {/* Destination Input */}
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Destination or Neighborhood
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        placeholder="e.g. Financial District, Pine St, Waterfront"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
                      />
                    </div>
                  </div>

                  {/* Duration Picker */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Booking Duration (1h – 72h)
                    </label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <select
                        value={durationHours}
                        onChange={(e) => setDurationHours(Number(e.target.value))}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
                      >
                        <option value={1}>1.0 Hour (Minimum)</option>
                        <option value={1.5}>1.5 Hours</option>
                        <option value={2}>2.0 Hours</option>
                        <option value={3}>3.0 Hours</option>
                        <option value={4}>4.0 Hours (Half Day)</option>
                        <option value={8}>8.0 Hours (Full Day)</option>
                        <option value={24}>24 Hours (Overnight)</option>
                        <option value={48}>48 Hours</option>
                        <option value={72}>72 Hours (Continuous Max)</option>
                      </select>
                    </div>
                  </div>

                  {/* Space Preference */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Space Preference
                    </label>
                    <div className="relative">
                      <Car className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                      <select
                        value={bayType}
                        onChange={(e) => setBayType(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-hidden focus:border-[#087E8A] focus:ring-1 focus:ring-[#087E8A]"
                      >
                        <option value="ALL">All Available Spaces</option>
                        <option value="COVERED">Covered & Secured Garage</option>
                        <option value="EV_CHARGING">EV Charging Equipped</option>
                        <option value="ACCESSIBLE">Accessible Bay</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">
                    10-minute hold lock guarantee
                  </span>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#087E8A] hover:bg-[#076D77] active:bg-[#075762] text-white text-sm font-semibold px-6 py-2.5 transition-colors shadow-xs"
                  >
                    Search Available Bays
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Architectural Photography Focal Anchor */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative w-full h-full min-h-[340px] sm:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-900">
                {!imageError ? (
                  <img
                    src="/assets/images/hero_parking_bay_1792157347279.jpg"
                    alt="Secured covered parking bay in Seattle Financial District"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-800 text-white text-center">
                    <MapPin className="w-10 h-10 text-teal-400 mb-3" />
                    <div className="font-bold text-sm mb-1">Financial District Covered Facility</div>
                    <div className="text-xs text-slate-400">Bay B2-30 · Reserved automated gate access</div>
                  </div>
                )}

                {/* Verified Badge and Info Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-5 sm:p-7 text-white pointer-events-none">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Verified Financial Tower Facility · Bay B2-30</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-200 leading-snug">
                    Automated gate code entry, 24/7 CCTV surveillance, and reserved space assurance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Proof & Invariants Strip Below Hero Split */}
          <div className="mt-8 sm:mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <div className="text-xs text-slate-500 font-medium">Hold Invariant</div>
              <div className="text-xl font-bold text-[#162A2D] font-mono tabular-nums">
                10 Minutes
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Server-enforced lock</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Duration Bounds</div>
              <div className="text-xl font-bold text-[#162A2D] font-mono tabular-nums">
                1h – 72h
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">30-min increments</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Turnaround Buffer</div>
              <div className="text-xl font-bold text-[#162A2D] font-mono tabular-nums">
                15 Min
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Transition window</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Escrow Security</div>
              <div className="text-xl font-bold text-[#162A2D] font-mono tabular-nums">
                100% Segregated
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Separate deposit ledger</div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Bento */}
      <section id="how-it-works" className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        <div>
          <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-2">
            Architecture & Invariants
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
            Designed for certainty, not parking lot guessing.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 xl:gap-8">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#087E8A] flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono font-bold text-[#087E8A] mb-1">
                01. Authoritative 10-Minute Hold
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Persistent Lock Invariant
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When you pick a bay, the server places a temporary 600-second lock. Other drivers cannot book or race for your space while you review your quote.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#087E8A] flex items-center justify-center mb-4">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono font-bold text-[#087E8A] mb-1">
                02. Physical Bay Identity
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Specific Space Allocation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are allocated an exact physical space (e.g. Level 1, Bay A02) with clear entrance directions, clearance bounds, and gate PIN credentials.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#087E8A] flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono font-bold text-[#087E8A] mb-1">
                03. Double-Entry Escrow Ledger
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Full Financial Auditability
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                100% transparent pricing with automated host earnings, platform fees, and refund debits recorded idempotently on an immutable ledger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Locations Section */}
      <section id="locations" className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-[#075762] uppercase tracking-wider mb-2">
              Verified Inventory
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              Verified Locations & Live Spaces
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
              Server-monitored facilities with active bay telemetry and automated barrier arm gate controllers.
            </p>
          </div>

          <button
            onClick={onViewMyBookings}
            className="text-xs font-semibold text-[#087E8A] hover:text-[#075762] flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>My Active Passes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-xs text-slate-400">Loading verified parking facilities...</div>
        ) : filteredFacilities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-500">
            No locations matched your search criteria. Try modifying your filter preferences.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map((fac) => (
              <LocationCard
                key={fac.id}
                facility={fac}
                onSelect={handleSelectFacility}
              />
            ))}
          </div>
        )}
      </section>

      {/* Hold & Reservation Checkout Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Reserve Parking Space
                </span>
                <h3 className="font-bold text-slate-900 text-lg">
                  {selectedFacility.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedFacility(null);
                  setSelectedBay(null);
                  setActiveHold(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 10-Minute Authoritative Hold Banner */}
              {activeHold && (
                <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#075762] flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-[#087E8A] animate-pulse" />
                    <div>
                      <span className="font-bold text-xs">
                        Authoritative Hold: {selectedBay?.identifier}
                      </span>
                      <span className="block text-[10px] text-teal-700">
                        Space is temporarily locked on server for you.
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-[#087E8A]">
                      {formatTimer(remainingSeconds)}
                    </span>
                    <span className="block text-[9px] text-teal-600 uppercase">Hold Timer</span>
                  </div>
                </div>
              )}

              {/* Physical Bay Picker */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  1. Select a Specific Physical Bay
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-48 overflow-y-auto p-1">
                  {facilityBays.map(bay => {
                    const isAvailable = bay.status === 'available';
                    const isCurrentHold = activeHold?.bayId === bay.id;

                    return (
                      <button
                        key={bay.id}
                        type="button"
                        disabled={!isAvailable && !isCurrentHold}
                        onClick={() => handleSelectBay(bay)}
                        className={`p-3 rounded-xl border text-left text-xs transition-all ${
                          isCurrentHold
                            ? 'bg-[#087E8A] text-white border-[#075762] ring-2 ring-teal-300 shadow-md'
                            : isAvailable
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 hover:border-emerald-400'
                            : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="font-bold">{bay.identifier}</div>
                        <div className="text-[10px] opacity-80">{bay.zone}</div>
                        <div className="mt-1 flex items-center gap-1 text-[9px]">
                          {bay.hasEvCharger && <span>⚡ EV</span>}
                          {bay.isAccessibleADA && <span>♿ ADA</span>}
                          {!isAvailable && !isCurrentHold && (
                            <span className="capitalize">{bay.status}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkout Form */}
              {selectedBay && quoteEstimate && (
                <form onSubmit={handleConfirmReservation} className="space-y-4 pt-4 border-t border-slate-100 text-xs">
                  <h4 className="text-xs font-bold text-slate-800">
                    2. Vehicle Details & Access Confirmation
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Vehicle License Plate *
                      </label>
                      <input
                        type="text"
                        required
                        value={licensePlate}
                        onChange={e => setLicensePlate(e.target.value.toUpperCase())}
                        placeholder="e.g. WA-7BCK99"
                        className="w-full font-mono font-bold uppercase px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A] focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Used for automatic barrier gate opening via license plate camera.
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Vehicle Make & Model
                      </label>
                      <input
                        type="text"
                        value={vehicleMakeModel}
                        onChange={e => setVehicleMakeModel(e.target.value)}
                        placeholder="Tesla Model Y"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#087E8A] focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Pricing Breakdown Summary */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Duration:</span>
                      <span className="font-medium text-slate-800">{quoteEstimate.totalHours} hours</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Base Hourly Rate:</span>
                      <span className="font-medium text-slate-800">${quoteEstimate.baseHourlyRate}/hr</span>
                    </div>
                    {quoteEstimate.appliedSurge > 1.0 && (
                      <div className="flex justify-between text-amber-600 font-medium">
                        <span>Peak Surge Multiplier:</span>
                        <span>{quoteEstimate.appliedSurge}x</span>
                      </div>
                    )}
                    {quoteEstimate.discountApplied > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Discount Applied:</span>
                        <span>-${quoteEstimate.discountApplied.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Taxes & Fees:</span>
                      <span className="font-medium text-slate-800">${quoteEstimate.taxAmount.toFixed(2)}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold text-sm">
                      <span className="text-slate-900">Total Booking Price:</span>
                      <span className="text-[#087E8A] text-lg font-mono">${quoteEstimate.grossAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBay(null);
                        setActiveHold(null);
                      }}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50"
                    >
                      Release Space
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="px-6 py-2.5 bg-[#087E8A] hover:bg-[#076D77] active:bg-[#075762] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-colors"
                    >
                      {bookingLoading ? 'Reserving...' : `Confirm & Reserve for $${quoteEstimate.grossAmount.toFixed(2)}`}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
