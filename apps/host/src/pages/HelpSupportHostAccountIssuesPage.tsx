import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function HelpSupportHostAccountIssuesPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [tickets, setTickets] = useState([
    {
      id: 'TCK-4819',
      subject: 'Lane 2 ANPR camera calibration assistance',
      category: 'HARDWARE_GATE',
      status: 'RESOLVED',
      date: '10-Oct-2026',
    },
    {
      id: 'TCK-4902',
      subject: 'Clarification regarding GST credit invoice mapping for Sep 2026',
      category: 'FINANCIAL_TAX',
      status: 'IN_REVIEW',
      date: '13-Oct-2026',
    },
  ]);

  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('OPERATIONAL_ASSIST');
  const [newDescription, setNewDescription] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject) return;
    const ticketId = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
    setTickets((prev) => [
      {
        id: ticketId,
        subject: newSubject,
        category: newCategory,
        status: 'SUBMITTED',
        date: 'Today',
      },
      ...prev,
    ]);
    setNewSubject('');
    setNewDescription('');
    setSuccessMsg(`Support ticket #${ticketId} created. Host operations engineer assigned.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-11 • Host Helpdesk
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_06_09 • Ticketing & Support</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Host Help & Support Desk
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/dashboard')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Return to Dashboard →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {successMsg && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 rounded-xl flex items-center justify-between text-xs text-[#065F46] font-semibold">
            <span>✓ {successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-[#065F46] font-bold">×</button>
          </div>
        )}

        {/* Create Ticket Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
          <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
            Open Dedicated Host Support Ticket
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#344054] mb-1">Issue Subject</label>
              <input
                type="text"
                placeholder="Brief summary of facility or account issue"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#334155] focus:outline-none"
              >
                <option value="OPERATIONAL_ASSIST">Operational / Slot Issue</option>
                <option value="HARDWARE_GATE">Gate Barrier / Scanner</option>
                <option value="FINANCIAL_TAX">Payouts & Tax Invoices</option>
                <option value="ACCOUNT_ACCESS">Host Account Access</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">Issue Details & Observations</label>
            <textarea
              rows={3}
              placeholder="Provide exact bay ID, transaction ref, or hardware error codes..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] shadow-xs"
            >
              Submit Support Ticket
            </button>
          </div>
        </form>

        {/* Existing Tickets */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#101828] uppercase tracking-wider">
              Submitted Host Inquiries ({tickets.length})
            </h3>
          </div>

          <div className="divide-y divide-[#E2E8F0]">
            {tickets.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between hover:bg-[#F8FAFC]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#101828]">#{t.id}</span>
                    <span className="font-semibold text-xs text-[#101828]">{t.subject}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475467]">
                      {t.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B] mt-0.5 block">{t.date}</span>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  t.status === 'RESOLVED'
                    ? 'bg-[#ECFDF5] text-[#065F46]'
                    : t.status === 'IN_REVIEW'
                      ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                      : 'bg-[#FEF3C7] text-[#92400E]'
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
