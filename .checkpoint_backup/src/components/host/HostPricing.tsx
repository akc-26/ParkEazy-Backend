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
  ArrowRight
} from 'lucide-react';
import { Facility, PricingRule, User } from '../../types';
import { api } from '../../api';

interface HostPricingProps {
  facilities: Facility[];
  selectedFacilityId: string | null;
  onSelectFacility: (facilityId: string) => void;
  currentUser: User;
}

export const HostPricing: React.FC<HostPricingProps> = ({
  facilities,
  selectedFacilityId,
  onSelectFacility,
  currentUser
}) => {
  const activeFacilityId = selectedFacilityId || facilities[0]?.id;
  const [pricingRule, setPricingRule] = useState<PricingRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form State
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

  // Simulator State
  const [simStart, setSimStart] = useState('2026-10-20T08:00');
  const [simEnd, setSimEnd] = useState('2026-10-20T12:00');
  const [simMultiplier, setSimMultiplier] = useState(1.0);
  const [simQuote, setSimQuote] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    if (activeFacilityId) {
      loadPricing(activeFacilityId);
    }
  }, [activeFacilityId]);

  const loadPricing = async (facId: string) => {
    try {
      setLoading(true);
      const rules = await api.getPricingRules(facId);
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
    } catch (err) {
      console.error('Failed to load pricing', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacilityId) return;
    try {
      if (pricingRule) {
        await api.updatePricingRule(pricingRule.id, formData);
      } else {
        await api.createPricingRule(activeFacilityId, formData);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadPricing(activeFacilityId);
      runSimulator();
    } catch (err: any) {
      alert('Error saving pricing rules: ' + err.message);
    }
  };

  const runSimulator = async () => {
    if (!activeFacilityId) return;
    try {
      setSimLoading(true);
      const startIso = new Date(simStart).toISOString();
      const endIso = new Date(simEnd).toISOString();
      const quote = await api.getPricingEstimate(activeFacilityId, startIso, endIso, simMultiplier);
      setSimQuote(quote);
    } catch (err) {
      console.error('Failed simulator estimate', err);
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    runSimulator();
  }, [simStart, simEnd, simMultiplier, activeFacilityId]);

  return (
    <div className="space-y-6">
      {/* Header and Facility Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Yield Management & Dynamic Pricing
          </div>
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
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Pricing rules updated successfully
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Pricing Form (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">
                Standard & Daily Rate Schedules
              </h3>
              <p className="text-xs text-slate-500">
                Define the baseline hourly fees, overnight flat-rates, and daily maximum caps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Base Hourly Rate ($/hr) *
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
                <span className="text-[10px] text-slate-400 mt-1 block">Charged per hour of stay</span>
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
                  Peak Hours Surge & Weekend Surcharges
                </h4>
                <p className="text-xs text-slate-500">
                  Automatically increase rates during commute rush hours and weekend peaks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Commute Peak Surge Multiplier
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

            {/* Long-Stay Discounts */}
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

            {/* Special Event Overrides */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-500" />
                Special Event Surcharges & Windows
              </h4>

              <div className="space-y-2">
                {formData.specialEvents.map((ev, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-purple-50/50 border border-purple-200 text-xs">
                    <div>
                      <div className="font-semibold text-purple-900">{ev.eventName}</div>
                      <div className="text-[11px] text-purple-700">
                        {new Date(ev.startDate).toLocaleDateString()} - {new Date(ev.endDate).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="font-bold text-purple-800 text-xs">
                      +${ev.flatRateSurcharge.toFixed(2)} surcharge
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Pricing Schedule</span>
              </button>
            </div>
          </form>
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
                  Rate Calculator Simulator
                </h3>
                <span className="text-[11px] text-slate-400">
                  Verify pricing algorithm in real-time
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
                  Bay Multiplier (e.g. EV fast charger = 1.2x)
                </label>
                <select
                  value={simMultiplier}
                  onChange={e => setSimMultiplier(parseFloat(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-medium"
                >
                  <option value={1.0}>Standard Bay (1.0x)</option>
                  <option value={1.1}>Oversized / SUV (1.1x)</option>
                  <option value={1.2}>EV Fast Charging Bay (1.2x)</option>
                  <option value={0.6}>Motorcycle Dedicated (0.6x)</option>
                </select>
              </div>
            </div>

            {/* Calculated Output Breakdown */}
            {simQuote ? (
              <div className="pt-3 border-t border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Duration:</span>
                  <span className="font-medium text-white">{simQuote.totalHours} hours</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Base Rate Applied:</span>
                  <span className="font-medium text-white">${simQuote.baseHourlyRate}/hr</span>
                </div>
                {simQuote.appliedSurge > 1.0 && (
                  <div className="flex justify-between text-amber-400 font-medium">
                    <span>Surge Factor:</span>
                    <span>{simQuote.appliedSurge}x Peak</span>
                  </div>
                )}
                {simQuote.discountApplied > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Long-Stay Discount:</span>
                    <span>-${simQuote.discountApplied.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Sales Tax (8%):</span>
                  <span className="font-medium text-white">${simQuote.taxAmount.toFixed(2)}</span>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline text-sm">
                  <span className="font-bold text-white">Gross Customer Price:</span>
                  <span className="font-bold text-sky-400 text-lg">
                    ${simQuote.grossAmount.toFixed(2)}
                  </span>
                </div>

                {/* Host Net Earnings Box */}
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>Platform Fee (12%):</span>
                    <span>-${simQuote.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-400 text-xs pt-1 border-t border-slate-700">
                    <span>Host Net Earnings:</span>
                    <span>${simQuote.hostNetEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
