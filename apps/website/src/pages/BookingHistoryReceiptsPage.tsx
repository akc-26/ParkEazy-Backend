import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, BookingDetailsResponse, TaxInvoiceReceipt } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
  bookingIdParam?: string;
}

export function BookingHistoryReceiptsPage({
  currentUser: _currentUser,
  onNavigate,
  bookingIdParam,
}: Props) {
  const { tenant } = useBrand();
  const [bookings, setBookings] = useState<BookingDetailsResponse[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<TaxInvoiceReceipt | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    async function loadData() {
      try {
        const list = await client.bookings.getMyBookings();
        setBookings(list);

        if (bookingIdParam) {
          const receipt = await client.bookings.getReceipt(bookingIdParam);
          setSelectedReceipt(receipt);
        } else if (list.length > 0) {
          const receipt = await client.bookings.getReceipt(list[0].id);
          setSelectedReceipt(receipt);
        }
      } catch (err) {
        console.error('Failed to load receipts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [bookingIdParam]);

  const handleSelectBooking = async (id: string) => {
    try {
      const receipt = await client.bookings.getReceipt(id);
      setSelectedReceipt(receipt);
    } catch (err) {
      console.error('Failed to fetch invoice:', err);
    }
  };

  const filtered = bookings.filter((b) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      b.bookingReference.toLowerCase().includes(q) ||
      b.vehiclePlate.toLowerCase().includes(q) ||
      (b.facilityName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#141B2C]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4E7EC]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('/bookings')}
              className="flex items-center gap-2 text-xs font-bold text-[#64748B] hover:text-[#0F766E] cursor-pointer"
            >
              <span>←</span> Back to My Bookings
            </button>
            <span className="text-xs bg-[#E6F7F4] text-[#0F766E] px-2.5 py-1 rounded-full font-mono font-bold">
              pe_uw_06_07 • GST Invoices
            </span>
          </div>

          <button
            onClick={() => {
              alert('Downloading statement of bookings in CSV format.');
            }}
            className="text-xs font-bold text-[#0F766E] px-3 py-1.5 rounded-lg border border-[#0F766E] hover:bg-[#E6F7F4] cursor-pointer"
          >
            📥 Export CSV
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] tracking-tight">
            Booking History &amp; Invoices
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] mt-1">
            Compliant Indian GST Tax Invoices (SAC 996729) and settlement credit notes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: List of receipts */}
          <div className="lg:col-span-1 space-y-4">
            <input
              type="text"
              placeholder="Search by Plate, Ref, or Facility..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full text-xs font-semibold px-4 py-2.5 rounded-xl border border-[#D0D5DD] bg-white outline-none focus:border-[#0F766E]"
            />

            <div className="space-y-2.5">
              {filtered.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleSelectBooking(b.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedReceipt?.bookingReference === b.bookingReference
                      ? 'bg-[#E6F7F4]/50 border-[#0F766E] shadow-xs'
                      : 'bg-white border-[#E4E7EC] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-[#0F766E]">{b.bookingReference}</span>
                    <span className="font-extrabold text-[#141B2C]">₹{b.pricing.totalAmountInr.toFixed(2)}</span>
                  </div>
                  <div className="text-xs font-semibold text-[#141B2C] truncate">
                    {b.facilityName || 'Anna Nagar Plaza'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#667085] mt-1">
                    <span>Plate: {b.vehiclePlate}</span>
                    <span className="capitalize">{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 2 Columns: Selected GST Tax Invoice */}
          <div className="lg:col-span-2">
            {selectedReceipt ? (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E4E7EC] shadow-md space-y-6">
                {/* Invoice Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E4E7EC]">
                  <div>
                    <div className="text-xs font-bold text-[#0F766E] uppercase tracking-wider">
                      Tax Invoice (Original for Recipient)
                    </div>
                    <h2 className="text-xl font-extrabold text-[#141B2C] font-['Plus_Jakarta_Sans'] mt-0.5">
                      {selectedReceipt.invoiceNumber}
                    </h2>
                    <span className="text-xs text-[#667085]">Dated: {selectedReceipt.invoiceDate}</span>
                  </div>

                  <div className="text-left sm:text-right text-xs text-[#667085]">
                    <span className="font-bold text-[#141B2C] block">ParkEazy Technologies Pvt. Ltd.</span>
                    <span>GSTIN: 33AAACP1234F1Z8</span>
                    <span className="block">SAC Code: 996729 (Parking Services)</span>
                  </div>
                </div>

                {/* Billed To & Facility Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#344054] pb-6 border-b border-[#E4E7EC]">
                  <div className="space-y-1">
                    <span className="text-[#667085] font-bold uppercase tracking-wider block">Billed To (Customer):</span>
                    <span className="font-bold text-sm text-[#141B2C] block">{selectedReceipt.customerName}</span>
                    <span>Vehicle Reg: <strong className="font-mono">{selectedReceipt.vehiclePlate}</strong></span>
                    <span className="block">Place of Supply: Tamil Nadu (State Code: 33)</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[#667085] font-bold uppercase tracking-wider block">Parking Facility:</span>
                    <span className="font-bold text-sm text-[#141B2C] block">{selectedReceipt.facilityName}</span>
                    <span className="block text-[#667085]">{selectedReceipt.facilityAddress}</span>
                    <span className="block font-mono text-[#0F766E]">Booking Ref: {selectedReceipt.bookingReference}</span>
                  </div>
                </div>

                {/* Line Item Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E4E7EC] text-[#667085] font-semibold">
                        <th className="py-2">Description</th>
                        <th className="py-2">SAC</th>
                        <th className="py-2 text-right">Duration</th>
                        <th className="py-2 text-right">Taxable Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E7EC] text-[#344054]">
                      <tr>
                        <td className="py-3 font-semibold">Base Stall Reservation Charge</td>
                        <td className="py-3 font-mono">996729</td>
                        <td className="py-3 text-right">{selectedReceipt.durationHours} hrs</td>
                        <td className="py-3 text-right font-mono">₹{selectedReceipt.baseAmountInr.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">Platform Convenience &amp; ANPR Fee</td>
                        <td className="py-3 font-mono">996729</td>
                        <td className="py-3 text-right">-</td>
                        <td className="py-3 text-right font-mono">₹{selectedReceipt.platformFeeInr.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tax Breakdown */}
                <div className="bg-[#F8FAFC] rounded-2xl p-5 border border-[#E4E7EC] space-y-2 text-xs text-[#344054]">
                  <div className="flex justify-between">
                    <span className="text-[#667085]">Central GST (CGST @ 9%):</span>
                    <span className="font-mono">₹{selectedReceipt.cgstInr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#667085]">State GST (SGST @ 9%):</span>
                    <span className="font-mono">₹{selectedReceipt.sgstInr.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E4E7EC] flex justify-between text-base font-extrabold text-[#141B2C]">
                    <span>Total Amount Paid (INR):</span>
                    <span className="text-[#0F766E] font-mono">₹{selectedReceipt.totalAmountInr.toFixed(2)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D655E] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🖨️</span> Print / Save PDF
                  </button>
                  <button
                    onClick={() => alert(`Email copy dispatched to ${selectedReceipt.customerName}.`)}
                    className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#344054] hover:bg-[#F8FAFC] cursor-pointer"
                  >
                    ✉️ Email Receipt
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-[#E4E7EC] text-center text-xs text-[#667085]">
                Select an invoice from the list to preview details.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
