import React, { useState, useEffect } from 'react';
import {
  Sliders,
  DollarSign,
  TrendingUp,
  Clock,
  Calendar,
  Sparkles,
  Save,
  CheckCircle2,
  Percent,
  Plus,
  Trash2,
  Calculator,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  Tag,
  Layers,
  Check,
  X,
  Car,
  Info
} from 'lucide-react';
import { Facility, ParkingBay, PricingRule, RatePlan, QuoteAndAvailabilityResponse, User } from '../../types';
import { api } from '../../api';

interface HostPricingProps {
  facilities: Facility[];
  selectedFacilityId: string | null;
  onSelectFacility: (facilityId: string) => void;
  currentUser: User;
}

const VEHICLE_CATEGORIES = [
  { value: 'ALL', label: 'All Vehicles (General)' },
  { value: 'SEDAN', label: 'Sedan / Hatchback' },
  { value: 'SUV', label: 'SUV / 4x4 / Large' },
  { value: 'EV', label: 'Electric Vehicle (EV)' },
  { value: 'MOTORCYCLE', label: 'Motorcycle / Scooter' },
  { value: 'COMPACT', label: 'Compact / Mini' },
  { value: 'VAN_TRUCK', label: 'Van / Small Truck' }
];

export const HostPricing: React.FC<HostPricingProps> = ({
  facilities,
  selectedFacilityId,
  onSelectFacility,
  currentUser
}) => {
  const activeFacilityId = selectedFacilityId || facilities[0]?.id;
  const [activeTab, setActiveTab] = useState<'ratePlans' | 'legacySchedule'>('ratePlans');
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [facilityBays, setFacilityBays] = useState<ParkingBay[]>([]);
  const [pricingRule, setPricingRule] = useState<PricingRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Rate Plan Modal
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    name: '',
    bayId: '',
    vehicleCategory: 'ALL',
    hourlyRateDollars: 5.0,
    dailyRateDollars: 35.0,
    minBookingMinutes: 60,
    maxBookingMinutes: 4320,
    effectiveFromUtc: new Date().toISOString().slice(0, 16),
    effectiveUntilUtc: '',
    isActive: true
  });
  const [submittingPlan, setSubmittingPlan] = useState(false);

  // Legacy Form State
  const [formData, setFormData] = useState({
    name: 'Smart Dynamic Tariff Schedule',
    baseHourlyRate: 5.0,
    dailyMaxRate: 35.0,
    overnightFlatRate: 20.0,
    surgeMultiplier: 1.25,
    weekendHourlyRate: 6.0,
    peakHours: [
      { start: '08:00', end: '10:00', daysOfWeek: [1, 2, 3, 4, 5] },
      { start: '16:00', end: '19:00', daysOfWeek: [1, 2, 3, 4, 5] }
    ],
    specialEvents: [
      {
        eventName: 'Convention Week Surge',
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-05T23:59:59.000Z',
        flatRateSurcharge: 10.0
      }
    ],
    discounts: [
      { minHours: 24, discountPercent: 15 },
      { minHours: 72, discountPercent: 25 }
    ]
  });

  // Simulator State (Scope C Authoritative Live Quotes)
  const [simStart, setSimStart] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  });
  const [simEnd, setSimEnd] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 5);
    return d.toISOString().slice(0, 16);
  });
  const [simVehicleCategory, setSimVehicleCategory] = useState('ALL');
  const [simBayId, setSimBayId] = useState('');
  const [simMultiplier, setSimMultiplier] = useState(1.0);
  const [simQuote, setSimQuote] = useState<QuoteAndAvailabilityResponse | null>(null);
  const [simLegacyQuote, setSimLegacyQuote] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    if (activeFacilityId) {
      loadFacilityData(activeFacilityId);
    }
  }, [activeFacilityId]);

  const loadFacilityData = async (facId: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [plans, bays, rules] = await Promise.all([
        api.getRatePlans(facId).catch(() => []),
        api.getBays(facId).catch(() => []),
        api.getPricingRules(facId).catch(() => [])
      ]);

      setRatePlans(plans);
      setFacilityBays(bays);

      if (rules.length > 0) {
        const rule = rules[0];
        setPricingRule(rule);
        setFormData({
          name: rule.name,
          baseHourlyRate: rule.baseHourlyRate,
          dailyMaxRate: rule.dailyMaxRate,
          overnightFlatRate: rule.overnightFlatRate,
          surgeMultiplier: rule.surgeMultiplier,
          weekendHourlyRate: rule.weekendHourlyRate || 6.0,
          peakHours: rule.peakHours || [],
          specialEvents: rule.specialEvents || [],
          discounts: rule.discounts || []
        });
      }
    } catch (err: any) {
      console.error('Failed to load facility data', err);
      setErrorMessage(err.message || 'Failed to load pricing data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacilityId) return;
    try {
      setSubmittingPlan(true);
      setErrorMessage(null);

      const hourlyCents = Math.round(Number(newPlanData.hourlyRateDollars) * 100);
      const dailyCents = Math.round(Number(newPlanData.dailyRateDollars) * 100);

      if (hourlyCents <= 0 && dailyCents <= 0) {
        throw new Error('At least one of hourly rate or daily rate must be greater than $0.00');
      }

      await api.createRatePlan(activeFacilityId, {
        name: newPlanData.name.trim(),
        bayId: newPlanData.bayId ? newPlanData.bayId : undefined,
        spaceId: newPlanData.bayId ? newPlanData.bayId : undefined,
        vehicleCategory: newPlanData.vehicleCategory,
        hourlyRateCents: hourlyCents,
        dailyRateCents: dailyCents,
        minBillableMinutes: 60,
        minBookingMinutes: Number(newPlanData.minBookingMinutes) || 60,
        maxBookingMinutes: Number(newPlanData.maxBookingMinutes) || 4320,
        stepMinutes: 30,
        effectiveFromUtc: new Date(newPlanData.effectiveFromUtc).toISOString(),
        effectiveUntilUtc: newPlanData.effectiveUntilUtc ? new Date(newPlanData.effectiveUntilUtc).toISOString() : undefined,
        isActive: newPlanData.isActive
      });

      setSaveSuccess('Rate plan created successfully!');
      setTimeout(() => setSaveSuccess(null), 3500);
      setShowAddPlanModal(false);
      setNewPlanData({
        name: '',
        bayId: '',
        vehicleCategory: 'ALL',
        hourlyRateDollars: 5.0,
        dailyRateDollars: 35.0,
        minBookingMinutes: 60,
        maxBookingMinutes: 4320,
        effectiveFromUtc: new Date().toISOString().slice(0, 16),
        effectiveUntilUtc: '',
        isActive: true
      });
      await loadFacilityData(activeFacilityId);
      runSimulator();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create rate plan.');
    } finally {
      setSubmittingPlan(false);
    }
  };

  const handleToggleRatePlanActive = async (plan: RatePlan) => {
    try {
      await api.updateRatePlan(plan.id, { isActive: !plan.isActive });
      setSaveSuccess(`Rate plan "${plan.name}" ${!plan.isActive ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setSaveSuccess(null), 3000);
      loadFacilityData(activeFacilityId);
      runSimulator();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update rate plan status.');
    }
  };

  const handleDeleteRatePlan = async (plan: RatePlan) => {
    if (!confirm(`Are you sure you want to delete rate plan "${plan.name}"?`)) return;
    try {
      await api.deleteRatePlan(plan.id);
      setSaveSuccess(`Rate plan "${plan.name}" removed.`);
      setTimeout(() => setSaveSuccess(null), 3000);
      loadFacilityData(activeFacilityId);
      runSimulator();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete rate plan.');
    }
  };

  const handleSaveLegacySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacilityId) return;
    try {
      if (pricingRule) {
        await api.updatePricingRule(pricingRule.id, formData);
      } else {
        await api.createPricingRule(activeFacilityId, formData);
      }
      setSaveSuccess('Tariff schedule saved successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
      loadFacilityData(activeFacilityId);
      runSimulator();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving pricing schedule.');
    }
  };

  const runSimulator = async () => {
    if (!activeFacilityId) return;
    try {
      setSimLoading(true);
      setSimError(null);

      const startIso = new Date(simStart).toISOString();
      const endIso = new Date(simEnd).toISOString();

      if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
        setSimError('Departure time must be strictly after arrival time.');
        setSimQuote(null);
        return;
      }

      const res = await api.getAuthoritativeQuote({
        facilityId: activeFacilityId,
        startTimeUtc: startIso,
        endTimeUtc: endIso,
        bayId: simBayId || undefined,
        vehicleCategory: simVehicleCategory !== 'ALL' ? simVehicleCategory : undefined,
        bayMultiplier: simMultiplier
      });

      setSimQuote(res);

      // Also get legacy quote values for compatibility display
      const leg = await api.getPricingEstimate(activeFacilityId, startIso, endIso, simMultiplier, simVehicleCategory, simBayId);
      setSimLegacyQuote(leg);
    } catch (err: any) {
      setSimError(err.message || 'Failed to calculate quote and availability.');
      setSimQuote(null);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    runSimulator();
  }, [simStart, simEnd, simMultiplier, simVehicleCategory, simBayId, activeFacilityId]);

  return (
    <div className="space-y-6">
      {/* Header and Facility Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Yield Management & Authoritative Pricing Rules
          </div>
          <div className="flex items-center gap-3">
            <select
              value={activeFacilityId}
              onChange={e => onSelectFacility(e.target.value)}
              className="text-base font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">
              Timezone: {facilities.find(f => f.id === activeFacilityId)?.timezone || 'Asia/Kolkata'}
            </span>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {saveSuccess}
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {errorMessage}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ratePlans')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ratePlans'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rate Plans & Vehicle Tariffs ({ratePlans.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('legacySchedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'legacySchedule'
              ? 'bg-sky-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Dynamic Surcharges & Discounts</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'ratePlans' ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">
                    Authoritative Rate Plans
                  </h3>
                  <p className="text-xs text-slate-500">
                    5-Tier strict precedence: Bay + Vehicle Category &gt; Bay Default &gt; Facility + Vehicle Category &gt; Facility Default.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Rate Plan</span>
                </button>
              </div>

              {ratePlans.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <Tag className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No Custom Rate Plans Configured</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    The facility currently charges the baseline default rate. Add dedicated rate plans for specific vehicle categories or individual bays.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddPlanModal(true)}
                    className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800"
                  >
                    Configure First Rate Plan
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {ratePlans.map(plan => {
                    const bay = facilityBays.find(b => b.id === (plan.bayId || plan.spaceId));
                    return (
                      <div
                        key={plan.id}
                        className={`p-4 rounded-xl border transition-all ${
                          plan.isActive
                            ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
                            : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{plan.name}</h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  plan.isActive
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {plan.isActive ? 'Active' : 'Inactive'}
                              </span>
                              {plan.bayId ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Bay Override: {bay?.identifier || plan.bayId}
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  Facility-Wide
                                </span>
                              )}
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                Category: {plan.vehicleCategory || 'ALL'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              <span>
                                <strong className="text-slate-900 font-bold">
                                  ${((plan.hourlyRateCents || 0) / 100).toFixed(2)}
                                </strong>
                                /hr
                              </span>
                              <span>•</span>
                              <span>
                                Daily Max:{' '}
                                <strong className="text-slate-900 font-bold">
                                  ${((plan.dailyRateCents || 0) / 100).toFixed(2)}
                                </strong>
                                /day
                              </span>
                              <span>•</span>
                              <span>
                                Duration: {plan.minBookingMinutes || 60}m - {plan.maxBookingMinutes || 4320}m
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleRatePlanActive(plan)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                plan.isActive
                                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {plan.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRatePlan(plan)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                              title="Delete Plan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveLegacySchedule} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1">
                  Baseline Tariffs & Schedule Modifiers
                </h3>
                <p className="text-xs text-slate-500">
                  Global tariffs that apply when no bay-specific or category-specific rate plan takes precedence.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Baseline Hourly Rate ($/hr) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      step="0.25"
                      min="1"
                      required
                      value={formData.baseHourlyRate}
                      onChange={e => setFormData({ ...formData, baseHourlyRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Tier 5 Baseline fallback</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Daily Maximum Cap ($/day) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="5"
                      required
                      value={formData.dailyMaxRate}
                      onChange={e => setFormData({ ...formData, dailyMaxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Ceiling charge per 24 hours</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Overnight Flat Rate ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="5"
                      value={formData.overnightFlatRate}
                      onChange={e => setFormData({ ...formData, overnightFlatRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Flat rate for 20:00 - 08:00</span>
                </div>
              </div>

              {/* Dynamic Surge & Weekend Multiplier */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-sky-500" />
                    Commute Peak Surge & Weekend Rates
                  </h4>
                  <p className="text-xs text-slate-500">
                    Automated rate multiplier for high-density congestion windows.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Peak Rush Surge Multiplier
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="3.0"
                        value={formData.surgeMultiplier}
                        onChange={e => setFormData({ ...formData, surgeMultiplier: parseFloat(e.target.value) || 1.0 })}
                        className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        ({Math.round((formData.surgeMultiplier - 1) * 100)}% surge during 08:00-10:00 & 16:00-19:00)
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Weekend Hourly Rate ($/hr)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-xs">$</span>
                      <input
                        type="number"
                        step="0.25"
                        min="1"
                        value={formData.weekendHourlyRate}
                        onChange={e => setFormData({ ...formData, weekendHourlyRate: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Applies Saturdays and Sundays</span>
                  </div>
                </div>
              </div>

              {/* Long-Stay Volume Discounts */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-500" />
                  Long-Stay Volume Discounts
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {formData.discounts.map((disc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs">
                      <div>
                        <span className="font-semibold text-emerald-900">
                          {disc.discountPercent}% Off
                        </span>{' '}
                        for stays over {disc.minHours} hours
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Tariff Modifiers</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Live Simulator & Rate Estimator (1 Col) */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight">
                  Authoritative Quote & Availability Simulator
                </h3>
                <span className="text-[11px] text-slate-400">
                  Section 3C real-time validation engine
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Start Arrival Time
                </label>
                <input
                  type="datetime-local"
                  value={simStart}
                  onChange={e => setSimStart(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  End Departure Time
                </label>
                <input
                  type="datetime-local"
                  value={simEnd}
                  onChange={e => setSimEnd(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Vehicle Category
                </label>
                <select
                  value={simVehicleCategory}
                  onChange={e => setSimVehicleCategory(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                >
                  {VEHICLE_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Target Bay (Optional Override)
                </label>
                <select
                  value={simBayId}
                  onChange={e => setSimBayId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                >
                  <option value="">Any Compatible Facility Bay</option>
                  {facilityBays.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.identifier} ({b.zone} - {b.vehicleCompatibility?.join(', ') || 'Standard'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-[11px] font-medium mb-1">
                  Bay Multiplier (Physical Amenity)
                </label>
                <select
                  value={simMultiplier}
                  onChange={e => setSimMultiplier(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                >
                  <option value={1.0}>Standard Bay (1.0x)</option>
                  <option value={1.1}>Oversized / Premium Zone (1.1x)</option>
                  <option value={1.2}>EV Fast Charging Multiplier (1.2x)</option>
                  <option value={0.6}>Motorcycle Dedicated (0.6x)</option>
                </select>
              </div>
            </div>

            {/* Error State */}
            {simError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-xl text-rose-300 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Validation Error</span>
                </div>
                <p className="text-[11px] leading-relaxed">{simError}</p>
              </div>
            )}

            {/* Quote and Availability Results */}
            {simQuote ? (
              <div className="pt-3 border-t border-slate-800 space-y-3 text-xs">
                {/* Real Availability Indicator */}
                <div className="p-3 rounded-xl border flex items-start gap-2.5"
                     style={{
                       backgroundColor: simQuote.isAvailable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                       borderColor: simQuote.isAvailable ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                     }}
                >
                  {simQuote.isAvailable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-2">
                      <span className={simQuote.isAvailable ? 'text-emerald-400' : 'text-rose-400'}>
                        {simQuote.isAvailable ? 'Space Available' : 'No Capacity Available'}
                      </span>
                      <span className="text-[10px] font-normal px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded">
                        {simQuote.availableCapacity} / {simQuote.totalCapacity} bays
                      </span>
                    </div>
                    {!simQuote.isAvailable && simQuote.unavailabilityReason && (
                      <p className="text-[11px] text-rose-300 leading-tight">
                        {simQuote.unavailabilityReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Precedence Tier and Rate Rule Badge */}
                <div className="flex justify-between items-center text-[11px] text-slate-400 bg-slate-800/60 p-2 rounded-lg">
                  <span>Rule Precedence:</span>
                  <span className="font-semibold text-sky-300">
                    {simQuote.precedenceTier || 'Applied Rate Plan'}
                  </span>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Duration:</span>
                    <span className="font-medium text-white">
                      {simQuote.billableHours} hrs ({simQuote.durationMinutes} mins)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Applied Rate:</span>
                    <span className="font-medium text-white">
                      ${((simQuote.appliedHourlyRateCents || 0) / 100).toFixed(2)}/hr (${((simQuote.appliedDailyRateCents || 0) / 100).toFixed(2)}/day)
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Billing Basis:</span>
                    <span className="font-medium text-white capitalize">
                      {simQuote.rateTierApplied || 'Hourly'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Base Parking Charge:</span>
                    <span className="font-medium text-white">
                      ${((simQuote.baseAmountCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Refundable Escrow Deposit:</span>
                    <span className="font-medium text-slate-300">
                      ${((simQuote.securityDepositCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Platform Fee (15%):</span>
                    <span className="font-medium text-slate-300">
                      ${((simQuote.platformFeeCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Taxes (10%):</span>
                    <span className="font-medium text-slate-300">
                      ${((simQuote.taxesCents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Total Gross Price */}
                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-white">Total Customer Price:</span>
                  <span className="font-bold text-sky-400 text-lg">
                    ${((simQuote.totalPayableCents || 0) / 100).toFixed(2)}
                  </span>
                </div>

                {/* Host Net Earnings Box */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold text-emerald-400 text-xs">
                    <span>Host Net Earnings:</span>
                    <span>
                      ${((((simQuote.baseAmountCents || 0) - (simQuote.platformFeeCents || 0))) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Net credited to host account upon successful checkout.
                  </div>
                </div>

                {/* Informational Disclaimer */}
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 italic">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Informational quote — guaranteed upon customer checkout hold.</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add Rate Plan Modal */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-sky-500" />
                <h3 className="font-bold text-slate-900 text-base">Create New Rate Plan</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPlanModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRatePlan} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rate Plan Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EV Charging Dedicated Rate, SUV Weekend Tariff"
                  value={newPlanData.name}
                  onChange={e => setNewPlanData({ ...newPlanData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target Bay Scope</label>
                  <select
                    value={newPlanData.bayId}
                    onChange={e => setNewPlanData({ ...newPlanData, bayId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    <option value="">Facility-Wide (All Bays)</option>
                    {facilityBays.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.identifier} ({b.zone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle Category</label>
                  <select
                    value={newPlanData.vehicleCategory}
                    onChange={e => setNewPlanData({ ...newPlanData, vehicleCategory: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  >
                    {VEHICLE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Hourly Rate ($/hr) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      required
                      value={newPlanData.hourlyRateDollars}
                      onChange={e => setNewPlanData({ ...newPlanData, hourlyRateDollars: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Daily Cap ($/day) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      required
                      value={newPlanData.dailyRateDollars}
                      onChange={e => setNewPlanData({ ...newPlanData, dailyRateDollars: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Min Duration (minutes)</label>
                  <input
                    type="number"
                    step="15"
                    min="15"
                    value={newPlanData.minBookingMinutes}
                    onChange={e => setNewPlanData({ ...newPlanData, minBookingMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max Duration (minutes)</label>
                  <input
                    type="number"
                    step="60"
                    min="60"
                    value={newPlanData.maxBookingMinutes}
                    onChange={e => setNewPlanData({ ...newPlanData, maxBookingMinutes: parseInt(e.target.value) || 4320 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="planIsActive"
                  checked={newPlanData.isActive}
                  onChange={e => setNewPlanData({ ...newPlanData, isActive: e.target.checked })}
                  className="rounded-sm text-sky-500 focus:ring-sky-500 w-4 h-4"
                />
                <label htmlFor="planIsActive" className="text-slate-700 font-medium cursor-pointer">
                  Activate rate plan immediately upon creation
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPlan}
                  className="px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submittingPlan ? 'Creating...' : 'Create Rate Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
