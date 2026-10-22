import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function EarningsReportsExportCentrePage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [reportType, setReportType] = useState('MONTHLY_GST');
  const [format, setFormat] = useState('CSV');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setDownloadSuccess(`Generated ${reportType} report in ${format} format. Downloading file...`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-10 • Reports & Exports
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_05_08 • Financial Statement Dispatch</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Earnings Reports Export Centre
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/earnings/exceptions')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Reconciliation Desk →
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {downloadSuccess && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {downloadSuccess}</span>
            <button onClick={() => setDownloadSuccess(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        <form onSubmit={handleGenerate} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">Select Report Category</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
            >
              <option value="MONTHLY_GST">Monthly GSTR-1 Tax Invoice Summary (GST Credit)</option>
              <option value="ITEMIZED_LEDGER">Full Itemized Transaction Ledger (Gross, Fees, Net)</option>
              <option value="BAY_PERFORMANCE">Bay Utilization & Space-by-Space Yield Matrix</option>
              <option value="ANNUAL_STATEMENT">Annual Comprehensive Earnings Certificate</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Date Window</label>
              <select className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none">
                <option>Current Month (October 2026)</option>
                <option>Last Month (September 2026)</option>
                <option>Financial Q3 (Oct - Dec 2026)</option>
                <option>Custom Date Range</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">File Format</label>
              <div className="flex gap-2">
                {['CSV', 'PDF', 'XLSX'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${
                      format === f
                        ? 'bg-[#0F766E] text-white border-[#0F766E]'
                        : 'border-[#CBD5E1] text-[#64748B]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-xs"
            >
              Generate & Download Report
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
