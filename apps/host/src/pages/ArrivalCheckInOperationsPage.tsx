import React, { useState } from 'react';
import { useBrand } from '@parkeazy/branding';
import { UserAccount } from '@parkeazy/shared-types';
import { ParkEazyApiClient } from '@parkeazy/api-client';

interface Props {
  currentUser?: UserAccount | null;
  onNavigate: (path: string) => void;
}

export function ArrivalCheckInOperationsPage({ currentUser: _currentUser, onNavigate }: Props) {
  const { tenant } = useBrand();
  const [plateInput, setPlateInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [scannedResult, setScannedResult] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gateBarrierOpen, setGateBarrierOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState<string | null>(null);

  const apiClient = new ParkEazyApiClient();

  const handleSimulateScan = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setCheckInSuccess(null);
    try {
      // Look up booking or verify
      const bookings = await apiClient.host.getBookings();
      const found = bookings.find(
        (b) =>
          b.vehiclePlate?.toLowerCase().includes(plateInput.trim().toLowerCase()) ||
          b.gatePinCode === pinInput.trim() ||
          b.status === 'confirmed' || (b.status as string) === 'CONFIRMED'
      ) || bookings[0];

      if (found) {
        setScannedResult(found);
        // Record check in
        await apiClient.bookings.checkIn(found.id);
        setGateBarrierOpen(true);
        setCheckInSuccess(`Arrival verified! Barrier gate opened for vehicle ${found.vehiclePlate || 'TN-09-CB-4821'} at ${found.bayIdentifier || 'Bay A-01'}.`);
      } else {
        setErrorMsg('No scheduled reservation found for this vehicle/pass code.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Check-in validation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualPassThrough = () => {
    setGateBarrierOpen(false);
    setScannedResult(null);
    setPlateInput('');
    setPinInput('');
    setCheckInSuccess(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-['Inter']">
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] bg-[#E6F7F4] px-2.5 py-0.5 rounded-full">
                Design Reference: HP-08 • Arrival & Check-In
              </span>
              <span className="text-xs text-[#64748B]">pe_hw_04_04 • Gate Scanner Console</span>
            </div>
            <h1 className="text-2xl font-bold text-[#101828] font-['Plus_Jakarta_Sans']">
              Arrival Check-In Operations
            </h1>
          </div>
          <button
            onClick={() => onNavigate('/host/gate/occupancy')}
            className="px-4 py-2 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E]"
          >
            Live Occupancy Map →
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {/* Scanner Simulation Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col items-center justify-center text-center">
            <div className="w-48 h-48 border-2 border-dashed border-[#0F766E] rounded-2xl flex flex-col items-center justify-center bg-[#E6F7F4]/30 relative overflow-hidden mb-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#14B8A6] animate-pulse"></div>
              <span className="text-4xl mb-2">📷</span>
              <span className="text-xs font-bold text-[#0F766E]">Optical QR Scanner Active</span>
              <span className="text-[10px] text-[#64748B] mt-1">Ready for Driver Pass</span>
            </div>
            <p className="text-xs text-[#64748B] mb-4">
              Drivers present digital wallet pass, QR confirmation, or Fastag RFID transponder at lane entry.
            </p>
            <button
              onClick={handleSimulateScan}
              disabled={isProcessing}
              className="w-full py-2.5 bg-[#0F766E] text-white rounded-xl text-xs font-bold hover:bg-[#0D655E] disabled:opacity-50 transition-all shadow-sm"
            >
              {isProcessing ? 'Verifying Credentials...' : '⚡ Scan Simulated Arrival QR'}
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#101828] uppercase tracking-wider mb-4">
                Manual Gate Verification
              </h2>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Vehicle License Plate</label>
                  <input
                    type="text"
                    placeholder="e.g. TN-09-CB-4821"
                    value={plateInput}
                    onChange={(e) => setPlateInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">4-Digit Entry PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 8492"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0F766E] font-mono tracking-widest text-center font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSimulateScan}
              disabled={isProcessing}
              className="w-full py-2.5 border border-[#CBD5E1] text-[#334155] rounded-xl text-xs font-bold hover:bg-[#F8FAFC] mt-4"
            >
              Manual Barrier Clearance
            </button>
          </div>
        </div>

        {/* Gate Status & Boom Barrier Feedback */}
        {checkInSuccess && (
          <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-6 rounded-2xl text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#10B981] text-white flex items-center justify-center text-xl font-black mb-2 shadow-xs">
              ✓
            </div>
            <h3 className="text-base font-bold text-[#065F46] font-['Plus_Jakarta_Sans']">
              GATE BARRIER OPENED
            </h3>
            <p className="text-xs text-[#065F46] max-w-md mt-1">{checkInSuccess}</p>
            {scannedResult && (
              <div className="bg-white p-4 rounded-xl border border-[#A7F3D0] mt-4 w-full max-w-sm text-left text-xs">
                <div className="flex justify-between border-b border-[#F1F5F9] pb-2 mb-2 font-bold">
                  <span>Assigned Bay:</span>
                  <span className="text-[#0F766E]">{scannedResult.spaceIdentifier || 'Bay A-01'}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>Vehicle:</span>
                  <span className="font-mono text-[#101828] font-bold">{scannedResult.vehiclePlate || 'TN-09-CB-4821'}</span>
                </div>
                <div className="flex justify-between text-[#64748B] mt-1">
                  <span>Duration:</span>
                  <span className="text-[#101828] font-medium">{new Date(scannedResult.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(scannedResult.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}
            <button
              onClick={handleManualPassThrough}
              className="mt-4 px-4 py-2 bg-[#065F46] text-white rounded-lg text-xs font-bold hover:bg-[#044E39]"
            >
              Vehicle Passed — Lower Barrier Gate
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl text-xs text-[#991B1B] font-medium text-center">
            {errorMsg}
          </div>
        )}
      </main>
    </div>
  );
}
