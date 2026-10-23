import React, { useState } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  AlertCircle,
  Eye,
  Send,
  PauseCircle,
  PlayCircle,
  Edit3,
  Layers,
  Sliders,
  Calendar,
  Wrench,
  X
} from 'lucide-react';
import { Facility, User, OperatingHours, FacilityClosure, FacilityMaintenance } from '../../types';
import { api } from '../../api';

interface HostFacilitiesProps {
  facilities: Facility[];
  currentUser: User;
  onRefresh: () => void;
  onSelectFacilityForBays: (facilityId: string) => void;
  onSelectFacilityForPricing: (facilityId: string) => void;
}

export const HostFacilities: React.FC<HostFacilitiesProps> = ({
  facilities,
  currentUser,
  onRefresh,
  onSelectFacilityForBays,
  onSelectFacilityForPricing
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: 'Seattle',
    state: 'WA',
    postalCode: '98101',
    latitude: 47.6062,
    longitude: -122.3321,
    accessInstructions: 'Scan QR code at driver pedestal or enter 4-digit PIN.',
    gateType: 'automated_barrier' as Facility['gateType'],
    defaultGateCode: '4921#',
    clearanceHeightMeters: 2.2,
    is24x7: true,
    amenities: {
      covered: true,
      cctv: true,
      securityGuard: true,
      evCharging: true,
      lighting: true,
      wheelchairAccessible: true,
      valetAssist: false,
      automatedBarrier: true
    },
    photos: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80'
  });

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      description: '',
      address: '',
      city: 'Seattle',
      state: 'WA',
      postalCode: '98101',
      latitude: 47.6062,
      longitude: -122.3321,
      accessInstructions: 'Scan QR code at driver pedestal or enter 4-digit PIN.',
      gateType: 'automated_barrier',
      defaultGateCode: '4921#',
      clearanceHeightMeters: 2.2,
      is24x7: true,
      amenities: {
        covered: true,
        cctv: true,
        securityGuard: true,
        evCharging: true,
        lighting: true,
        wheelchairAccessible: true,
        valetAssist: false,
        automatedBarrier: true
      },
      photos: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=80'
    });
    setEditingFacility(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setFormData({
      name: facility.name,
      description: facility.description,
      address: facility.address,
      city: facility.city,
      state: facility.state,
      postalCode: facility.postalCode,
      latitude: facility.latitude,
      longitude: facility.longitude,
      accessInstructions: facility.accessInstructions,
      gateType: facility.gateType,
      defaultGateCode: facility.defaultGateCode || '4921#',
      clearanceHeightMeters: facility.clearanceHeightMeters,
      is24x7: facility.operatingHours.is24x7,
      amenities: { ...facility.amenities },
      photos: facility.photos.join(', ')
    });
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const photosArray = formData.photos
        .split(',')
        .map(p => p.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        accessInstructions: formData.accessInstructions,
        gateType: formData.gateType,
        defaultGateCode: formData.defaultGateCode,
        clearanceHeightMeters: Number(formData.clearanceHeightMeters),
        operatingHours: {
          is24x7: formData.is24x7,
          monday: { open: '00:00', close: '23:59', isOpen: true },
          tuesday: { open: '00:00', close: '23:59', isOpen: true },
          wednesday: { open: '00:00', close: '23:59', isOpen: true },
          thursday: { open: '00:00', close: '23:59', isOpen: true },
          friday: { open: '00:00', close: '23:59', isOpen: true },
          saturday: { open: '00:00', close: '23:59', isOpen: true },
          sunday: { open: '00:00', close: '23:59', isOpen: true }
        },
        amenities: formData.amenities,
        photos: photosArray
      };

      if (editingFacility) {
        await api.updateFacility(editingFacility.id, payload);
      } else {
        await api.createFacility(payload);
      }

      setShowCreateModal(false);
      onRefresh();
    } catch (err: any) {
      alert('Error saving facility: ' + err.message);
    }
  };

  const handleSubmitForReview = async (facilityId: string) => {
    try {
      setActionLoadingId(facilityId);
      await api.submitFacility(facilityId);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleStatus = async (facilityId: string) => {
    try {
      setActionLoadingId(facilityId);
      await api.toggleFacilityStatus(facilityId);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Facilities & Location Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure parking garages, surface lots, access barrier protocols, and operating rules.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs rounded-xl shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Parking Facility</span>
        </button>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {facilities.map(facility => (
          <div
            key={facility.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Photo & Status Badge */}
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                  src={facility.photos[0] || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=80'}
                  alt={facility.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm uppercase tracking-wider ${
                      facility.status === 'active'
                        ? 'bg-emerald-600 text-white'
                        : facility.status === 'under_review'
                        ? 'bg-amber-500 text-white'
                        : facility.status === 'approved'
                        ? 'bg-blue-600 text-white'
                        : facility.status === 'suspended'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {facility.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="p-5">
                <h3 className="font-bold text-slate-900 text-base mb-1 line-clamp-1">
                  {facility.name}
                </h3>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="line-clamp-1">{facility.address}, {facility.city}, {facility.state}</span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                  {facility.description || 'No description provided.'}
                </p>

                {/* Moderation Notes if rejected or review */}
                {facility.moderationNotes && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] mb-3 leading-relaxed">
                    <span className="font-semibold">Reviewer Note:</span> {facility.moderationNotes}
                  </div>
                )}

                {/* Key Specs Matrix */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Total Bays:</span>
                    <span className="font-semibold text-slate-800">{facility.totalBays} Bays</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Max Clearance:</span>
                    <span className="font-semibold text-slate-800">{facility.clearanceHeightMeters}m ({Math.round(facility.clearanceHeightMeters * 3.28)} ft)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Gate Access:</span>
                    <span className="font-semibold text-slate-800 capitalize">{facility.gateType.replace(/_/g, ' ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Gate PIN:</span>
                    <span className="font-semibold text-slate-800">{facility.defaultGateCode || 'None'}</span>
                  </div>
                </div>

                {/* Amenities Badges */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {facility.amenities.evCharging && (
                    <span className="text-[10px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> EV Charging
                    </span>
                  )}
                  {facility.amenities.covered && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      Covered
                    </span>
                  )}
                  {facility.amenities.cctv && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      CCTV
                    </span>
                  )}
                  {facility.amenities.securityGuard && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      24/7 Guard
                    </span>
                  )}
                  {facility.amenities.wheelchairAccessible && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                      ADA Accessible
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSelectFacilityForBays(facility.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Manage Bays ({facility.totalBays})</span>
                </button>
                <button
                  onClick={() => onSelectFacilityForPricing(facility.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-xl transition-colors border border-indigo-200/50"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Pricing & Surge</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleOpenEdit(facility)}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-medium"
                >
                  <Edit3 className="w-3 h-3" /> Edit Details
                </button>

                {facility.status === 'draft' || facility.status === 'rejected' ? (
                  <button
                    disabled={actionLoadingId === facility.id}
                    onClick={() => handleSubmitForReview(facility.id)}
                    className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-semibold"
                  >
                    <Send className="w-3 h-3" />
                    <span>Submit for Review</span>
                  </button>
                ) : facility.status === 'active' ? (
                  <button
                    disabled={actionLoadingId === facility.id}
                    onClick={() => handleToggleStatus(facility.id)}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-semibold"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>Pause Listing</span>
                  </button>
                ) : facility.status === 'suspended' ? (
                  <button
                    disabled={actionLoadingId === facility.id}
                    onClick={() => handleToggleStatus(facility.id)}
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Reactivate Listing</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Facility Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h3 className="font-bold text-slate-900 text-lg">
                {editingFacility ? 'Edit Parking Facility' : 'Create New Parking Facility'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Basic Information
                </h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Facility Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Downtown Metro Tech Center Garage"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description & Access Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe facility amenities, security, elevator access..."
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Location & Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. 400 Pine Street"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      State / Postal Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        className="w-20 text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      />
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                        className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Gate & Clearance */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Gate Barrier & Vehicle Height
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gate Mechanism
                    </label>
                    <select
                      value={formData.gateType}
                      onChange={e => setFormData({ ...formData, gateType: e.target.value as any })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    >
                      <option value="automated_barrier">Automated Barrier Arm</option>
                      <option value="license_plate_recognition">License Plate (LPR)</option>
                      <option value="qr_scanner">QR Code Scanner</option>
                      <option value="pin_code">Keypad PIN Code</option>
                      <option value="manual_attendant">Manual Guard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Backup PIN
                    </label>
                    <input
                      type="text"
                      value={formData.defaultGateCode}
                      onChange={e => setFormData({ ...formData, defaultGateCode: e.target.value })}
                      placeholder="4921#"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Clearance (meters)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.clearanceHeightMeters}
                      onChange={e => setFormData({ ...formData, clearanceHeightMeters: parseFloat(e.target.value) })}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Amenities & Facilities
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.covered}
                      onChange={e => setFormData({
                        ...formData,
                        amenities: { ...formData.amenities, covered: e.target.checked }
                      })}
                      className="rounded text-sky-600"
                    />
                    <span>Covered / Indoor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.evCharging}
                      onChange={e => setFormData({
                        ...formData,
                        amenities: { ...formData.amenities, evCharging: e.target.checked }
                      })}
                      className="rounded text-sky-600"
                    />
                    <span>EV Fast Charging</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.cctv}
                      onChange={e => setFormData({
                        ...formData,
                        amenities: { ...formData.amenities, cctv: e.target.checked }
                      })}
                      className="rounded text-sky-600"
                    />
                    <span>CCTV Cameras</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.securityGuard}
                      onChange={e => setFormData({
                        ...formData,
                        amenities: { ...formData.amenities, securityGuard: e.target.checked }
                      })}
                      className="rounded text-sky-600"
                    />
                    <span>On-site Guard</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.wheelchairAccessible}
                      onChange={e => setFormData({
                        ...formData,
                        amenities: { ...formData.amenities, wheelchairAccessible: e.target.checked }
                      })}
                      className="rounded text-sky-600"
                    />
                    <span>ADA Accessible</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.amenities.automatedBarrier}
                      onChange={e => setFormData({
                        ...formData,
                        amenities: { ...formData.amenities, automatedBarrier: e.target.checked }
                      })}
                      className="rounded text-sky-600"
                    />
                    <span>Smart Boom Gate</span>
                  </label>
                </div>
              </div>

              {/* Photo URLs */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700">
                  Photo URL(s) (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.photos}
                  onChange={e => setFormData({ ...formData, photos: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold rounded-xl shadow-md transition-colors"
                >
                  {editingFacility ? 'Save Changes' : 'Create Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
