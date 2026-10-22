import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, UserVehicle, ParkingFacility, BookingDetailsResponse } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
}

export function UserProfileOverviewPage({
  currentUser,
  onNavigate,
  onLogout,
}: Props) {
  const { tenant } = useBrand();
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [favorites, setFavorites] = useState<ParkingFacility[]>([]);
  const [bookings, setBookings] = useState<BookingDetailsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const client = React.useMemo(() => new ParkEazyApiClient({ baseUrl: '/api/v1' }), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      client.vehicles.list(),
      client.favorites.list(),
      client.bookings.getMyBookings(),
    ])
      .then(([vehicleResult, favoriteResult, bookingResult]) => {
        if (!active) return;
        const failures: string[] = [];
        if (vehicleResult.status === 'fulfilled') setVehicles(vehicleResult.value);
        else failures.push('vehicles');
        if (favoriteResult.status === 'fulfilled') setFavorites(favoriteResult.value);
        else failures.push('saved places');
        if (bookingResult.status === 'fulfilled') setBookings(bookingResult.value);
        else failures.push('bookings');
        setLoadError(failures.length ? `Some account information could not be loaded (${failures.join(', ')}). Please refresh or try again.` : null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client]);

  const fullName = currentUser?.fullName || 'Your account';
  const email = currentUser?.email || ''; 
  const phone = currentUser?.phone || '';
  const completedBookings = bookings.filter((booking) => booking.status === 'completed');
  const activeBookings = bookings.filter((booking) => booking.status === 'active');
  const memberSince = currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Not available';
  const isVerifiedDriver = Boolean(currentUser?.isEmailVerified && currentUser?.isPhoneVerified);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
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
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <button onClick={() => onNavigate('/explore')} className="hover:text-teal-800">Find Parking</button>
            <button onClick={() => onNavigate('/bookings')} className="hover:text-teal-800">My Bookings</button>
            <button onClick={() => onNavigate('/account/notifications')} className="hover:text-teal-800">Notifications</button>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              {isVerifiedDriver ? 'Verified Driver' : 'Verification pending'}
            </span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button onClick={() => onNavigate('/')} className="hover:text-teal-800">Home</button>
          <span>/</span>
          <span className="text-slate-800 font-semibold">Account Overview</span>
        </div>

        {/* Profile Header Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-teal-800 text-white flex items-center justify-center text-3xl font-extrabold shadow-md">
                {fullName.charAt(0)}
              </div>
              {isVerifiedDriver && <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow" title="Verified Driver">✓</span>}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">pe_uw_07_01</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {fullName}
                </h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${currentUser?.status === 'active' ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
                  {currentUser?.status === 'active' ? 'Active Account' : (currentUser?.status || 'Account status unavailable').replaceAll('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
                <span>📞 {phone}</span>
                <span>•</span>
                <span>✉️ {email}</span>
                <span>•</span>
                <span>🗓️ Member since {memberSince}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate('/account/profile/edit')}
              className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Edit Personal Details
            </button>
            <button
              onClick={() => onNavigate('/account/security')}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Security &amp; Sessions
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => onNavigate('/account/profile')}
            className="px-4 py-2 rounded-lg bg-teal-800 text-white whitespace-nowrap"
          >
            Overview (pe_uw_07_01)
          </button>
          <button
            onClick={() => onNavigate('/account/profile/edit')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Edit Details (pe_uw_07_02)
          </button>
          <button
            onClick={() => onNavigate('/account/vehicles')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            My Vehicles (pe_uw_07_03)
          </button>
          <button
            onClick={() => onNavigate('/account/favorites')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Saved Favorites (pe_uw_07_05)
          </button>
          <button
            onClick={() => onNavigate('/account/notifications')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Notifications (pe_uw_07_06)
          </button>
          <button
            onClick={() => onNavigate('/account/notification-preferences')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Preferences (pe_uw_07_07)
          </button>
          <button
            onClick={() => onNavigate('/account/security')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Security (pe_uw_07_08)
          </button>
          <button
            onClick={() => onNavigate('/account/privacy')}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Privacy &amp; Closure (pe_uw_07_09)
          </button>
        </div>

        {/* Account metrics are derived from the signed-in user's actual API data. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block">Registered Vehicles</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{loading ? '—' : vehicles.length}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Vehicles on your account</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block">Saved Places</span>
            <span className="text-2xl font-extrabold text-teal-800 mt-1 block">{loading ? '—' : favorites.length}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Saved parking facilities</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block">Active Stay</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{loading ? '—' : activeBookings.length}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Currently active bookings</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block">Completed Stays</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{loading ? '—' : completedBookings.length}</span>
            <span className="text-[11px] text-slate-500 mt-1 block">Completed bookings on your account</span>
          </div>
        </div>
        {loadError && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadError}</div>}

        {/* Two-column layout for details and vehicles */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Personal details & Recent Activity */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Personal &amp; Contact Details</h2>
                <button
                  onClick={() => onNavigate('/account/profile/edit')}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  Edit
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Legal Full Name</span>
                  <span className="font-semibold text-slate-900 text-sm">{fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Mobile Phone</span>
                  <span className="font-semibold text-slate-900 text-sm">{phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email Address</span>
                  <span className="font-semibold text-slate-900 text-sm">{email}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Emergency Contact</span>
                  <span className="font-semibold text-slate-900 text-sm">{currentUser?.emergencyContactName || 'Not provided'}{currentUser?.emergencyContactPhone ? ` (${currentUser.emergencyContactPhone})` : ''}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Saved Destinations &amp; Garages</h2>
                <button
                  onClick={() => onNavigate('/account/favorites')}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  View All ({favorites.length})
                </button>
              </div>

              <div className="space-y-3">
                {!loading && favorites.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">You have not saved any parking facilities yet.</p>}
                {favorites.map((fav) => (
                  <div key={fav.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block">{fav.name}</span>
                      <span className="text-[11px] text-slate-500">{fav.addressLine1 || (fav as any).address || `${fav.city}, India`}</span>
                    </div>
                    <button
                      onClick={() => onNavigate(`/spaces/${fav.id}`)}
                      className="px-3 py-1 bg-teal-800 text-white rounded-lg text-xs font-bold hover:bg-teal-900"
                    >
                      Book Bay
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Fleet Overview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Registered Fleet</h2>
                <button
                  onClick={() => onNavigate('/account/vehicles/add')}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  + Add Vehicle
                </button>
              </div>

              <div className="space-y-3">
                {!loading && vehicles.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">No vehicles registered yet. Add a vehicle to speed up future bookings.</p>}
                {vehicles.map((v) => (
                  <div key={v.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{v.vehicleCategory === 'bike' ? '🏍️' : '🚗'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">{v.plateNumber}</span>
                          {v.isDefault && (
                            <span className="bg-teal-100 text-teal-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500">{v.make} {v.model} ({v.color})</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('/account/vehicles')}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-gradient-to-br from-teal-800 to-teal-950 text-white rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-sm">Need a bay right now?</h3>
              <p className="text-xs text-teal-100">
                Search nearby verified commercial and residential spaces with instant turnstile access.
              </p>
              <button
                onClick={() => onNavigate('/explore')}
                className="w-full py-2.5 bg-white text-teal-900 hover:bg-teal-50 text-xs font-bold rounded-xl transition-all shadow"
              >
                Find &amp; Book Nearby Parking
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
