import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import {
  UserAccount,
  UserVehicle,
  ParkingFacility,
} from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  initialTab?: 'profile' | 'vehicles' | 'favorites';
}

export function CustomerProfileVehiclesPage({
  currentUser,
  onNavigate,
  onLogout,
  initialTab = 'vehicles',
}: Props) {
  const { tenant } = useBrand();
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicles' | 'favorites'>(initialTab);
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [favorites, setFavorites] = useState<ParkingFacility[]>([]);
  const [loading, setLoading] = useState(true);

  // Add vehicle modal state
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newCategory, setNewCategory] = useState<'car' | 'bike' | 'auto' | 'suv'>('car');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newColor, setNewColor] = useState('');
  const [isDefaultVehicle, setIsDefaultVehicle] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Profile edit state
  const [fullName, setFullName] = useState(currentUser?.fullName || 'Arun Kumar');
  const [phone, setPhone] = useState(currentUser?.phone || '+91 98765 00003');
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  const loadData = async () => {
    setLoading(true);
    try {
      const vList = await client.vehicles.list();
      setVehicles(vList);

      const fList = await client.facilities.list();
      setFavorites(fList.slice(0, 2)); // 2 default favorites
    } catch (err) {
      console.error('Failed to load profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPlate = newPlate.toUpperCase().trim();
    if (!cleanPlate || cleanPlate.length < 5) {
      setFormError('Please enter a valid registration number (e.g. TN-09-CB-4821)');
      return;
    }

    try {
      const added = await client.vehicles.add({
        plateNumber: cleanPlate,
        vehicleCategory: newCategory,
        make: newMake || 'Car',
        model: newModel || 'Model',
        color: newColor || 'Silver',
        isDefault: isDefaultVehicle,
      });

      setVehicles([added, ...vehicles]);
      setShowAddVehicleModal(false);
      setNewPlate('');
      setNewMake('');
      setNewModel('');
      setNewColor('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to save vehicle');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await client.vehicles.delete(id);
      setVehicles(vehicles.filter((v) => v.id !== id));
    } catch (err: any) {
      console.error('Failed to delete vehicle:', err);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSavedMsg('Profile changes saved successfully!');
    setTimeout(() => setProfileSavedMsg(null), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-2.5 cursor-pointer text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-[#0F766E] flex items-center justify-center text-white font-bold">
                P
              </div>
              <span className="font-extrabold text-xl text-[#101828]">
                {tenant.displayName}
              </span>
            </button>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#344054]">
              <button onClick={() => onNavigate('/explore')} className="hover:text-[#0F766E] cursor-pointer">
                Find Parking
              </button>
              <button onClick={() => onNavigate('/bookings')} className="hover:text-[#0F766E] cursor-pointer">
                My Bookings
              </button>
              <button
                onClick={() => setActiveTab('vehicles')}
                className="text-[#0F766E] font-semibold cursor-pointer"
              >
                My Vehicles
              </button>
              <button onClick={() => onNavigate('/host/')} className="hover:text-[#0F766E] cursor-pointer">
                Become a Host
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-[#1E293B]">
                  {currentUser.fullName || currentUser.email}
                </span>
                <button
                  onClick={onLogout}
                  className="text-xs text-[#667085] hover:text-[#B42318] font-medium"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="bg-white border-b border-[#E4E7EC] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0F766E] text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                {currentUser?.fullName ? currentUser.fullName[0].toUpperCase() : 'A'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-[#101828] font-['Plus_Jakarta_Sans']">
                    {currentUser?.fullName || 'Arun Kumar'}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF3] text-[#12B76A] uppercase tracking-wider">
                    Verified Driver
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {currentUser?.email || 'driver.arun@parkeazy.com'} • {phone}
                </p>
              </div>
            </div>

            {/* TAB SELECTORS */}
            <div className="flex items-center gap-2 bg-[#F1F5F9] p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'vehicles'
                    ? 'bg-white text-[#0F766E] shadow-xs'
                    : 'text-[#64748B] hover:text-[#101828]'
                }`}
              >
                Saved Vehicles ({vehicles.length})
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-white text-[#0F766E] shadow-xs'
                    : 'text-[#64748B] hover:text-[#101828]'
                }`}
              >
                Personal Details
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'favorites'
                    ? 'bg-white text-[#0F766E] shadow-xs'
                    : 'text-[#64748B] hover:text-[#101828]'
                }`}
              >
                Saved Places (2)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: SAVED VEHICLES (my_vehicles_pe_uw_07_03) */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
                  Registered Vehicles
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Pre-configured vehicle plates for seamless FASTag & ANPR boom barrier recognition.
                </p>
              </div>
              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <span>+ Add Vehicle</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-[#64748B]">Loading registered vehicles...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white rounded-3xl p-6 border border-[#E4E7EC] shadow-xs relative hover:border-[#0F766E]/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center text-2xl">
                        {v.vehicleCategory === 'bike' ? '🏍️' : v.vehicleCategory === 'suv' ? '🚙' : '🚗'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {v.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F7F4] text-[#0F766E]">
                            Default
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="text-gray-400 hover:text-red-600 text-xs p-1 cursor-pointer transition-colors"
                          title="Delete vehicle"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <strong className="text-xl font-mono font-black text-[#101828] tracking-wider block">
                      {v.plateNumber}
                    </strong>
                    <p className="text-xs text-[#475467] font-medium mt-1">
                      {v.make} {v.model} • {v.color}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs text-[#64748B]">
                      <span className="uppercase text-[10px] font-bold tracking-wider text-[#0F766E]">
                        {v.vehicleCategory}
                      </span>
                      <span>ANPR Ready</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PERSONAL DETAILS (user_profile_overview_pe_uw_07_01 & edit_personal_details_pe_uw_07_02) */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl bg-white rounded-3xl p-8 border border-[#E4E7EC] shadow-xs">
            <h2 className="text-lg font-bold text-[#101828] font-['Plus_Jakarta_Sans'] mb-1">
              Personal Profile & Security
            </h2>
            <p className="text-xs text-[#64748B] mb-6">
              Update your contact info for SMS barrier PIN receipts and instant booking alerts.
            </p>

            {profileSavedMsg && (
              <div className="mb-4 p-3 rounded-xl bg-[#E6F7F4] border border-[#A7F3D0] text-[#0F766E] text-xs font-semibold">
                ✓ {profileSavedMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-sm text-[#101828] font-medium focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Email Address</label>
                <input
                  type="email"
                  value={currentUser?.email || 'driver.arun@parkeazy.com'}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#64748B] font-medium cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#344054] block mb-1">Mobile Phone (OTP Verified)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-sm text-[#101828] font-medium focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0F766E] text-white font-bold text-xs shadow-xs hover:bg-[#0D655E] cursor-pointer transition-colors"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: SAVED PLACES (saved_places_favorites_pe_uw_07_05) */}
        {activeTab === 'favorites' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
                Saved Parking Facilities
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Quick 1-click reservations for your frequently visited urban parking locations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favorites.map((fac) => (
                <div
                  key={fac.id}
                  className="bg-white rounded-3xl p-6 border border-[#E4E7EC] shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#E6F7F4] text-[#0F766E] flex items-center justify-center font-bold text-xl">
                      P
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
                        {fac.name}
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        {fac.addressLine1}, {fac.city}
                      </p>
                      <span className="text-[11px] text-[#0F766E] font-semibold mt-1 block">
                        ₹40/hr • 24 bays available
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate(`/facilities/${fac.id}`)}
                    className="px-4 py-2 rounded-xl bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D655E] cursor-pointer shadow-xs transition-colors"
                  >
                    Book
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: ADD VEHICLE (add_edit_vehicle_pe_uw_07_04) */}
        {showAddVehicleModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 text-left border border-[#E4E7EC] shadow-2xl">
              <div className="flex justify-between items-center pb-4 border-b border-[#E4E7EC]">
                <h3 className="text-base font-bold text-[#101828]">Add New Vehicle</h3>
                <button
                  onClick={() => setShowAddVehicleModal(false)}
                  className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="mt-3 p-2.5 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs font-semibold">
                  ⚠️ {formError}
                </div>
              )}

              <form onSubmit={handleAddVehicle} className="mt-4 space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-[#344054] block mb-1">
                    Registration Number (Plate) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    placeholder="e.g. TN-09-CB-4821"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] font-mono text-sm font-bold text-[#101828] uppercase focus:ring-2 focus:ring-[#0F766E] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#344054] block mb-1">Vehicle Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-sm text-[#101828] focus:ring-2 focus:ring-[#0F766E] focus:outline-none font-medium"
                    >
                      <option value="car">Car (Sedan / Hatch)</option>
                      <option value="suv">SUV / MUV</option>
                      <option value="bike">Two-Wheeler / Bike</option>
                      <option value="auto">Auto / Commercial</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#344054] block mb-1">Vehicle Make</label>
                    <input
                      type="text"
                      value={newMake}
                      onChange={(e) => setNewMake(e.target.value)}
                      placeholder="e.g. Hyundai, Tata"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-sm text-[#101828] focus:ring-2 focus:ring-[#0F766E] focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#344054] block mb-1">Model</label>
                    <input
                      type="text"
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="e.g. Creta SX, Nexon"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-sm text-[#101828] focus:ring-2 focus:ring-[#0F766E] focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#344054] block mb-1">Exterior Color</label>
                    <input
                      type="text"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="e.g. White, Silver"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] text-sm text-[#101828] focus:ring-2 focus:ring-[#0F766E] focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefaultVehicle}
                    onChange={(e) => setIsDefaultVehicle(e.target.checked)}
                    className="w-4 h-4 text-[#0F766E] rounded"
                  />
                  <label htmlFor="isDefault" className="text-xs text-[#344054] font-medium cursor-pointer">
                    Set as default vehicle for quick 1-click reservations
                  </label>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddVehicleModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-[#475467] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#0F766E] text-white text-xs font-bold hover:bg-[#0D655E] cursor-pointer shadow-xs"
                  >
                    Save Vehicle
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
