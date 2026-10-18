import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  MapPin,
  KeyRound,
  DollarSign,
  Camera,
  Layers,
  ArrowLeft,
  Check,
  AlertCircle,
  Edit,
  Save,
  Trash2,
  Eye,
  Send,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  LocationStatus,
  PropertyType,
  AccessMethod,
  UpdateFacilityRequest,
} from '../../../packages/contracts';

interface HostFacilityDetailViewProps {
  currentUser: SessionUser | null;
  facilityId: string;
  onNavigate: (path: string) => void;
}

const COMMON_AMENITIES = [
  'EV Charging',
  'CCTV Security',
  'Covered Garage',
  '24/7 Access',
  'Elevator Access',
  'Paved Surface',
  'Staffed Kiosk',
  'Disabled Parking',
  'Gated Entry',
  'Well-Lit',
  'Security Patrol',
];

export const HostFacilityDetailView: React.FC<HostFacilityDetailViewProps> = ({
  currentUser,
  facilityId,
  onNavigate,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [facility, setFacility] = useState<ParkingLocation | null>(null);
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPropertyType, setEditPropertyType] = useState<PropertyType>(PropertyType.GARAGE);
  const [editLine1, setEditLine1] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editAccessMethod, setEditAccessMethod] = useState<AccessMethod>(AccessMethod.GATE_CODE);
  const [editAccessInstructions, setEditAccessInstructions] = useState('');
  const [editHourlyRate, setEditHourlyRate] = useState('');
  const [editDailyRate, setEditDailyRate] = useState('');
  const [editAmenities, setEditAmenities] = useState<string[]>([]);

  // Photo upload
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);

  const loadFacility = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fac = await apiClient.getHostFacility(hostId, facilityId);
      setFacility(fac);
      setEditName(fac.name);
      setEditDescription(fac.description);
      setEditPropertyType((fac.propertyType as PropertyType) || PropertyType.GARAGE);
      setEditLine1(fac.address.line1);
      setEditCity(fac.address.city);
      setEditState(fac.address.state);
      setEditPostalCode(fac.address.postalCode);
      setEditAccessMethod(fac.accessMethod);
      setEditAccessInstructions(fac.accessInstructions || '');
      setEditHourlyRate((fac.hourlyRateCents / 100).toFixed(2));
      setEditDailyRate((fac.dailyRateCents / 100).toFixed(2));
      setEditAmenities(fac.amenities || []);

      const baysData = await apiClient.getHostSpaces(hostId, facilityId);
      setBays(baysData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve facility details.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, facilityId]);

  useEffect(() => {
    loadFacility();
  }, [loadFacility]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facility) return;

    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const hourlyCents = Math.round(parseFloat(editHourlyRate || '0') * 100);
      const dailyCents = Math.round(parseFloat(editDailyRate || '0') * 100);

      const updatePayload: UpdateFacilityRequest = {
        name: editName.trim(),
        description: editDescription.trim(),
        propertyType: editPropertyType,
        address: {
          line1: editLine1.trim(),
          city: editCity.trim(),
          state: editState.trim(),
          postalCode: editPostalCode.trim(),
        },
        accessMethod: editAccessMethod,
        accessInstructions: editAccessInstructions.trim(),
        hourlyRateCents: hourlyCents,
        dailyRateCents: dailyCents,
        amenities: editAmenities,
      };

      const updated = await apiClient.updateHostFacility(hostId, facilityId, updatePayload);
      setFacility(updated);
      setIsEditing(false);
      setSaveSuccessMsg('Facility details updated successfully.');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update facility.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFacility = async () => {
    if (!window.confirm('Are you sure you want to delete this entire facility and all its parking spaces? This cannot be undone.')) {
      return;
    }
    try {
      await apiClient.deleteHostFacility(hostId, facilityId);
      onNavigate('/host/spaces');
    } catch (err: any) {
      alert(err.message || 'Failed to delete facility.');
    }
  };

  const handleAddPhoto = async () => {
    if (!newPhotoUrl.trim()) return;
    try {
      const updated = await apiClient.addFacilityPhoto(hostId, facilityId, {
        url: newPhotoUrl.trim(),
        caption: facility?.name,
      });
      setFacility(updated);
      setNewPhotoUrl('');
      setIsAddingPhoto(false);
    } catch (err: any) {
      alert(err.message || 'Failed to attach photo.');
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    try {
      const updated = await apiClient.deleteFacilityPhoto(hostId, facilityId, photoId);
      setFacility(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to remove photo.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F0F4F3] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin" />
        <p className="text-sm text-slate-600 font-medium">Loading facility details...</p>
      </div>
    );
  }

  if (errorMessage && !facility) {
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

  if (!facility) return null;

  const isPublished = facility.status === LocationStatus.ACTIVE;

  return (
    <div
      data-screen-id="pe_hw_02_03"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      {/* Top Header */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/host/spaces')}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Facilities
          </button>
        </div>
        <div className="text-xs font-mono text-emerald-400">
          pe_hw_02_03 • Facility Management Hub
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => onNavigate('/host/spaces')}
              className="hover:underline"
            >
              Facilities
            </button>
            <span>/</span>
            <span className="font-semibold text-slate-800">{facility.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/host/facilities/${facility.id}/preview`)}
              className="text-xs"
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Preview Listing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate(`/host/facilities/${facility.id}/layout`)}
              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Layers className="w-3.5 h-3.5 mr-1" />
              Manage Spaces ({bays.length})
            </Button>
            <Button
              variant={isPublished ? 'outline' : 'primary'}
              size="sm"
              themeContext="host"
              onClick={() => onNavigate(`/host/facilities/${facility.id}/publish`)}
              className={`text-xs font-bold ${
                isPublished ? 'border-emerald-300 text-emerald-800' : 'bg-[#22C55E] text-[#12211C]'
              }`}
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              {isPublished ? 'Publication Info' : 'Publish Listing'}
            </Button>
          </div>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Facility Overview Card */}
        <div className="bg-white rounded-2xl border border-[#D8E2DE] shadow-xs overflow-hidden">
          <div className="relative h-56 bg-slate-100">
            <img
              src={facility.imageUrl || '/assets/images/hero_parking_bay_1792157347279.jpg'}
              alt={facility.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <Badge variant={isPublished ? 'success' : 'warning'}>
                {isPublished ? '● ACTIVE / LIVE' : facility.status}
              </Badge>
              {facility.propertyType && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wider bg-black/60 text-white backdrop-blur-xs uppercase">
                  {facility.propertyType}
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-sm">
                  {facility.name}
                </h1>
                <div className="flex items-center gap-1.5 text-xs text-slate-200 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {facility.address.line1}, {facility.address.city}, {facility.address.state} {facility.address.postalCode}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-300 block">Current Hourly Rate</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  ${(facility.hourlyRateCents / 100).toFixed(2)}
                  <span className="text-xs font-normal text-slate-300">/hr</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50 text-xs">
            <div className="p-4 text-center">
              <span className="text-slate-500 block">Total Spaces</span>
              <span className="text-lg font-bold font-mono text-slate-900">{bays.length}</span>
            </div>
            <div className="p-4 text-center">
              <span className="text-slate-500 block">EV Charging Points</span>
              <span className="text-lg font-bold font-mono text-emerald-700">
                {bays.filter((b) => b.isEvCharging).length}
              </span>
            </div>
            <div className="p-4 text-center">
              <span className="text-slate-500 block">Access Method</span>
              <span className="text-sm font-bold text-slate-800">{facility.accessMethod}</span>
            </div>
            <div className="p-4 text-center">
              <span className="text-slate-500 block">Security Deposit</span>
              <span className="text-lg font-bold font-mono text-slate-900">
                ${(facility.securityDepositCents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Details / Editing Area */}
          <div className="p-6">
            {!isEditing ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-[#132A24]">About this Facility</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-xs border-slate-300"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit Details
                    </Button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {facility.description}
                  </p>
                </div>

                {/* Entry & Access Instructions */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                    <KeyRound className="w-4 h-4 text-emerald-600" />
                    <span>Driver Entry &amp; Access Guidance:</span>
                  </div>
                  <p className="text-slate-700 pl-5">
                    {facility.accessInstructions || 'No access instructions provided yet.'}
                  </p>
                </div>

                {/* Amenities */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 mb-2">Facility Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {facility.amenities.map((am) => (
                      <span
                        key={am}
                        className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700 border border-slate-200"
                      >
                        ✓ {am}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Photo Gallery */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-slate-800">
                      Photographs ({facility.photos?.length || 1})
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingPhoto(!isAddingPhoto)}
                      className="text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Photo URL
                    </Button>
                  </div>

                  {isAddingPhoto && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste image URL (e.g. /assets/images/...)"
                        value={newPhotoUrl}
                        onChange={(e) => setNewPhotoUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        themeContext="host"
                        onClick={handleAddPhoto}
                        className="text-xs"
                      >
                        Attach Photo
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(facility.photos && facility.photos.length > 0 ? facility.photos : [{ id: 'pri', url: facility.imageUrl || '', isPrimary: true }]).map((p) => (
                      <div
                        key={p.id}
                        className="relative group rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100"
                      >
                        <img src={p.url} alt="Facility" className="w-full h-full object-cover" />
                        {p.isPrimary && (
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                            Primary
                          </span>
                        )}
                        {facility.photos && facility.photos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(p.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/70 text-white hover:bg-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dangerous Action */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Created: {new Date(facility.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={handleDeleteFacility}
                    className="text-rose-600 hover:text-rose-800 font-semibold transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Facility
                  </button>
                </div>
              </div>
            ) : (
              /* In-Place Editing Form */
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-[#132A24]">Edit Facility Attributes</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      themeContext="host"
                      size="sm"
                      disabled={isSaving}
                      className="text-xs font-bold"
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Facility Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Property Type</label>
                    <select
                      value={editPropertyType}
                      onChange={(e) => setEditPropertyType(e.target.value as PropertyType)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value={PropertyType.GARAGE}>Private Covered Garage</option>
                      <option value={PropertyType.DRIVEWAY}>Residential Driveway</option>
                      <option value={PropertyType.UNDERGROUND}>Underground Commercial Facility</option>
                      <option value={PropertyType.PARKING_LOT}>Open Surface Parking Lot</option>
                      <option value={PropertyType.CARPORT}>Sheltered Carport</option>
                      <option value={PropertyType.COMMERCIAL}>Commercial Building Bay</option>
                      <option value={PropertyType.OTHER}>Other Property Type</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hourly Rate ($)</label>
                    <input
                      type="number"
                      step="0.25"
                      value={editHourlyRate}
                      onChange={(e) => setEditHourlyRate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Street Line 1</label>
                    <input
                      type="text"
                      value={editLine1}
                      onChange={(e) => setEditLine1(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Access Instructions</label>
                    <textarea
                      rows={2}
                      value={editAccessInstructions}
                      onChange={(e) => setEditAccessInstructions(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200"
                      required
                    />
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
