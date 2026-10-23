import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  LogOut,
  Car,
  Lock,
  ArrowRight,
  ShieldCheck,
  Plus,
  Trash2,
  Star,
  Bell,
  KeyRound,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient, ApiError } from '../../../packages/api-client';
import {
  SessionUser,
  CustomerVehicle,
  CreateVehicleRequest,
  NotificationPreferences,
} from '../../../packages/contracts';
import { ToastType } from '../components/ToastNotification';

interface MyProfilePageViewProps {
  onNavigate: (path: string) => void;
  onOpenAuthModal: () => void;
  currentUser: SessionUser | null;
  onSignOut: () => void;
  onProfileUpdated?: (updated: SessionUser) => void;
  showToast?: (type: ToastType, message: string, title?: string) => void;
}

type ProfileTab = 'personal' | 'vehicles' | 'security' | 'notifications';

export const MyProfilePageView: React.FC<MyProfilePageViewProps> = ({
  onNavigate,
  onOpenAuthModal,
  currentUser,
  onSignOut,
  onProfileUpdated,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  // Form State - Personal Info
  const [profile, setProfile] = useState<SessionUser | null>(currentUser);
  const [firstName, setFirstName] = useState<string>(currentUser?.firstName || '');
  const [lastName, setLastName] = useState<string>(currentUser?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser?.phoneNumber || '');

  // Status States
  const [isLoading, setIsLoading] = useState<boolean>(!currentUser);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Field Validation Errors
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Vehicles State
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState<boolean>(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState<boolean>(false);
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleMake, setVehicleMake] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleColor, setVehicleColor] = useState<string>('');
  const [vehicleIsDefault, setVehicleIsDefault] = useState<boolean>(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [isSavingVehicle, setIsSavingVehicle] = useState<boolean>(false);

  // Security / Password State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<boolean>(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Notification Preferences State
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState<boolean>(false);
  const [notificationSuccess, setNotificationSuccess] = useState<boolean>(false);

  // Load fresh profile from backend
  const fetchProfile = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await apiClient.getProfile();
      setProfile(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setPhoneNumber(data.phoneNumber || '');
      onProfileUpdated?.(data);
    } catch (err: any) {
      console.warn('[MyProfile] Fetch profile notice:', err);
      if (currentUser) {
        setProfile(currentUser);
        setFirstName(currentUser.firstName || '');
        setLastName(currentUser.lastName || '');
        setPhoneNumber(currentUser.phoneNumber || '');
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, onProfileUpdated]);

  // Load vehicles
  const fetchVehicles = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingVehicles(true);
    try {
      const data = await apiClient.getVehicles();
      setVehicles(data);
    } catch (err: any) {
      console.warn('[MyProfile] Fetch vehicles notice:', err);
    } finally {
      setIsLoadingVehicles(false);
    }
  }, [currentUser]);

  // Load notification preferences
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingNotifications(true);
    try {
      const prefs = await apiClient.getNotificationPreferences();
      setNotifications(prefs);
    } catch (err: any) {
      console.warn('[MyProfile] Fetch notifications notice:', err);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchProfile();
    fetchVehicles();
    fetchNotifications();
  }, [fetchProfile, fetchVehicles, fetchNotifications]);

  // Validation for Personal Info
  const validateForm = (): boolean => {
    let isValid = true;
    setFirstNameError(null);
    setLastNameError(null);
    setPhoneError(null);
    setGeneralError(null);

    const trimmedFirst = firstName.trim();
    if (!trimmedFirst) {
      setFirstNameError('First name is required.');
      isValid = false;
    } else if (trimmedFirst.length > 100) {
      setFirstNameError('First name cannot exceed 100 characters.');
      isValid = false;
    }

    const trimmedLast = lastName.trim();
    if (!trimmedLast) {
      setLastNameError('Last name is required.');
      isValid = false;
    } else if (trimmedLast.length > 100) {
      setLastNameError('Last name cannot exceed 100 characters.');
      isValid = false;
    }

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone && trimmedPhone.length > 50) {
      setPhoneError('Phone number cannot exceed 50 characters.');
      isValid = false;
    }

    return isValid;
  };

  // Form Submit Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    if (!validateForm()) return;

    setIsSaving(true);
    setGeneralError(null);
    setSaveSuccess(false);

    try {
      const updated = await apiClient.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      setProfile(updated);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setPhoneNumber(updated.phoneNumber || '');
      setSaveSuccess(true);
      onProfileUpdated?.(updated);
      showToast?.('success', 'Your profile details have been saved successfully.', 'Profile Updated');

      setTimeout(() => {
        setSaveSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('[MyProfile] Save error:', err);
      const msg = err.message || 'Failed to update profile.';
      setGeneralError(msg);
      showToast?.('error', msg, 'Save Failed');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if personal form is dirty
  const isDirty =
    profile &&
    (firstName.trim() !== (profile.firstName || '').trim() ||
      lastName.trim() !== (profile.lastName || '').trim() ||
      phoneNumber.trim() !== (profile.phoneNumber || '').trim());

  const handleResetForm = () => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setPhoneNumber(profile.phoneNumber || '');
      setFirstNameError(null);
      setLastNameError(null);
      setPhoneError(null);
      setGeneralError(null);
      setSaveSuccess(false);
    }
  };

  // Vehicle Handlers
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleError(null);
    const cleanedPlate = vehiclePlate.trim().toUpperCase();
    if (!cleanedPlate || cleanedPlate.length < 2 || cleanedPlate.length > 12) {
      setVehicleError('License plate must be between 2 and 12 alphanumeric characters.');
      return;
    }
    if (!vehicleMake.trim()) {
      setVehicleError('Vehicle make is required.');
      return;
    }
    if (!vehicleModel.trim()) {
      setVehicleError('Vehicle model is required.');
      return;
    }

    setIsSavingVehicle(true);
    try {
      const newVeh: CreateVehicleRequest = {
        licensePlate: cleanedPlate,
        make: vehicleMake.trim(),
        model: vehicleModel.trim(),
        color: vehicleColor.trim() || undefined,
        isDefault: vehicleIsDefault,
      };
      const created = await apiClient.addVehicle(newVeh);
      setVehicles((prev) => {
        let updated = [...prev];
        if (created.isDefault) {
          updated = updated.map((v) => ({ ...v, isDefault: false }));
        }
        return [...updated, created];
      });
      setShowAddVehicleModal(false);
      setVehiclePlate('');
      setVehicleMake('');
      setVehicleModel('');
      setVehicleColor('');
      setVehicleIsDefault(false);
      showToast?.('success', `Vehicle ${created.licensePlate} registered successfully.`, 'Vehicle Added');
    } catch (err: any) {
      setVehicleError(err.message || 'Failed to add vehicle.');
      showToast?.('error', err.message || 'Failed to add vehicle.', 'Error');
    } finally {
      setIsSavingVehicle(false);
    }
  };

  const handleSetDefaultVehicle = async (vehicleId: string) => {
    try {
      const updated = await apiClient.updateVehicle(vehicleId, { isDefault: true });
      setVehicles((prev) =>
        prev.map((v) => ({
          ...v,
          isDefault: v.id === vehicleId,
        }))
      );
      showToast?.('success', `${updated.licensePlate} set as primary vehicle.`, 'Default Updated');
    } catch (err: any) {
      showToast?.('error', err.message || 'Failed to set default vehicle.', 'Error');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string, plate: string) => {
    try {
      await apiClient.deleteVehicle(vehicleId);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
      showToast?.('success', `Vehicle ${plate} removed from your account.`, 'Vehicle Removed');
    } catch (err: any) {
      showToast?.('error', err.message || 'Cannot remove vehicle.', 'Vehicle Removal Error');
    }
  };

  // Password Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('New password must contain at least one letter and one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiClient.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast?.('success', 'Your password has been changed securely.', 'Password Updated');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
      showToast?.('error', err.message || 'Unable to change password.', 'Security Error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Notification Preferences Handler
  const handleTogglePreference = (key: keyof NotificationPreferences) => {
    if (!notifications) return;
    setNotifications({
      ...notifications,
      [key]: !notifications[key],
    });
  };

  const handleSaveNotifications = async () => {
    if (!notifications || isSavingNotifications) return;
    setIsSavingNotifications(true);
    setNotificationSuccess(false);
    try {
      const updated = await apiClient.updateNotificationPreferences(notifications);
      setNotifications(updated);
      setNotificationSuccess(true);
      showToast?.('success', 'Notification preferences saved successfully.', 'Preferences Updated');
      setTimeout(() => setNotificationSuccess(false), 4000);
    } catch (err: any) {
      showToast?.('error', err.message || 'Failed to save notification preferences.', 'Error');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#087E8A] transition-colors"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-semibold text-slate-800">My Profile</span>
      </nav>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-[#087E8A] mb-2">
              <User className="w-3.5 h-3.5" />
              <span>Customer Account & Settings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#162A2D] tracking-tight">
              My Profile
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Manage your verified customer details, registered vehicles, security credentials, and alert preferences.
            </p>
          </div>

          {currentUser && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onSignOut}
                className="text-red-600 border-red-200 hover:bg-red-50 inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </div>

        {/* Unauthenticated State */}
        {!currentUser && (
          <div className="mt-6 p-6 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Authentication Required</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Please sign in with your customer credentials to view and update your profile information.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                themeContext="user"
                size="sm"
                onClick={onOpenAuthModal}
              >
                Sign In as Driver
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Profile Layout */}
      {currentUser && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Account Overview & Navigation Tabs */}
          <div className="space-y-6">
            {/* Identity Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#087E8A] to-teal-400 text-white font-extrabold text-2xl flex items-center justify-center shadow-sm">
                  {profile?.firstName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                    {profile?.firstName} {profile?.lastName}
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">
                    {profile?.email}
                  </p>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-[#087E8A] border border-teal-200">
                      <User className="w-3 h-3" />
                      {profile?.roles?.[0] || 'Customer'}
                    </span>
                    {profile?.isHostVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        Host Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Read-Only Account Invariants */}
              <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Account ID
                  </span>
                  <span className="font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block mt-0.5 text-[11px]">
                    {profile?.id || 'usr-customer-001'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Member Since
                  </span>
                  <div className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'Active Member'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Security Roles
                  </span>
                  <div className="text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span className="capitalize">
                      {profile?.roles?.join(', ').toLowerCase() || 'customer'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('/bookings')}
                  className="w-full inline-flex items-center justify-center gap-2"
                >
                  <span>View My Bookings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('personal')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'personal'
                    ? 'bg-[#087E8A] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Personal Information</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('vehicles')}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'vehicles'
                    ? 'bg-[#087E8A] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Car className="w-4 h-4 shrink-0" />
                  <span>Registered Vehicles</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === 'vehicles'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {vehicles.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'security'
                    ? 'bg-[#087E8A] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                <span>Security & Credentials</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'notifications'
                    ? 'bg-[#087E8A] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span>Alerts & Notifications</span>
              </button>
            </div>
          </div>

          {/* Right Column: Tab Panels */}
          <div className="lg:col-span-2 space-y-6">
            {/* TAB 1: PERSONAL INFORMATION */}
            {activeTab === 'personal' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your verified customer details and contact telephone number.
                  </p>
                </div>

                {saveSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Your profile information has been saved and synchronized with your active session.</span>
                  </div>
                )}

                {generalError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{generalError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="profile-first-name"
                        className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                      >
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="profile-first-name"
                        type="text"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (firstNameError) setFirstNameError(null);
                        }}
                        disabled={isSaving}
                        placeholder="e.g. Alex"
                        className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#087E8A] ${
                          firstNameError
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-300'
                        }`}
                      />
                      {firstNameError && (
                        <p className="mt-1 text-xs text-red-600">{firstNameError}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="profile-last-name"
                        className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                      >
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="profile-last-name"
                        type="text"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value);
                          if (lastNameError) setLastNameError(null);
                        }}
                        disabled={isSaving}
                        placeholder="e.g. Morgan"
                        className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#087E8A] ${
                          lastNameError
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-300'
                        }`}
                      />
                      {lastNameError && (
                        <p className="mt-1 text-xs text-red-600">{lastNameError}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-email"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Email Address <span className="text-slate-400 font-normal">(Login Identifier)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="profile-email"
                        type="email"
                        value={profile?.email || ''}
                        readOnly
                        disabled
                        className="w-full px-3.5 py-2 pl-9 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Email address is your immutable login identifier and cannot be modified directly.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Phone Number <span className="text-slate-400 font-normal">(Optional for SMS alerts)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="profile-phone"
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value);
                          if (phoneError) setPhoneError(null);
                        }}
                        disabled={isSaving}
                        placeholder="+1-555-0199"
                        className={`w-full px-3.5 py-2 pl-9 text-sm bg-white border rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#087E8A] ${
                          phoneError
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-slate-300'
                        }`}
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    {phoneError ? (
                      <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                    ) : (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Used for parking gate entry SMS codes and arrival reminders.
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">
                      {isDirty ? (
                        <span className="text-amber-700 font-medium">You have unsaved changes.</span>
                      ) : (
                        <span>All changes saved.</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {isDirty && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetForm}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Discard Changes</span>
                        </Button>
                      )}
                      <Button
                        type="submit"
                        variant="primary"
                        themeContext="user"
                        size="sm"
                        disabled={isSaving || !isDirty}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                        <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: REGISTERED VEHICLES */}
            {activeTab === 'vehicles' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Registered Vehicles</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Save your vehicles for fast 1-click checkout and automated barrier license-plate recognition.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    themeContext="user"
                    size="sm"
                    onClick={() => setShowAddVehicleModal(true)}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Vehicle</span>
                  </Button>
                </div>

                {isLoadingVehicles ? (
                  <div className="py-12 text-center">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Loading registered vehicles...</p>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center mx-auto text-slate-400">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">No Vehicles Registered</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                        Add your car or motorcycle to streamline future reservations and automated gate access.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddVehicleModal(true)}
                      className="inline-flex items-center gap-1.5 mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register First Vehicle</span>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicles.map((v) => (
                      <div
                        key={v.id}
                        className={`p-4 rounded-xl border transition-all ${
                          v.isDefault
                            ? 'border-teal-300 bg-teal-50/40 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        } flex flex-col justify-between gap-3`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-base font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200 shadow-2xs">
                              {v.licensePlate}
                            </span>
                            {v.isDefault ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#087E8A] text-white">
                                <Star className="w-3 h-3 fill-white" />
                                Primary
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultVehicle(v.id)}
                                className="text-[11px] font-medium text-slate-500 hover:text-[#087E8A] transition-colors"
                              >
                                Set as Default
                              </button>
                            )}
                          </div>

                          <div>
                            <div className="text-sm font-bold text-slate-800">
                              {v.make} {v.model}
                            </div>
                            {v.color && (
                              <div className="text-xs text-slate-500">Color: {v.color}</div>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400">
                            Registered {new Date(v.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteVehicle(v.id, v.licensePlate)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Remove vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SECURITY & CREDENTIALS */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Security & Credentials</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your account password. Use a strong passphrase of at least 8 characters.
                  </p>
                </div>

                {passwordSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Your password has been securely updated.</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 animate-in fade-in duration-200">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                  <div>
                    <label
                      htmlFor="current-password"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                      placeholder="Min 8 characters, letter and number"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
                    >
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      themeContext="user"
                      size="sm"
                      disabled={isUpdatingPassword || !currentPassword || !newPassword}
                      className="inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{isUpdatingPassword ? 'Updating Password...' : 'Change Password'}</span>
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 4: NOTIFICATIONS & ALERTS */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Alerts & Notifications</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure your delivery preferences for parking codes, arrival reminders, and expiry notices.
                  </p>
                </div>

                {notificationSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Notification preferences have been saved.</span>
                  </div>
                )}

                {isLoadingNotifications ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Loading preferences...
                  </div>
                ) : (
                  <div className="space-y-4 divide-y divide-slate-100">
                    <div className="pt-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          Email Booking Confirmations
                        </div>
                        <div className="text-xs text-slate-500">
                          Receive receipt and barrier instructions via email upon reservation.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications?.emailBookingConfirmations ?? true}
                        onChange={() => handleTogglePreference('emailBookingConfirmations')}
                        className="w-4 h-4 text-[#087E8A] rounded focus:ring-[#087E8A]"
                      />
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          Email Arrival Reminders
                        </div>
                        <div className="text-xs text-slate-500">
                          Helpful alert 30 minutes before your scheduled parking window starts.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications?.emailReminders ?? true}
                        onChange={() => handleTogglePreference('emailReminders')}
                        className="w-4 h-4 text-[#087E8A] rounded focus:ring-[#087E8A]"
                      />
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          SMS Gate Entry Codes
                        </div>
                        <div className="text-xs text-slate-500">
                          Text gate PIN codes directly to your phone for quick offline access.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications?.smsGateAccess ?? true}
                        onChange={() => handleTogglePreference('smsGateAccess')}
                        className="w-4 h-4 text-[#087E8A] rounded focus:ring-[#087E8A]"
                      />
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          SMS Expiry Warnings
                        </div>
                        <div className="text-xs text-slate-500">
                          15-minute alert before reservation ends to allow 1-tap extension or checkout.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications?.smsExpiryAlerts ?? true}
                        onChange={() => handleTogglePreference('smsExpiryAlerts')}
                        className="w-4 h-4 text-[#087E8A] rounded focus:ring-[#087E8A]"
                      />
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          Push Status Updates
                        </div>
                        <div className="text-xs text-slate-500">
                          Real-time check-in and checkout confirmations.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications?.pushStatusUpdates ?? true}
                        onChange={() => handleTogglePreference('pushStatusUpdates')}
                        className="w-4 h-4 text-[#087E8A] rounded focus:ring-[#087E8A]"
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button
                        type="button"
                        variant="primary"
                        themeContext="user"
                        size="sm"
                        disabled={isSavingNotifications}
                        onClick={handleSaveNotifications}
                        className="inline-flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingNotifications ? 'Saving...' : 'Save Preferences'}</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-[#087E8A]" />
                <span>Register Vehicle</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddVehicleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {vehicleError && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{vehicleError}</span>
              </div>
            )}

            <form onSubmit={handleAddVehicle} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  License Plate <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="e.g. 7XYZ890"
                  maxLength={12}
                  className="w-full px-3 py-2 text-sm font-mono uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Make <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="e.g. Tesla"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Model 3"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Color (Optional)
                </label>
                <input
                  type="text"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  placeholder="e.g. Pearl White"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#087E8A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="modal-default-veh"
                  type="checkbox"
                  checked={vehicleIsDefault}
                  onChange={(e) => setVehicleIsDefault(e.target.checked)}
                  className="w-4 h-4 text-[#087E8A] rounded focus:ring-[#087E8A]"
                />
                <label htmlFor="modal-default-veh" className="text-xs text-slate-700">
                  Set as primary vehicle for upcoming bookings
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddVehicleModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  themeContext="user"
                  size="sm"
                  disabled={isSavingVehicle}
                >
                  {isSavingVehicle ? 'Saving...' : 'Add Vehicle'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
