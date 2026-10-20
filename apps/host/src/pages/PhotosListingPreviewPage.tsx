import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, ParkingFacility, FacilityPhoto } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  facilityId: string;
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function PhotosListingPreviewPage({
  facilityId,
  currentUser,
  onNavigate,
}: Props) {
  const { tenant } = useBrand();
  const [facility, setFacility] = useState<ParkingFacility | null>(null);
  const [photos, setPhotos] = useState<FacilityPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New photo input
  const [inputUrl, setInputUrl] = useState('');
  const [inputCaption, setInputCaption] = useState('');
  const [inputCategory, setInputCategory] = useState<'entrance' | 'bay' | 'overview' | 'amenities'>('bay');

  const apiClient = new ParkEazyApiClient();

  useEffect(() => {
    loadFacility();
  }, [facilityId]);

  const loadFacility = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.facilities.get(facilityId);
      setFacility(data);
      if (data.photos && data.photos.length > 0) {
        setPhotos(data.photos);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load facility photos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    const newPhoto: FacilityPhoto = {
      id: 'photo-' + Date.now(),
      url: inputUrl,
      caption: inputCaption || 'Facility View',
      category: inputCategory,
      isCover: photos.length === 0,
      createdAt: new Date().toISOString(),
    };
    setPhotos([...photos, newPhoto]);
    setInputUrl('');
    setInputCaption('');
  };

  const handleSetCover = (id: string) => {
    setPhotos(
      photos.map((p) => ({
        ...p,
        isCover: p.id === id,
      }))
    );
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleSavePhotos = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await apiClient.facilities.update(facilityId, {
        photos,
      });
      setSuccessMsg('Facility photo media gallery committed successfully.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save photos');
    } finally {
      setSaving(false);
    }
  };

  const coverPhoto = photos.find((p) => p.isCover) || photos[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-[#64748B]">Loading Photo Gallery...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* HEADER & NAV */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B] mb-1">
              <button onClick={() => onNavigate('/host/spaces')} className="hover:underline">Spaces</button>
              <span>/</span>
              <span>{facility?.name || 'Facility'}</span>
              <span>/</span>
              <span className="text-[#0F766E]">Photos & Preview (pe_hw_02_08)</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
              Space Photos & Driver Listing Preview
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Upload clear facility photos and preview how motorists discover and inspect your parking facility.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(`/host/facilities/${facilityId}/layout`)}
              className="px-4 py-2 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#334155] hover:bg-[#F1F5F9]"
            >
              ← Bay Layout
            </button>
            <button
              onClick={() => onNavigate(`/host/facilities/${facilityId}/publish`)}
              className="px-4 py-2 rounded-xl bg-[#0F766E] text-xs font-bold text-white hover:bg-[#0D655E] shadow-sm"
            >
              Publication Readiness →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-xs font-medium text-[#991B1B]">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-[#DCFCE7] border border-[#86EFAC] text-xs font-medium text-[#166534]">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 7 COLS: PHOTO MANAGEMENT */}
          <div className="lg:col-span-7 space-y-6">
            {/* UPLOADER / ADD PHOTO FORM */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📸</span>
                  <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                    Add Media Assets
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-[#0F766E] bg-[#CCFBF1] px-2.5 py-1 rounded-full uppercase">
                  {photos.length} Photos in Gallery
                </span>
              </div>

              <form onSubmit={handleAddPhoto} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">Image URL</label>
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Photo Caption</label>
                    <input
                      type="text"
                      value={inputCaption}
                      onChange={(e) => setInputCaption(e.target.value)}
                      placeholder="e.g. Basement 1 EV Bay A-04"
                      className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#0F766E] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] mb-1">Tag Category</label>
                    <select
                      value={inputCategory}
                      onChange={(e: any) => setInputCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-xl bg-white outline-none"
                    >
                      <option value="entrance">Main Entrance & Barrier</option>
                      <option value="bay">Parking Stall / Bay</option>
                      <option value="amenities">EV Charger / Amenities</option>
                      <option value="overview">Overview / Building</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInputUrl('https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=800&auto=format&fit=crop&q=80');
                        setInputCaption('EV Charging Bay Fast Charger');
                        setInputCategory('amenities');
                      }}
                      className="text-[11px] text-[#0F766E] hover:underline cursor-pointer"
                    >
                      + Load Sample EV Photo
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#141B2C] hover:bg-[#1E293B] text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    + Add to Gallery
                  </button>
                </div>
              </form>
            </div>

            {/* GALLERY GRID */}
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans'] mb-4">
                Asset Gallery ({photos.length})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-xl border overflow-hidden relative group transition-all ${
                      p.isCover ? 'border-[#0F766E] ring-2 ring-[#0F766E]/20' : 'border-[#E2E8F0]'
                    }`}
                  >
                    <div className="h-40 w-full overflow-hidden bg-slate-100">
                      <img
                        src={p.url}
                        alt={p.caption || 'Facility photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                    </div>
                    {p.isCover && (
                      <span className="absolute top-2 left-2 bg-[#0F766E] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        ★ COVER PHOTO
                      </span>
                    )}
                    <div className="p-3 bg-white">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-[#141B2C] truncate">{p.caption || 'Photo'}</span>
                        <span className="text-[10px] font-mono uppercase text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                          {p.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F1F5F9] text-[11px]">
                        {!p.isCover && (
                          <button
                            type="button"
                            onClick={() => handleSetCover(p.id)}
                            className="text-[#0F766E] font-semibold hover:underline cursor-pointer"
                          >
                            Set as Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeletePhoto(p.id)}
                          className="text-[#D92D20] hover:underline cursor-pointer ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePhotos}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  {saving ? 'Saving...' : '💾 Commit Gallery Changes'}
                </button>
              </div>
            </div>

            {/* PLAYBOOK GUIDELINES */}
            <div className="bg-[#F0FDFA] p-5 rounded-2xl border border-[#CCFBF1] text-xs text-[#134E48]">
              <div className="font-bold text-sm mb-2 flex items-center gap-1.5">
                <span>💡</span>
                <span>Pro Host Photography Playbook</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#0F766E]">
                <li><strong>Clear Bay Marking:</strong> Ensure floor paint or stall number (e.g. A-04) is clearly visible.</li>
                <li><strong>Entrance Context:</strong> Photograph from driver approach angle showing street turn-in.</li>
                <li><strong>EV Station:</strong> Capture charging gun nozzle connector and power rating sticker.</li>
                <li><strong>Lighting:</strong> Take photos during daytime or well-lit evening illumination.</li>
              </ul>
            </div>
          </div>

          {/* RIGHT 5 COLS: DRIVER DISCOVERY SIMULATOR */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📱</span>
                  <div>
                    <h2 className="text-base font-bold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                      Driver Discovery Feed Preview
                    </h2>
                    <p className="text-[11px] text-[#64748B]">Driver perspective in mobile marketplace</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-[#CCFBF1] text-[#0F766E] font-bold px-2 py-0.5 rounded">
                  Live Card
                </span>
              </div>

              {/* SIMULATED MOBILE FEED CARD */}
              <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden bg-white shadow-md hover:shadow-lg transition-all">
                <div className="h-48 w-full relative overflow-hidden bg-slate-900">
                  <img
                    src={coverPhoto?.url}
                    alt="Driver listing card"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-[#101828]/80 backdrop-blur-xs text-white text-[11px] font-bold">
                      {facility?.isCovered ? '☂️ Covered' : 'Open Ground'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#0F766E] text-white text-[11px] font-bold">
                      ⚡ EV Ready
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs px-3 py-1 rounded-xl shadow text-xs font-extrabold text-[#141B2C]">
                    ₹40 / hr
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                    <span>📍 0.4 km away • Anna Nagar</span>
                    <span className="text-[#027A48] font-bold">★ 4.9 (128)</span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans']">
                    {facility?.name || 'Anna Nagar Plaza Garage'}
                  </h3>
                  <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                    {facility?.addressLine1 || '12 2nd Avenue, Anna Nagar'}, {facility?.city || 'Chennai'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
                    <span className="text-[#027A48] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#027A48]"></span>
                      18 Bays Free
                    </span>
                    <button className="px-3 py-1.5 rounded-lg bg-[#0F766E] text-white font-bold text-xs shadow-xs">
                      Reserve Bay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
