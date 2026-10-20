import React, { useState, useEffect } from 'react';
import { UserAccount, ParkingFacility } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
}

export function SavedPlacesFavoritesPage({
  currentUser,
  onNavigate,
  onLogout,
}: Props) {
  const [favorites, setFavorites] = useState<ParkingFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const fList = await client.favorites.list();
      setFavorites(fList);
      setLoadError(null);
    } catch (err) {
      console.error(err);
      setLoadError('Saved places could not be loaded. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemoveFavorite = async (facilityId: string) => {
    setTogglingId(facilityId);
    setActionError(null);
    try {
      await client.favorites.toggle(facilityId);
      setFavorites((prev) => prev.filter((f) => f.id !== facilityId));
    } catch (err) {
      console.error(err);
      setActionError('This place could not be removed. Your saved list has not been changed. Please try again.');
    } finally {
      setTogglingId(null);
    }
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
          <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">pe_uw_07_05</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Saved Places &amp; Favorites
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Access frequently visited commercial garages, work hubs, and residential parking spots with instant bay reservation.
          </p>
        </div>

        {loadError && !loading && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{loadError} <button type="button" className="ml-2 underline font-semibold" onClick={loadFavorites}>Retry</button></div>}
        {actionError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</div>}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-3xl border border-slate-200">
            Loading saved favorite places...
          </div>
        ) : favorites.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
            <div className="text-4xl">⭐</div>
            <h2 className="text-base font-bold text-slate-900">No Favorite Garages Saved</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When viewing parking facility pages or search results, click the favorite star icon to bookmark locations here.
            </p>
            <button
              onClick={() => onNavigate('/explore')}
              className="px-4 py-2 bg-teal-800 text-white text-xs font-bold rounded-xl"
            >
              Explore Parking Spots
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((fac) => (
              <div
                key={fac.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl shrink-0">
                    🏢
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-slate-900">{fac.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{fac.addressLine1 || (fac as any).address || `${fac.city}, India`}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                      <span>{fac.activeSpaces} active of {fac.totalSpaces} spaces</span>
                      <span>•</span>
                      <span className={`font-semibold ${fac.status === 'published' ? 'text-emerald-700' : 'text-amber-700'}`}>{fac.status === 'published' ? 'Listing published' : `Listing ${String(fac.status).replaceAll('_', ' ')}`}</span>
                      {fac.isCovered && <span>Covered parking</span>}
                      {fac.is24x7 && <span>24/7 access hours</span>}
                    </div>
                    {fac.amenities?.length > 0 && <p className="mt-2 text-xs text-slate-500">{fac.amenities.slice(0, 3).join(' · ')}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    onClick={() => handleRemoveFavorite(fac.id)}
                    disabled={togglingId === fac.id}
                    className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Remove from favorites"
                  >
                    ★
                  </button>
                  <button
                    onClick={() => onNavigate(`/spaces/${fac.id}`)}
                    className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    Book Space
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
