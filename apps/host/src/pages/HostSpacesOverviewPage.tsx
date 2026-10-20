import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HostSpacesOverviewPage({ currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [facilities, setFacilities] = useState<ParkingFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'published' | 'draft'>('all');

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.facilities.list();
      setFacilities(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parking facilities');
    } finally {
      setLoading(false);
    }
  };

  const filteredFacilities = facilities.filter((f) => {
    if (filterTab === 'published') return f.status === 'published';
    if (filterTab === 'draft') return f.status === 'draft';
    return true;
  });

  const totalBays = facilities.reduce((sum, f) => sum + (f.totalSpaces || 0), 0);
  const activeBays = facilities.reduce((sum, f) => sum + (f.activeSpaces || 0), 0);
  const publishedCount = facilities.filter((f) => f.status === 'published').length;

  return (
    <div className="min-h-screen bg-[#F9F9FF] text-[#141B2C] flex flex-col font-['Inter']">
      {/* HEADER */}
      <header className="sticky top-0 w-full z-50 bg-[#F9F9FF]/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('/host/')}
              className="flex items-center gap-3 cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold font-['Plus_Jakarta_Sans'] shadow-xs">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-[#141B2C] leading-tight tracking-tight">
                  {tenant.displayName}
                </span>
                <span className="text-[10px] uppercase text-[#0F766E] font-bold tracking-wider">
                  Host Workspace
                </span>
              </div>
            </button>

            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              <button
                onClick={() => onNavigate('/host/')}
                className="px-3 py-1.5 rounded-lg text-[#64748B] hover:text-[#141B2C] hover:bg-[#F1F5F9] transition"
              >
                Dashboard
              </button>
              <button
                onClick={() => onNavigate('/host/spaces')}
                className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white font-semibold transition"
              >
                Facilities & Spaces
              </button>
              <button
                onClick={() => onNavigate('/host/inventory')}
                className="px-3 py-1.5 rounded-lg text-[#64748B] hover:text-[#141B2C] hover:bg-[#F1F5F9] transition"
              >
                Slot Matrix
              </button>
              <button
                onClick={() => onNavigate('/host/pricing')}
                className="px-3 py-1.5 rounded-lg text-[#64748B] hover:text-[#141B2C] hover:bg-[#F1F5F9] transition"
              >
                Tariffs & Hours
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-[#64748B] bg-[#E2E8F0] px-2 py-0.5 rounded">
              PE-HW-02-01
            </span>
            <button
              onClick={() => onNavigate('/host/facilities/new')}
              className="px-3.5 py-1.5 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>+ Register New Facility</span>
            </button>
          </div>
        </div>
      </header>

      {/* SUB-HEADER / BANNER */}
      <div className="bg-white border-b border-[#E2E8F0] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase font-bold tracking-wider text-[#0F766E]">
                Host Inventory Operations
              </span>
              <span className="text-xs text-[#94A3B8]">•</span>
              <span className="text-xs text-[#64748B]">Metropolitan Hubs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Plus_Jakarta_Sans'] text-[#141B2C] tracking-tight">
              Parking Facilities & Space Inventory
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-3xl">
              Configure multi-level garages, open lots, and dedicated stalls. Manage physical bay geometry, vehicle compatibility limits, access gates, and publication readiness.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadFacilities}
              className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-xs font-semibold text-[#141B2C] hover:bg-[#F8FAFC] transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Sync</span>
            </button>
            <button
              onClick={() => onNavigate('/host/inventory')}
              className="px-3 py-2 rounded-lg border border-[#0F766E] text-[#0F766E] text-xs font-semibold hover:bg-[#0F766E]/5 transition cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              <span>Interactive Slot Manager</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <span className="text-xs text-[#64748B] font-medium">Registered Facilities</span>
            <div className="text-2xl font-bold text-[#141B2C] mt-1 font-['Plus_Jakarta_Sans']">
              {facilities.length}
            </div>
            <span className="text-[11px] text-[#0F766E] mt-1 block font-medium">
              {publishedCount} Live & Bookable
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <span className="text-xs text-[#64748B] font-medium">Total Physical Bays</span>
            <div className="text-2xl font-bold text-[#141B2C] mt-1 font-['Plus_Jakarta_Sans']">
              {totalBays}
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              Across all levels and zones
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <span className="text-xs text-[#64748B] font-medium">Active Bookable Bays</span>
            <div className="text-2xl font-bold text-[#10B981] mt-1 font-['Plus_Jakarta_Sans']">
              {activeBays}
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              Operational & verified
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <span className="text-xs text-[#64748B] font-medium">Readiness Health</span>
            <div className="text-2xl font-bold text-[#0F766E] mt-1 font-['Plus_Jakarta_Sans']">
              {facilities.length > 0 ? `${Math.round((publishedCount / facilities.length) * 100)}%` : '0%'}
            </div>
            <span className="text-[11px] text-[#64748B] mt-1 block">
              Publication compliance
            </span>
          </div>
        </div>

        {/* TABS & CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                filterTab === 'all'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#141B2C] hover:bg-[#F1F5F9]'
              }`}
            >
              All Facilities ({facilities.length})
            </button>
            <button
              onClick={() => setFilterTab('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                filterTab === 'published'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#141B2C] hover:bg-[#F1F5F9]'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setFilterTab('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                filterTab === 'draft'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#64748B] hover:text-[#141B2C] hover:bg-[#F1F5F9]'
              }`}
            >
              Drafts ({facilities.length - publishedCount})
            </button>
          </div>

          <div className="text-xs text-[#64748B]">
            Showing {filteredFacilities.length} of {facilities.length} properties
          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadFacilities} className="font-bold underline cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="py-20 text-center text-[#64748B]">
            <div className="inline-block w-8 h-8 border-3 border-[#0F766E] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-medium">Loading host parking facilities...</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredFacilities.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-12 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#E0E8FF] text-[#0F766E] flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px]">local_parking</span>
            </div>
            <h3 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              No parking facilities found
            </h3>
            <p className="text-xs text-[#64748B] mt-1 max-w-md mx-auto">
              Get started by registering your first parking facility, designating physical slots, and defining driver gate access instructions.
            </p>
            <button
              onClick={() => onNavigate('/host/facilities/new')}
              className="mt-6 px-4 py-2 rounded-lg bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0d655e] transition cursor-pointer shadow-xs"
            >
              + Register New Facility
            </button>
          </div>
        )}

        {/* FACILITY CARDS GRID */}
        {!loading && filteredFacilities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  {/* CARD HEADER */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569] font-bold">
                      {f.facilityCode}
                    </span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                        f.status === 'published'
                          ? 'bg-[#ECFDF5] text-[#059669]'
                          : f.status === 'under_review'
                          ? 'bg-[#EFF6FF] text-[#2563EB]'
                          : 'bg-[#FFFBEB] text-[#D97706]'
                      }`}
                    >
                      {f.status}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] leading-tight mb-1">
                    {f.name}
                  </h3>
                  <p className="text-xs text-[#64748B] mb-4 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    <span>{f.addressLine1}, {f.city}</span>
                  </p>

                  {/* SPECS ROW */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3 bg-[#F8FAFC] rounded-xl text-center mb-4">
                    <div>
                      <span className="text-[10px] text-[#64748B] block">Capacity</span>
                      <strong className="text-sm text-[#141B2C]">{f.totalSpaces || 0}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748B] block">Active</span>
                      <strong className="text-sm text-[#10B981]">{f.activeSpaces || 0}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#64748B] block">Clearance</span>
                      <strong className="text-sm text-[#141B2C]">{f.maxHeightClearanceMeters || 2.1}m</strong>
                    </div>
                  </div>

                  {/* ATTRIBUTE TAGS */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {f.isCovered && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#E0E8FF] text-[#005C55] font-medium">
                        Covered
                      </span>
                    )}
                    {f.is24x7 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#ECFDF5] text-[#059669] font-medium">
                        24/7 Access
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-medium">
                        Scheduled Hours
                      </span>
                    )}
                    {f.operatingModel && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#F3F4F6] text-[#4B5563] font-medium capitalize">
                        {f.operatingModel.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* CARD ACTIONS FOOTER */}
                <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onNavigate(`/host/facilities/${f.id}/layout`)}
                      className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#141B2C] hover:bg-[#F1F5F9] transition text-center cursor-pointer"
                    >
                      Bay Layout
                    </button>
                    <button
                      onClick={() => onNavigate(`/host/facilities/${f.id}/gate`)}
                      className="px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#141B2C] hover:bg-[#F1F5F9] transition text-center cursor-pointer"
                    >
                      Entrance & Gate
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => onNavigate(`/host/facilities/${f.id}/preview`)}
                      className="text-xs text-[#0F766E] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                      <span>Listing Preview</span>
                    </button>
                    <button
                      onClick={() => onNavigate(`/host/facilities/${f.id}/publish`)}
                      className="text-xs text-[#D97706] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">checklist</span>
                      <span>Readiness Audit</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
