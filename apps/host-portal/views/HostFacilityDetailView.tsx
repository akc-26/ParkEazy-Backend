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
  CheckCircle2,
  AlertCircle,
  Edit,
  Save,
  Trash2,
  Eye,
  Send,
  Plus,
  RefreshCw,
  ExternalLink,
  Zap,
  Ruler,
  Car,
} from 'lucide-react';
import { Button, Input, Card, Badge } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import { AddBayModal } from '../components/AddBayModal';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  LocationStatus,
  BayStatus,
  BayType,
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
  const hostId = currentUser?.id ?? '';

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

  // Bay management & in-app confirmation modal states
  const [isAddBayModalOpen, setIsAddBayModalOpen] = useState(false);
  const [deleteConfirmBay, setDeleteConfirmBay] = useState<ParkingBay | null>(null);
  const [isDeletingBay, setIsDeletingBay] = useState(false);
  const [updatingBayId, setUpdatingBayId] = useState<string | null>(null);
  const [deleteConfirmFacility, setDeleteConfirmFacility] = useState(false);
  const [isDeletingFacility, setIsDeletingFacility] = useState(false);
  const [bayActionMessage, setBayActionMessage] = useState<string | null>(null);
  const [bayErrorMessage, setBayErrorMessage] = useState<string | null>(null);

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

  const handleToggleBayStatus = async (bay: ParkingBay) => {
    const nextStatus =
      bay.status === BayStatus.AVAILABLE ? BayStatus.MAINTENANCE : BayStatus.AVAILABLE;
    setUpdatingBayId(bay.id);
    setBayErrorMessage(null);
    setBayActionMessage(null);
    try {
      const updated = await apiClient.updateHostSpace(hostId, facilityId, bay.id, {
        status: nextStatus,
      });
      setBays((prev) => prev.map((b) => (b.id === bay.id ? updated : b)));
      setBayActionMessage(
        `Space '${bay.bayNumber}' status changed to ${
          nextStatus === BayStatus.AVAILABLE ? 'ACTIVE / AVAILABLE' : 'MAINTENANCE (Deactivated)'
        }.`
      );
      setTimeout(() => setBayActionMessage(null), 3500);
    } catch (err: any) {
      setBayErrorMessage(err.message || 'Failed to update bay status.');
    } finally {
      setUpdatingBayId(null);
    }
  };

  const handleConfirmDeleteBay = async () => {
    if (!deleteConfirmBay) return;
    setIsDeletingBay(true);
    setBayErrorMessage(null);
    setBayActionMessage(null);
    try {
      await apiClient.deleteHostSpace(hostId, facilityId, deleteConfirmBay.id);
      setBays((prev) => prev.filter((b) => b.id !== deleteConfirmBay.id));
      if (facility) {
        setFacility({ ...facility, totalBays: Math.max(0, facility.totalBays - 1) });
      }
      setBayActionMessage(`Space '${deleteConfirmBay.bayNumber}' removed from inventory.`);
      setDeleteConfirmBay(null);
      setTimeout(() => setBayActionMessage(null), 3500);
    } catch (err: any) {
      setBayErrorMessage(err.message || 'Failed to delete parking bay.');
    } finally {
      setIsDeletingBay(false);
    }
  };

  const handleBayCreated = (newBay: ParkingBay) => {
    setBays((prev) => [...prev, newBay]);
    if (facility) {
      setFacility({ ...facility, totalBays: facility.totalBays + 1 });
    }
    setBayActionMessage(`Space '${newBay.bayNumber}' successfully created and added to facility inventory.`);
    setTimeout(() => setBayActionMessage(null), 4000);
  };

  const handleConfirmDeleteFacility = async () => {
    setIsDeletingFacility(true);
    try {
      await apiClient.deleteHostFacility(hostId, facilityId);
      onNavigate('/host/spaces');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete facility.');
      setIsDeletingFacility(false);
      setDeleteConfirmFacility(false);
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

                {/* Physical Bays & Spaces Inventory Management */}
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        <span>Physical Bays &amp; Spaces ({bays.length})</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Discrete physical bays registered under this facility with individual clearance, EV, and activation status.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate(`/host/facilities/${facility.id}/layout`)}
                        className="text-xs"
                      >
                        <Layers className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Visual Layout
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        themeContext="host"
                        onClick={() => setIsAddBayModalOpen(true)}
                        className="text-xs font-bold bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C]"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                        Add Bay to Facility
                      </Button>
                    </div>
                  </div>

                  {/* Bay Action Feedback */}
                  {bayActionMessage && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{bayActionMessage}</span>
                    </div>
                  )}
                  {bayErrorMessage && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{bayErrorMessage}</span>
                    </div>
                  )}

                  {bays.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
                      <p className="text-xs font-semibold text-slate-700">No bays created yet for this facility</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Facilities require at least one active parking space with AVAILABLE status before they can be published live to drivers.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        themeContext="host"
                        onClick={() => setIsAddBayModalOpen(true)}
                        className="mt-2 text-xs font-bold bg-[#22C55E]"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                        Add First Bay
                      </Button>
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <tr>
                            <th className="px-3.5 py-2.5">Bay #</th>
                            <th className="px-3.5 py-2.5">Level</th>
                            <th className="px-3.5 py-2.5">Type</th>
                            <th className="px-3.5 py-2.5">EV / Clearances</th>
                            <th className="px-3.5 py-2.5">Status</th>
                            <th className="px-3.5 py-2.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bays.map((bay) => (
                            <tr key={bay.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                                {bay.bayNumber}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-600">
                                {bay.levelOrFloor || 'Ground'}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {bay.bayType}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-[11px]">
                                {bay.isEvCharging ? (
                                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                                    <Zap className="w-3 h-3" />
                                    {bay.evChargerKw ? `${bay.evChargerKw} kW` : 'EV'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Standard</span>
                                )}
                                <div className="text-[10px] text-slate-400">
                                  H: {bay.maxVehicleHeightMeters || 2.2}m
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <Badge
                                  variant={
                                    bay.status === BayStatus.AVAILABLE
                                      ? 'success'
                                      : bay.status === BayStatus.MAINTENANCE
                                      ? 'warning'
                                      : 'info'
                                  }
                                >
                                  {bay.status === BayStatus.AVAILABLE ? 'ACTIVE' : bay.status}
                                </Badge>
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleBayStatus(bay)}
                                    disabled={updatingSpaceId === bay.id}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                      bay.status === BayStatus.AVAILABLE
                                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                    }`}
                                  >
                                    {updatingSpaceId === bay.id
                                      ? '...'
                                      : bay.status === BayStatus.AVAILABLE
                                      ? 'Deactivate'
                                      : 'Activate'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onNavigate(`/host/spaces/${bay.id}/edit`)}
                                    className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                                    title="Edit Bay Properties"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onNavigate(`/host/spaces/${bay.id}/restrictions`)}
                                    className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-100"
                                    title="Clearances & Dimensions"
                                  >
                                    <Ruler className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteConfirmBay(bay)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                                    title="Delete Bay"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Dangerous Action */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Created: {new Date(facility.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmFacility(true)}
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

      {/* Add Bay Modal */}
      {facility && (
        <AddBayModal
          isOpen={isAddBayModalOpen}
          onClose={() => setIsAddBayModalOpen(false)}
          hostId={hostId}
          facilities={[facility]}
          preselectedFacilityId={facility.id}
          onBayCreated={handleBayCreated}
        />
      )}

      {/* Delete Space In-App Confirmation Modal */}
      {deleteConfirmBay && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Delete Parking Bay
                </h3>
                <p className="text-xs text-slate-500">
                  Remove space from this facility inventory.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              Are you sure you want to permanently delete space{' '}
              <strong className="font-mono text-slate-900 font-bold">
                {deleteConfirmBay.bayNumber}
              </strong>
              ? This action cannot be reversed.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmBay(null)}
                disabled={isDeletingBay}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDeleteBay}
                disabled={isDeletingBay}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeletingBay ? 'Deleting...' : 'Delete Space'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Facility In-App Confirmation Modal */}
      {deleteConfirmFacility && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Delete Entire Facility
                </h3>
                <p className="text-xs text-slate-500">
                  Permanent decommission of parking location.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-rose-50/60 p-3.5 rounded-xl border border-rose-100 text-rose-900">
              Are you sure you want to delete <strong className="font-bold">{facility.name}</strong> and all {bays.length} associated parking spaces? This will permanently remove the facility and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmFacility(false)}
                disabled={isDeletingFacility}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmDeleteFacility}
                disabled={isDeletingFacility}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isDeletingFacility ? 'Deleting Facility...' : 'Yes, Delete Facility'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
