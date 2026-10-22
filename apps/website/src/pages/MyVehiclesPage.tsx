import React, { useState, useEffect } from 'react';
import { UserAccount, UserVehicle } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout?: () => void;
}

export function MyVehiclesPage({
  currentUser,
  onNavigate,
  onLogout,
}: Props) {
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const list = await client.vehicles.list();
      setVehicles(list);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleDelete = async (id: string, plate: string) => {
    if (!window.confirm(`Are you sure you want to remove vehicle ${plate}?`)) return;
    setDeletingId(id);
    try {
      await client.vehicles.delete(id);
      await loadVehicles();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete vehicle');
    } finally {
      setDeletingId(null);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block mb-1">pe_uw_07_03</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Registered Vehicles
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Add and manage vehicles for reuse in booking details.
            </p>
          </div>
          <button
            onClick={() => onNavigate('/account/vehicles/add')}
            className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-xl shadow-md transition-all text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <span>+ Register New Vehicle</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-3xl border border-slate-200">
            Loading registered vehicles...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
            <div className="text-4xl">🚗</div>
            <h2 className="text-base font-bold text-slate-900">No Vehicles Registered Yet</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your vehicle registration plate number to make it available for booking details. Entry methods depend on the facility.
            </p>
            <button
              onClick={() => onNavigate('/account/vehicles/add')}
              className="px-4 py-2 bg-teal-800 text-white text-xs font-bold rounded-xl"
            >
              Add Your First Vehicle
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-2xl shrink-0">
                    {v.vehicleCategory === 'bike' ? '🏍️' : v.vehicleCategory === 'auto' ? '🛺' : '🚗'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-extrabold text-base text-slate-900">{v.plateNumber}</span>
                      {v.isDefault && (
                        <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          PRIMARY VEHICLE
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        {v.vehicleCategory}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {v.make || 'Standard'} {v.model || 'Model'} • {v.color || 'Standard Color'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => onNavigate(`/account/vehicles/${encodeURIComponent(v.id)}/edit`)}
                    className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id, v.plateNumber)}
                    disabled={deletingId === v.id}
                    className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === v.id ? 'Deleting...' : 'Remove'}
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
