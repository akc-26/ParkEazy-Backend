import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Plus,
  ArrowRight,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Building2,
  Layers,
  Calendar,
  Car,
  Clock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  RatePlan,
  CreateRatePlanRequest,
  VehicleCategory,
} from '../../../packages/contracts';
import { HostSubNav } from '../components/HostSubNav';

interface HostRateConfigViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostRateConfigView: React.FC<HostRateConfigViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const hostId = currentUser?.id || 'usr-host-001';

  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('');
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formHourlyDollars, setFormHourlyDollars] = useState('6.50');
  const [formDailyDollars, setFormDailyDollars] = useState('38.00');
  const [formBayId, setFormBayId] = useState<string>('');
  const [formMinBillableMins, setFormMinBillableMins] = useState('60');
  const [formStepMins, setFormStepMins] = useState('30');
  const [formVehicleCategory, setFormVehicleCategory] = useState<string>('ALL');
  const [formEffectiveDate, setFormEffectiveDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load facilities on initial mount
  const loadFacilities = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const facs = await apiClient.getHostFacilities(hostId);
      setFacilities(facs);
      if (facs.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(facs[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load facilities.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  // Load bays and rate plans when selected facility changes
  const loadRatesAndBays = useCallback(async () => {
    if (!selectedFacilityId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [ratesData, baysData] = await Promise.all([
        apiClient.getRatePlans(hostId, selectedFacilityId),
        apiClient.getHostFacilityBays(selectedFacilityId, hostId),
      ]);
      setRatePlans(ratesData);
      setBays(baysData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load rate plans.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId, selectedFacilityId]);

  useEffect(() => {
    loadRatesAndBays();
  }, [loadRatesAndBays]);

  const handleOpenCreateModal = () => {
    setEditingRateId(null);
    setFormName('');
    const fac = facilities.find((f) => f.id === selectedFacilityId);
    setFormHourlyDollars(fac ? (fac.hourlyRateCents / 100).toFixed(2) : '6.00');
    setFormDailyDollars(fac ? (fac.dailyRateCents / 100).toFixed(2) : '35.00');
    setFormBayId('');
    setFormMinBillableMins('60');
    setFormStepMins('30');
    setFormVehicleCategory('ALL');
    setFormEffectiveDate(new Date().toISOString().substring(0, 10));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: RatePlan) => {
    setEditingRateId(plan.id);
    setFormName(plan.name);
    setFormHourlyDollars((plan.hourlyRateCents / 100).toFixed(2));
    setFormDailyDollars((plan.dailyRateCents / 100).toFixed(2));
    setFormBayId(plan.bayId || '');
    setFormMinBillableMins(plan.minBillableMinutes.toString());
    setFormStepMins(plan.stepMinutes.toString());
    setFormVehicleCategory(plan.vehicleCategory || 'ALL');
    setFormEffectiveDate(plan.effectiveFromUtc.substring(0, 10));
    setIsModalOpen(true);
  };

  const handleSaveRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const hourlyCents = Math.round(parseFloat(formHourlyDollars) * 100);
    const dailyCents = Math.round(parseFloat(formDailyDollars) * 100);

    if (isNaN(hourlyCents) || hourlyCents < 0) {
      setErrorMessage('Please enter a valid hourly rate.');
      return;
    }
    if (isNaN(dailyCents) || dailyCents < 0) {
      setErrorMessage('Please enter a valid daily rate.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRateId) {
        await apiClient.updateRatePlan(hostId, editingRateId, {
          name: formName.trim() || 'Custom Rate Plan',
          hourlyRateCents: hourlyCents,
          dailyRateCents: dailyCents,
          minBillableMinutes: parseInt(formMinBillableMins, 10) || 60,
          stepMinutes: parseInt(formStepMins, 10) || 30,
          vehicleCategory: (formVehicleCategory as any) || 'ALL',
          effectiveFromUtc: new Date(formEffectiveDate).toISOString(),
        });
        setSuccessMessage('Rate plan updated successfully.');
      } else {
        await apiClient.createRatePlan(hostId, {
          facilityId: selectedFacilityId,
          bayId: formBayId || undefined,
          name: formName.trim() || 'Custom Rate Plan',
          hourlyRateCents: hourlyCents,
          dailyRateCents: dailyCents,
          minBillableMinutes: parseInt(formMinBillableMins, 10) || 60,
          stepMinutes: parseInt(formStepMins, 10) || 30,
          vehicleCategory: (formVehicleCategory as any) || 'ALL',
          effectiveFromUtc: new Date(formEffectiveDate).toISOString(),
        });
        setSuccessMessage('New rate plan created and active.');
      }

      setIsModalOpen(false);
      await loadRatesAndBays();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save rate plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (rateId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this rate plan? Existing confirmed bookings will be strictly protected.')) {
      return;
    }
    try {
      await apiClient.deactivateRatePlan(hostId, rateId);
      setSuccessMessage('Rate plan deactivated safely.');
      await loadRatesAndBays();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to deactivate rate plan.');
    }
  };

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  return (
    <div
      data-screen-id="pe_hw_03_02"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      {/* Header */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/host')}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center shrink-0">
              H
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Host Studio
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">
                ParkEazy Host Hub
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400 font-semibold">{currentUser?.email}</span>
          <button
            type="button"
            onClick={onLogout}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Subnav */}
      <HostSubNav
        currentPath="/host/pricing/rates"
        onNavigate={onNavigate}
        activeModule="pricing"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Title & Facility Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Host Portal</span>
              <span>/</span>
              <span>Pricing &amp; Policies</span>
              <span>/</span>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                pe_hw_03_02
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Rate Configuration
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              Configure authoritative hourly and daily rates, minimum billable durations, and space overrides.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Building2 className="w-4 h-4 text-slate-400" />
              <label htmlFor="facility-select" className="text-slate-500 font-medium">Facility:</label>
              <select
                id="facility-select"
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.name} ({fac.address.city})
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="primary"
              size="sm"
              themeContext="host"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Rate Plan</span>
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Facility Baseline Rate Card */}
        {selectedFacility && (
          <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{selectedFacility.name}</div>
                <div className="text-slate-500 font-mono text-[11px]">
                  {selectedFacility.address.line1}, {selectedFacility.address.city} • Timezone: {selectedFacility.timezone}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Default Hourly</span>
                <span className="text-slate-900 font-bold text-sm">
                  ${(selectedFacility.hourlyRateCents / 100).toFixed(2)}/hr
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Default Daily Cap</span>
                <span className="text-emerald-700 font-bold text-sm">
                  ${(selectedFacility.dailyRateCents / 100).toFixed(2)}/day
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Deposit Escrow</span>
                <span className="text-slate-700 font-medium text-sm">
                  ${(selectedFacility.securityDepositCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Rate Plans Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Configured Rate Plans</h2>
              <p className="text-xs text-slate-500">
                Specific rate schedules and physical space tier overrides for {selectedFacility?.name}.
              </p>
            </div>
            <Badge variant="info">
              {ratePlans.filter((r) => r.isActive).length} Active Plans
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Plan Name &amp; Target</th>
                  <th className="py-3 px-4">Vehicle Tier</th>
                  <th className="py-3 px-4 text-right">Hourly Rate</th>
                  <th className="py-3 px-4 text-right">Daily Cap</th>
                  <th className="py-3 px-4">Min Duration</th>
                  <th className="py-3 px-4">Effective Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ratePlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      No custom rate plans configured yet. The facility default baseline rate applies to all bays.
                    </td>
                  </tr>
                ) : (
                  ratePlans.map((plan) => {
                    const targetBay = plan.bayId ? bays.find((b) => b.id === plan.bayId) : null;
                    return (
                      <tr key={plan.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>{plan.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {plan.bayId ? `Space Override: ${targetBay?.bayNumber || plan.bayId}` : 'Facility-wide default'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {plan.vehicleCategory || 'ALL'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ${(plan.hourlyRateCents / 100).toFixed(2)}/hr
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          ${(plan.dailyRateCents / 100).toFixed(2)}/day
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {plan.minBillableMinutes}m
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {plan.effectiveFromUtc.substring(0, 10)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={plan.isActive ? 'success' : 'default'}>
                            {plan.isActive ? 'Active' : 'Deactivated'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(plan)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                              title="Edit Rate Plan"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {plan.isActive && (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(plan.id)}
                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                title="Deactivate Rate Plan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for Rate Plan Creation / Editing */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-base text-slate-900">
                  {editingRateId ? 'Edit Rate Plan' : 'Configure New Rate Plan'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveRatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rate Plan Name
                  </label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Peak Weekend Commuter Rate"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Hourly Rate (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-mono">$</span>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={formHourlyDollars}
                        onChange={(e) => setFormHourlyDollars(e.target.value)}
                        className="pl-7 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Daily Cap (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-mono">$</span>
                      <Input
                        type="number"
                        step="0.50"
                        min="0"
                        value={formDailyDollars}
                        onChange={(e) => setFormDailyDollars(e.target.value)}
                        className="pl-7 font-mono text-emerald-800 font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Target Scope
                    </label>
                    <select
                      value={formBayId}
                      onChange={(e) => setFormBayId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Entire Facility Default</option>
                      {bays.map((b) => (
                        <option key={b.id} value={b.id}>
                          Bay {b.bayNumber} ({b.bayType})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Vehicle Category
                    </label>
                    <select
                      value={formVehicleCategory}
                      onChange={(e) => setFormVehicleCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">All Supported Vehicles</option>
                      <option value="SEDAN">Sedan</option>
                      <option value="SUV">SUV</option>
                      <option value="COMPACT">Compact</option>
                      <option value="EV_ONLY">EV Only</option>
                      <option value="VAN">Van / Minivan</option>
                      <option value="MOTORCYCLE">Motorcycle</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Min Billable Duration
                    </label>
                    <select
                      value={formMinBillableMins}
                      onChange={(e) => setFormMinBillableMins(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      <option value="60">60 mins (1 hr standard)</option>
                      <option value="120">120 mins (2 hrs)</option>
                      <option value="180">180 mins (3 hrs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Effective Start Date
                    </label>
                    <Input
                      type="date"
                      value={formEffectiveDate}
                      onChange={(e) => setFormEffectiveDate(e.target.value)}
                      className="font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    themeContext="host"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : editingRateId ? 'Save Changes' : 'Create Rate Plan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
