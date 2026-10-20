import React, { useState, useEffect } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount, PricingCalculationResult } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser: UserAccount | null;
  onNavigate: (path: string) => void;
  spaceIdParam?: string;
  startsAtParam?: string;
  endsAtParam?: string;
  plateParam?: string;
}

export function ChoosePaymentMethodPage({
  currentUser,
  onNavigate,
  spaceIdParam = '10000000-0000-4000-b000-000000000104-01',
  startsAtParam,
  endsAtParam,
  plateParam = 'TN-09-CB-4821',
}: Props) {
  const { tenant } = useBrand();
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking' | 'fastag'>('upi');
  const [upiId, setUpiId] = useState('driver@okaxis');
  const [pricing, setPricing] = useState<PricingCalculationResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(540); // 9 minutes holding countdown

  const client = new ParkEazyApiClient({ baseUrl: '/api/v1' });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const methods = [
    {
      id: 'upi',
      name: 'UPI Instant Pay',
      desc: 'Google Pay, PhonePe, Paytm, BHIM UPI',
      icon: '⚡',
      badge: 'Zero Convenience Fee',
    },
    {
      id: 'card',
      name: 'Credit or Debit Card',
      desc: 'Visa, MasterCard, RuPay, Corporate Amex',
      icon: '💳',
      badge: '256-Bit SSL Encrypted',
    },
    {
      id: 'fastag',
      name: 'NETC Fastag Wallet',
      desc: 'Auto-debit from vehicle RFID sticker',
      icon: '🚗',
      badge: 'Touchless Gate',
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      desc: 'All Indian Banks (SBI, HDFC, ICICI, Axis)',
      icon: '🏦',
      badge: 'Secure Redirect',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      {/* Header */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => onNavigate('/book/review')}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#101828]"
          >
            ← Back to Review
          </button>

          {/* Bay holding timer */}
          <div className="flex items-center gap-2 bg-[#F1F5F9] px-3 py-1.5 rounded-full text-xs">
            <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping"></span>
            <span className="font-semibold text-[#334155]">Bay Held:</span>
            <span className="font-mono font-bold text-[#101828]">{formatTimer(timeLeft)}</span>
          </div>

          <div className="text-xs text-[#0F766E] font-bold">256-Bit Escrow</div>
        </div>
      </header>

      {/* Stepper Pipeline */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-6">
        <div className="bg-white p-4 rounded-xl border border-[#E2E8F0] shadow-xs grid grid-cols-4 gap-2 text-center text-xs">
          <div className="text-[#0F766E] font-bold">✓ 1. Duration</div>
          <div className="text-[#0F766E] font-bold">✓ 2. Bay Selection</div>
          <div className="text-[#0F766E] font-bold">✓ 3. Vehicle Plate</div>
          <div className="text-[#0F766E] font-black border-b-2 border-[#0F766E] pb-1">4. Payment (Active)</div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-4 py-6 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Methods (2 cols) */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
              choose_payment_method_pe_uw_05_01
            </span>
            <h1 className="text-xl font-bold text-[#101828] font-['Plus_Jakarta_Sans'] mt-1">
              Select Payment Method
            </h1>
            <p className="text-xs text-[#64748B]">Choose your preferred checkout channel.</p>
          </div>

          <div className="space-y-3">
            {methods.map((m) => (
              <div
                key={m.id}
                onClick={() => setSelectedMethod(m.id as any)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedMethod === m.id
                    ? 'border-[#0F766E] bg-white ring-2 ring-[#0F766E]/20 shadow-xs'
                    : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#101828]">{m.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E6F7F4] text-[#0F766E]">
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment-method"
                    checked={selectedMethod === m.id}
                    onChange={() => setSelectedMethod(m.id as any)}
                    className="w-4 h-4 text-[#0F766E]"
                  />
                </div>

                {selectedMethod === m.id && m.id === 'upi' && (
                  <div className="mt-4 pt-3 border-t border-[#F1F5F9]">
                    <label className="block text-xs font-semibold text-[#344054] mb-1">Enter Virtual Payment Address (VPA)</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="mobile@upi or id@bank"
                      className="w-full text-xs px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => onNavigate('/payment/review')}
            className="w-full py-3 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] transition-all shadow-sm"
          >
            Review & Authorize Payment →
          </button>
        </div>

        {/* Pricing Summary (1 col) */}
        <div>
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4 text-xs">
            <h2 className="text-sm font-bold text-[#101828]">Reservation Summary</h2>
            <div className="space-y-2 border-b border-[#E2E8F0] pb-3">
              <div className="flex justify-between text-[#64748B]">
                <span>Assigned Space:</span>
                <span className="font-bold text-[#101828]">Bay A-01</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Vehicle Plate:</span>
                <span className="font-mono font-bold text-[#101828]">{plateParam}</span>
              </div>
              <div className="flex justify-between text-[#64748B]">
                <span>Duration:</span>
                <span className="font-medium text-[#101828]">2 Hours</span>
              </div>
            </div>

            <div className="space-y-1.5 border-b border-[#E2E8F0] pb-3 text-[#64748B]">
              <div className="flex justify-between">
                <span>Parking Base Fare</span>
                <span>₹100.00</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Convenience Fee</span>
                <span>₹10.00</span>
              </div>
              <div className="flex justify-between">
                <span>Statutory GST (18%)</span>
                <span>₹18.00</span>
              </div>
            </div>

            <div className="flex justify-between font-extrabold text-sm text-[#101828]">
              <span>Total Payable</span>
              <span>₹128.00</span>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-lg text-[11px] text-[#64748B]">
              🔒 Payments held in secure escrow until arrival gate verification.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
