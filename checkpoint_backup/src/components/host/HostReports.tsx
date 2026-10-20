import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Download, FileSpreadsheet, PieChart, Clock, Percent } from 'lucide-react';
import { User } from '../../types';
import { api } from '../../api';

interface HostReportsProps {
  currentUser: User;
}

export const HostReports: React.FC<HostReportsProps> = ({ currentUser }) => {
  const [report, setReport] = useState<{
    totalBays: number;
    occupiedBays: number;
    occupancyRate: number;
    grossRevenue: number;
    netEarnings: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
    hourlyDistribution: number[];
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [currentUser.id]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await api.getHostReports(currentUser.id);
      setReport(data);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parkeazy_analytics_report_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  if (loading || !report) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading analytics & operational reports...</div>;
  }

  // Max peak hour
  const maxHourCount = Math.max(...report.hourlyDistribution, 1);

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Operational Intelligence
          </span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Facility Utilization & Revenue Reports
          </h2>
          <p className="text-xs text-slate-500">
            Real-time occupancy rates, peak arrival patterns, and platform yield analytics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Gross Revenue</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            ${report.grossRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Net Earnings: ${report.netEarnings.toFixed(2)}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Current Occupancy</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {report.occupancyRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {report.occupiedBays} of {report.totalBays} bays occupied
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Total Reservations</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {report.totalBookings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {report.completedBookings} completed sessions
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase">Cancellation Rate</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {report.cancellationRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {report.cancelledBookings} cancelled bookings
          </div>
        </div>
      </div>

      {/* Hourly Arrival Demand Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              24-Hour Parking Demand Distribution
            </h3>
            <p className="text-xs text-slate-400">
              Peak arrival hours used to optimize surge pricing multipliers.
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-100">
            Smart Surge Calibration
          </span>
        </div>

        <div className="h-44 flex items-end gap-1.5 pt-6 pb-2 px-2">
          {report.hourlyDistribution.map((count, hour) => {
            const heightPercent = maxHourCount > 0 ? (count / maxHourCount) * 100 : 0;
            const isRush = (hour >= 8 && hour <= 10) || (hour >= 16 && hour <= 19);
            return (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 px-2 py-0.5 rounded bg-slate-900 text-white text-[9px] pointer-events-none z-10 whitespace-nowrap shadow-md">
                  {hour}:00 · {count} Bookings
                </div>

                <div
                  className={`w-full rounded-t-md transition-all duration-300 min-h-[4px] ${
                    isRush ? 'bg-sky-500 group-hover:bg-sky-400' : 'bg-slate-300 group-hover:bg-slate-400'
                  }`}
                  style={{ height: `${Math.max(6, heightPercent)}%` }}
                />

                <span className="text-[9px] text-slate-400 font-mono">
                  {hour % 3 === 0 ? hour : ''}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <span>00:00 (Midnight)</span>
          <span className="flex items-center gap-1.5 text-sky-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Commute Peak Windows (8-10 AM, 4-7 PM)
          </span>
          <span>23:00 (Night)</span>
        </div>
      </div>
    </div>
  );
};
