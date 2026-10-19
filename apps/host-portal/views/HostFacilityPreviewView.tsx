import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  ArrowLeft,
  MapPin,
  Car,
  Zap,
  ShieldCheck,
  Clock,
  KeyRound,
  Check,
  Send,
  Smartphone,
  Monitor,
  RefreshCw,
  AlertCircle,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import { Button, Card, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  LocationStatus,
  BayStatus,
} from '../../../packages/contracts';

interface HostFacilityPreviewViewProps {
  currentUser: SessionUser | null;
  facilityId: string;
  onNavigate: (path: string) => void;
}

export const HostFacilityPreviewView: React.FC<HostFacilityPreviewViewProps> = ({
  currentUser,
  facilityId,
  onNavigate,
}) => {
  const hostId = currentUser?.id ?? '';

  const [facility, setFacility] = useState<ParkingLocation | null>(null);
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [fac, spaces] = await Promise.all([
        apiClient.getHostFacility(hostId, facilityId),
        apiClient.getHostSpaces(hostId, facilityId),
      ]);
      setFacility(fac);
      setBays(spaces);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load facility preview.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, facilityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Generating marketplace preview...</p>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Facility Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">{errorMessage}</p>
        <Button
          variant="primary"
          themeContext="host"
          size="sm"
          onClick={() => onNavigate('/host/spaces')}
          className="mt-4"
        >
          Return to Facilities
        </Button>
      </div>
    );
  }

  const isPublished = facility.status === LocationStatus.ACTIVE;
  const photos =
    facility.photos && facility.photos.length > 0
      ? facility.photos
      : [{ id: 'p1', url: facility.imageUrl || '/assets/images/hero_parking_bay_1792157347279.jpg', isPrimary: true }];
  const currentPhoto = photos[selectedPhotoIndex] || photos[0];
  const availableBays = bays.filter((b) => b.status === BayStatus.AVAILABLE);

  return (
    <div
      data-screen-id="pe_hw_02_08"
      className="min-h-screen bg-[#E5EAE8] text-[#132A24] flex flex-col font-sans"
    >
      {/* Top Controls Header */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate(`/host/facilities/${facility.id}`)}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Facility Hub
          </button>
        </div>

        {/* Viewport Switcher */}
        <div className="hidden sm:flex items-center gap-2 bg-[#1A332B] p-1 rounded-xl border border-emerald-900/50">
          <button
            type="button"
            onClick={() => setPreviewMode('desktop')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              previewMode === 'desktop'
                ? 'bg-[#22C55E] text-[#12211C]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('mobile')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              previewMode === 'mobile'
                ? 'bg-[#22C55E] text-[#12211C]'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Publication Action */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            themeContext="host"
            size="sm"
            onClick={() => onNavigate(`/host/facilities/${facility.id}/publish`)}
            className="bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] font-bold text-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            {isPublished ? 'Publication Info' : 'Ready to Publish?'}
          </Button>
        </div>
      </header>

      {/* Floating Status Warning if in Draft */}
      {!isPublished && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Listing Preview Mode — This facility is currently in <strong>{facility.status}</strong> status and is not yet visible to public drivers.
          </span>
          <button
            type="button"
            onClick={() => onNavigate(`/host/facilities/${facility.id}/publish`)}
            className="underline ml-2 hover:text-black font-bold"
          >
            Check Publication Checklist &rarr;
          </button>
        </div>
      )}

      {/* Preview Viewport Frame */}
      <main className="flex-1 py-8 px-4 flex justify-center">
        <div
          className={`transition-all duration-300 bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden flex flex-col ${
            previewMode === 'mobile'
              ? 'w-full max-w-sm ring-8 ring-slate-800'
              : 'w-full max-w-5xl'
          }`}
        >
          {/* Customer View Header Simulation */}
          <div className="bg-[#087E8A] text-white px-6 py-3 flex items-center justify-between text-xs">
            <span className="font-extrabold tracking-tight">PARKEAZY MARKETPLACE</span>
            <span className="font-mono text-[11px] text-teal-100">Live Driver View</span>
          </div>

          {/* Photo Gallery Banner */}
          <div className="relative h-64 sm:h-80 bg-slate-900">
            <img
              src={currentPhoto.url}
              alt={facility.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

            {photos.length > 1 && (
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-center gap-2">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === selectedPhotoIndex ? 'bg-white scale-125' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#087E8A] text-white shadow-sm">
                {facility.propertyType || 'Parking Facility'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-xs">
                {bays.length} Total Spaces
              </span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 text-white">
              <h1 className="text-xl sm:text-2xl font-extrabold">{facility.name}</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-200 mt-1">
                <MapPin className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span>
                  {facility.address.line1}, {facility.address.city}, {facility.address.state} {facility.address.postalCode}
                </span>
              </div>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Details & Inventory */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-2">Description</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {facility.description}
                </p>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Facility Amenities &amp; Security
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {facility.amenities.map((am) => (
                    <div
                      key={am}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 flex items-center gap-2"
                    >
                      <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{am}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Spaces Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Available Parking Spaces ({availableBays.length})
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Instant confirmation
                  </span>
                </div>

                <div className="space-y-2">
                  {bays.map((bay) => (
                    <div
                      key={bay.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold px-2 py-1 bg-slate-100 rounded text-slate-900">
                          {bay.bayNumber}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-800 block">
                            {bay.bayType} • {bay.levelOrFloor || 'Ground'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Clearance: {bay.maxVehicleHeightMeters ? `${bay.maxVehicleHeightMeters}m` : 'Standard'}
                            {bay.isEvCharging && ` • EV Charging (${bay.evChargerKw || 7.4}kW)`}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={
                          bay.status === BayStatus.AVAILABLE
                            ? 'success'
                            : bay.status === BayStatus.OCCUPIED
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {bay.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Driver Access Instructions Preview */}
              <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-900">
                  <KeyRound className="w-4 h-4 text-teal-700" />
                  <span>Access Method: {facility.accessMethod}</span>
                </div>
                <p className="text-slate-700">
                  {facility.accessInstructions || 'No access instructions specified.'}
                </p>
              </div>
            </div>

            {/* Right Col: Booking Quote Card Simulation */}
            <div>
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4 sticky top-24">
                <div className="flex items-baseline justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-2xl font-extrabold font-mono text-slate-900">
                      ${(facility.hourlyRateCents / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500"> / hour</span>
                  </div>
                  <span className="text-xs font-mono text-slate-600">
                    Daily: ${(facility.dailyRateCents / 100).toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Security Deposit:</span>
                    <span className="font-mono font-bold text-slate-800">
                      ${(facility.securityDepositCents / 100).toFixed(2)} (Refundable)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                    <span className="text-[11px] text-slate-500 block">Operating Timezone:</span>
                    <span className="font-medium text-slate-800">{facility.timezone}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  themeContext="host"
                  size="md"
                  onClick={() => onNavigate(`/host/facilities/${facility.id}/publish`)}
                  className="w-full bg-[#087E8A] hover:bg-[#075762] text-white font-bold"
                >
                  <CalendarCheck className="w-4 h-4 mr-1.5" />
                  Driver Reserve Space (Simulation)
                </Button>

                <p className="text-[11px] text-slate-400 text-center">
                  Protected by ParkEazy 10-minute hold reservation engine.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
