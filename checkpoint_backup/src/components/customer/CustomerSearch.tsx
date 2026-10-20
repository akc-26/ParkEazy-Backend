import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  Car,
  Zap,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Layers,
  ArrowRight,
  SlidersHorizontal,
  X,
  Lock,
  Timer
} from 'lucide-react';
import { Facility, ParkingBay, User, VehicleCompatibility, AvailabilityHold, Booking } from '../../types';
import { api } from '../../api';

interface CustomerSearchProps {
  currentUser: User;
  onBookingCreated: (booking: Booking) => void;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({
  currentUser,
  onBookingCreated
}) => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);

  // Search Filters
  const [searchCity, setSearchCity] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCompatibility>('sedan');
  const [startTime, setStartTime] = useState('2026-10-20T10:00');
  const [endTime, setEndTime] = useState('2026-10-20T14:00');
  const [filterEv, setFilterEv] = useState(false);
  const [filterCovered, setFilterCovered] = useState(false);
  const [filterAda, setFilterAda] = useState(false);

  // Facility detail & checkout
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [facilityBays, setFacilityBays] = useState<ParkingBay[]>([]);
  const [selectedBay, setSelectedBay] = useState<ParkingBay | null>(null);
  const [activeHold, setActiveHold] = useState<AvailabilityHold | null>(null);
  const [holdSecondsRemaining, setHoldSecondsRemaining] = useState<number>(900); // 15 mins

  // Checkout inputs
  const [licensePlate, setLicensePlate] = useState('WA-7BCK99');
  const [vehicleMakeModel, setVehicleMakeModel] = useState('Tesla Model Y (Blue)');
  const [quoteEstimate, setQuoteEstimate] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    loadFacilities();
  }, []);

  // 15-minute hold timer countdown
  useEffect(() => {
    if (!activeHold) return;
    const interval = setInterval(() => {
      const remainingMs = new Date(activeHold.expiresAt).getTime() - new Date().getTime();
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      setHoldSecondsRemaining(remainingSec);
      if (remainingSec <= 0) {
        clearInterval(interval);
        setActiveHold(null);
        setSelectedBay(null);
        alert('Your 15-minute temporary hold has expired. The bay has been released.');
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

  const handleOpenFacility = async (fac: Facility) => {
    setSelectedFacility(fac);
    try {
      const bays = await api.getBays(fac.id);
      setFacilityBays(bays);
    } catch (err) {
      console.error('Failed to load bays', err);
    }
  };

  const handleSelectBay = async (bay: ParkingBay) => {
    if (bay.status !== 'available') return;
    if (!selectedFacility) return;

    try {
      // Create 15-minute availability hold on backend
      const startIso = new Date(startTime).toISOString();
      const endIso = new Date(endTime).toISOString();
      const hold = await api.createHold(bay.id, selectedFacility.id, startIso, endIso);
      setActiveHold(hold);
      setSelectedBay(bay);

      // Calculate quote
      const quote = await api.getPricingEstimate(selectedFacility.id, startIso, endIso, bay.hourlyRateMultiplier);
      setQuoteEstimate(quote);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFacility || !selectedBay || !licensePlate) return;

    try {
      setBookingLoading(true);
      const startIso = new Date(startTime).toISOString();
      const endIso = new Date(endTime).toISOString();

      const booking = await api.createBooking({
        facilityId: selectedFacility.id,
        bayId: selectedBay.id,
        licensePlate,
        vehicleMakeModel,
        startTime: startIso,
        endTime: endIso,
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
    if (searchCity && !f.city.toLowerCase().includes(searchCity.toLowerCase()) && !f.address.toLowerCase().includes(searchCity.toLowerCase())) {
      return false;
    }
    if (filterEv && !f.amenities.evCharging) return false;
    if (filterCovered && !f.amenities.covered) return false;
    if (filterAda && !f.amenities.wheelchairAccessible) return false;
    return true;
  });

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl text-white">
        <div className="max-w-3xl">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
            Verified Parking Locations
          </span>
          <h1 className="text-2xl font-bold tracking-tight mt-2">
            Find & Reserve Guaranteed Parking
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Browse live bays with automated barrier gates, EV fast chargers, and 15-minute reservation holds.
          </p>
        </div>

        {/* Search Inputs Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Destination City or Street</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="e.g. Seattle, Pine St"
                value={searchCity}
                onChange={e => setSearchCity(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-sky-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Vehicle Type</label>
            <select
              value={selectedVehicle}
              onChange={e => setSelectedVehicle(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-sky-400"
            >
              <option value="sedan">Sedan / Standard</option>
              <option value="suv">SUV / Crossover</option>
              <option value="ev">Electric Vehicle (EV)</option>
              <option value="motorcycle">Motorcycle</option>
              <option value="compact">Compact / Hatchback</option>
              <option value="van_truck">Van / Pickup</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Entry Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-300 mb-1">Exit Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-1 focus:ring-sky-400"
            />
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filterEv}
              onChange={e => setFilterEv(e.target.checked)}
              className="rounded text-sky-500"
            />
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>EV Charging</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filterCovered}
              onChange={e => setFilterCovered(e.target.checked)}
              className="rounded text-sky-500"
            />
            <span>Covered / Indoor</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={filterAda}
              onChange={e => setFilterAda(e.target.checked)}
              className="rounded text-sky-500"
            />
            <span>ADA Accessible</span>
          </label>
        </div>
      </div>

      {/* Facilities Search Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Found {filteredFacilities.length} parking facilities available</span>
          <span className="font-medium text-slate-700">All prices include automated gate access pass</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Searching parking facilities...</div>
        ) : filteredFacilities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
            No parking locations match your current filters. Try adjusting city or vehicle options.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map(fac => (
              <div
                key={fac.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={fac.photos[0] || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'}
                      alt={fac.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-white text-[11px] font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {fac.activeBays} Bays Live Available
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-1">
                      {fac.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-1">{fac.address}, {fac.city}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                      <div>
                        <span className="text-slate-400 block">Clearance:</span>
                        <span className="font-semibold text-slate-800">{fac.clearanceHeightMeters}m</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Gate Access:</span>
                        <span className="font-semibold text-slate-800 capitalize">
                          {fac.gateType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {fac.amenities.evCharging && (
                        <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" /> EV Fast Charge
                        </span>
                      )}
                      {fac.amenities.covered && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          Covered
                        </span>
                      )}
                      {fac.amenities.securityGuard && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          Security Guard
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() => handleOpenFacility(fac)}
                    className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <span>View Bays & Reserve</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Facility Bay Picker & 15-Minute Hold Checkout Modal */}
      {selectedFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
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
              {/* 15-Minute Live Hold Banner */}
              {activeHold && (
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 flex items-center justify-between animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-sky-600 animate-pulse" />
                    <div>
                      <span className="font-bold text-xs">
                        Space Held Exclusively for You: {selectedBay?.identifier}
                      </span>
                      <span className="block text-[10px] text-sky-700">
                        Other drivers cannot book this bay while your hold is active.
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-sky-700">
                      {formatTimer(holdSecondsRemaining)}
                    </span>
                    <span className="block text-[9px] text-sky-600 uppercase">Hold Timer</span>
                  </div>
                </div>
              )}

              {/* Bay Selection Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">
                  1. Select an Available Parking Bay
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
                            ? 'bg-sky-500 text-white border-sky-600 ring-2 ring-sky-300 shadow-md'
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
                <form onSubmit={handleConfirmBooking} className="space-y-4 pt-4 border-t border-slate-100 text-xs">
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
                        className="w-full font-mono font-bold uppercase px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Used for automatic barrier gate opening (LPR camera).
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
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
                      <span>Base Rate:</span>
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
                      <span className="text-sky-600 text-lg">${quoteEstimate.grossAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBay(null);
                        setActiveHold(null);
                      }}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600"
                    >
                      Cancel Hold
                    </button>
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition-colors"
                    >
                      {bookingLoading ? 'Reserving...' : `Confirm & Pay $${quoteEstimate.grossAmount.toFixed(2)}`}
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
