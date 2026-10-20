import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import {
  UserAccount,
  ParkingFacility,
  ParkingSpace,
  PricingCalculationResult,
} from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId?: string;
  spaceId?: string;
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function ParkingDetailsBookingSummaryPage({
  facilityId = '10000000-0000-4000-b000-000000000104',
  spaceId = '10000000-0000-4000-b000-000000000104-01',
  currentUser,
  onNavigate,
  onLogout: _onLogout,
}: Props) {
  const { tenant } = useBrand();
  const [facility, setFacility] = useState<ParkingFacility | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(spaceId);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Booking parameters
  const [arrivalDate, setArrivalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [arrivalTime, setArrivalTime] = useState('10:00');
  const [durationHours, setDurationHours] = useState(2);
  const [pricing, setPricing] = useState<PricingCalculationResult | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const fac = await client.facilities.get(facilityId);
        setFacility(fac);

        const spaceList = await client.facilities.getSpaces(facilityId);
        setSpaces(spaceList);
        if (spaceList.length > 0 && !selectedSpaceId) {
          setSelectedSpaceId(spaceList[0].id);
        }
      } catch (err) {
        console.error('Failed to load facility data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [facilityId]);

  useEffect(() => {
    async function calculatePrice() {
      if (!selectedSpaceId) return;
      try {
        const startsAt = new Date(`${arrivalDate}T${arrivalTime}:00Z`).toISOString();
        const endsAt = new Date(new Date(startsAt).getTime() + durationHours * 3600000).toISOString();
        const res = await client.bookings.calculatePricing({
          spaceId: selectedSpaceId,
          startsAt,
          endsAt,
        });
        setPricing(res);
      } catch (err) {
        console.error('Failed to calculate pricing:', err);
      }
    }
    calculatePrice();
  }, [selectedSpaceId, arrivalDate, arrivalTime, durationHours]);

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) || spaces[0];

  const handleContinueToBook = () => {
    const startsAt = new Date(`${arrivalDate}T${arrivalTime}:00Z`).toISOString();
    const endsAt = new Date(new Date(startsAt).getTime() + durationHours * 3600000).toISOString();
    onNavigate(
      `/book/duration?facilityId=${facilityId}&spaceId=${selectedSpaceId}&startsAt=${encodeURIComponent(
        startsAt
      )}&endsAt=${encodeURIComponent(endsAt)}`
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-[#64748B]">Loading facility specifications...</p>
        </div>
      </div>
    );
  }

  const facilityName = facility?.name || 'Secure Covered Parking — Anna Nagar';
  const facilityAddress = facility?.addressLine1 || '2nd Avenue, Near Roundtana, Anna Nagar East, Chennai';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2 cursor-pointer font-extrabold text-xl text-[#0F766E] font-['Plus_Jakarta_Sans']"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white text-sm font-bold">
                P
              </div>
              <span>ParkEazy</span>
            </button>
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#64748B]">
              <button onClick={() => onNavigate('/search')} className="hover:text-[#0F766E] cursor-pointer">
                Find Parking
              </button>
              <button onClick={() => onNavigate('/bookings')} className="hover:text-[#0F766E] cursor-pointer">
                My Bookings
              </button>
              <button onClick={() => onNavigate('/support')} className="hover:text-[#0F766E] cursor-pointer">
                Help &amp; Support
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
              pe_uw_04_01
            </span>
            {currentUser ? (
              <span className="text-xs font-semibold text-[#344054]">{currentUser.fullName}</span>
            ) : (
              <button
                onClick={() => onNavigate('/login')}
                className="text-xs font-bold text-[#0F766E] px-3 py-1.5 rounded-lg border border-[#0F766E] hover:bg-[#E6F7F4]"
              >
                Log In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-semibold text-[#667085] mb-4">
          <button onClick={() => onNavigate('/')} className="hover:text-[#0F766E] cursor-pointer">Home</button>
          <span>›</span>
          <button onClick={() => onNavigate('/search')} className="hover:text-[#0F766E] cursor-pointer">Chennai</button>
          <span>›</span>
          <button onClick={() => onNavigate('/search?location=Anna%20Nagar')} className="hover:text-[#0F766E] cursor-pointer">Anna Nagar</button>
          <span>›</span>
          <span className="text-[#101828] font-bold truncate">{facilityName}</span>
        </nav>

        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
              {facilityName}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-[#667085] mt-1.5">
              <span className="flex items-center gap-1 text-[#D6A84F] font-bold">
                ★ 4.9 <span className="text-[#667085] font-normal">(142 verified reviews)</span>
              </span>
              <span>•</span>
              <span>{facilityAddress}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 bg-[#E6F7F4] text-[#0F766E] px-2 py-0.5 rounded-md font-semibold text-xs">
                ✓ Verified Host
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: facilityName, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Listing link copied to clipboard!');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4E7EC] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F8FAFC] shadow-xs cursor-pointer"
            >
              <span>🔗</span> Share
            </button>
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-xs cursor-pointer transition-all ${
                isSaved
                  ? 'border-[#0F766E] bg-[#E6F7F4] text-[#0F766E]'
                  : 'border-[#E4E7EC] bg-white text-[#344054] hover:bg-[#F8FAFC]'
              }`}
            >
              <span>{isSaved ? '♥' : '♡'}</span> {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Photo Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl overflow-hidden mb-8 h-80">
          <div className="md:col-span-2 relative h-full">
            <img
              src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=80"
              alt="Facility Entrance"
              className="w-full h-full object-cover"
            />
            <span className="absolute bottom-3 left-3 bg-[#101828]/80 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur-xs font-semibold">
              Main Driveway &amp; Gate 2
            </span>
          </div>
          <div className="hidden md:flex flex-col gap-3 h-full">
            <div className="relative flex-1">
              <img
                src="https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=600&q=80"
                alt="Covered Parking Bays"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative flex-1">
              <img
                src="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&w=600&q=80"
                alt="EV Charging Bays"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="hidden md:flex flex-col gap-3 h-full">
            <div className="relative flex-1">
              <img
                src="https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=600&q=80"
                alt="Security Booth"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative flex-1">
              <img
                src="https://images.unsplash.com/photo-1621929747188-0b4dc28498d2?auto=format&fit=crop&w=600&q=80"
                alt="Automatic Boom Barrier"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[#101828]/40 flex items-center justify-center text-white font-bold text-sm">
                +12 Photos
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Main Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Details & Amenities */}
          <div className="lg:col-span-2 space-y-8">
            {/* Host Banner */}
            <div className="bg-white rounded-2xl p-5 border border-[#E4E7EC] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#0F766E] text-white flex items-center justify-center font-bold text-lg">
                  MG
                </div>
                <div>
                  <h3 className="font-bold text-[#141B2C] text-sm sm:text-base font-['Plus_Jakarta_Sans']">
                    Hosted by Metro Grande Properties
                  </h3>
                  <p className="text-xs text-[#667085]">
                    Superhost • 3 years hosting on {tenant.displayName} • 99.8% on-time gate clearance
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex bg-[#E6F7F4] text-[#0F766E] text-xs font-bold px-3 py-1 rounded-full">
                Fast Gate PIN Access
              </span>
            </div>

            {/* Key Facility Highlights */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] space-y-4">
              <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Facility Specifications &amp; Safeguards
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E7EC]">
                  <span className="text-lg">🛡️</span>
                  <div className="text-xs font-bold text-[#141B2C] mt-1">Gated 24/7</div>
                  <div className="text-[11px] text-[#667085]">CCTV &amp; Security</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E7EC]">
                  <span className="text-lg">☂️</span>
                  <div className="text-xs font-bold text-[#141B2C] mt-1">Covered Garage</div>
                  <div className="text-[11px] text-[#667085]">Weather Protected</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E7EC]">
                  <span className="text-lg">⚡</span>
                  <div className="text-xs font-bold text-[#141B2C] mt-1">EV Charging</div>
                  <div className="text-[11px] text-[#667085]">22 kW Type-2 AC</div>
                </div>
                <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E7EC]">
                  <span className="text-lg">📏</span>
                  <div className="text-xs font-bold text-[#141B2C] mt-1">2.4m Height</div>
                  <div className="text-[11px] text-[#667085]">Full SUV Clearance</div>
                </div>
              </div>
            </div>

            {/* Access Directives */}
            <div className="bg-white rounded-2xl p-6 border border-[#E4E7EC] space-y-3">
              <h2 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                Entrance &amp; Arrival Directives
              </h2>
              <p className="text-xs sm:text-sm text-[#344054] leading-relaxed">
                {facility?.entranceInstructions ||
                  'Enter through Gate 2 on 2nd Avenue opposite Anna Nagar Roundtana. The automated boom barrier will scan your cryptographic QR pass or enter the 4-digit PIN code issued upon booking confirmation.'}
              </p>
              <div className="bg-[#E6F7F4] border border-[#BCE8E0] rounded-xl p-3.5 flex items-start gap-3 text-xs text-[#0F766E]">
                <span className="text-base font-bold">ℹ️</span>
                <div>
                  <strong className="block font-bold">Guaranteed Bay Reservation</strong>
                  Your chosen stall will be reserved exclusively with a 15-minute turnaround buffer to guarantee complete vacancy upon arrival.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white rounded-2xl p-6 border border-[#E4E7EC] shadow-sm space-y-5">
              <div className="flex items-baseline justify-between pb-4 border-b border-[#E4E7EC]">
                <div>
                  <span className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                    ₹{selectedSpace?.hourlyRateInr || 40}
                  </span>
                  <span className="text-xs text-[#667085]"> / hour</span>
                </div>
                <span className="text-xs bg-[#E6F7F4] text-[#0F766E] font-bold px-2 py-0.5 rounded">
                  {spaces.filter((s) => s.status === 'available').length || 18} Bays Available
                </span>
              </div>

              {/* Date & Time Picker */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1">Arrival Date</label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1">Start Time</label>
                    <select
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="16:00">04:00 PM</option>
                      <option value="18:00">06:00 PM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#344054] mb-1">Duration</label>
                    <select
                      value={durationHours}
                      onChange={(e) => setDurationHours(Number(e.target.value))}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
                    >
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={3}>3 hours</option>
                      <option value={4}>4 hours</option>
                      <option value={8}>8 hours</option>
                      <option value={24}>24 hours</option>
                    </select>
                  </div>
                </div>

                {/* Selected Bay Selector */}
                <div>
                  <label className="block text-xs font-bold text-[#344054] mb-1">Selected Bay</label>
                  <select
                    value={selectedSpaceId}
                    onChange={(e) => setSelectedSpaceId(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
                  >
                    {spaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.bayIdentifier} ({s.floorLevel}) — ₹{s.hourlyRateInr}/hr
                        {s.hasEvCharger ? ' [EV]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Calculation Breakdown */}
              {pricing && (
                <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-[#E4E7EC] space-y-2 text-xs">
                  <div className="flex justify-between text-[#667085]">
                    <span>Base Fare ({durationHours} hrs × ₹{pricing.hourlyRateInr})</span>
                    <span>₹{pricing.baseAmountInr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#667085]">
                    <span>Platform Service Fee (15%)</span>
                    <span>₹{pricing.platformFeeInr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#667085]">
                    <span>GST (18%)</span>
                    <span>₹{pricing.taxInr.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E4E7EC] flex justify-between font-bold text-[#141B2C] text-sm">
                    <span>Total Payable</span>
                    <span className="text-[#0F766E]">₹{pricing.totalAmountInr.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Continue Button */}
              <button
                onClick={handleContinueToBook}
                className="w-full py-3 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Book</span>
                <span>→</span>
              </button>

              <div className="text-[11px] text-[#667085] text-center space-y-1">
                <p>🔒 10-Minute Hold Lease placed at checkout</p>
                <p>✓ Free cancellation up to 2 hours before start</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
