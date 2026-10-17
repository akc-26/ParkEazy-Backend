import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { ParkingLocation, ParkingBay, BookingHold } from '../../../packages/contracts';
import { Modal, Button } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';

interface HoldReservationModalProps {
  location: ParkingLocation | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export const HoldReservationModal: React.FC<HoldReservationModalProps> = ({
  location,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [bays, setBays] = useState<ParkingBay[]>([]);
  const [selectedBayId, setSelectedBayId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState(120); // 2 hours
  const [activeHold, setActiveHold] = useState<BookingHold | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(600);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load bays whenever a location is selected
  useEffect(() => {
    if (location && isOpen) {
      setActiveHold(null);
      setErrorMsg(null);
      apiClient
        .getBays(location.id)
        .then((fetchedBays) => {
          setBays(fetchedBays);
          if (fetchedBays.length > 0) {
            setSelectedBayId(fetchedBays[0].id);
          }
        })
        .catch((err) => {
          setErrorMsg(err.message || 'Unable to retrieve bay availability');
        });
    }
  }, [location, isOpen]);

  // Hold Countdown Timer (Persistent 10 minutes)
  useEffect(() => {
    if (!activeHold) return;

    const interval = setInterval(() => {
      const expiresAt = new Date(activeHold.holdExpiresAtUtc).getTime();
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        clearInterval(interval);
        setActiveHold(null);
        setErrorMsg('Booking hold expired after 10 minutes. Please re-initiate.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold]);

  if (!location) return null;

  const handleCreateHold = async () => {
    if (!selectedBayId) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const hold = await apiClient.createHold({
        bayId: selectedBayId,
        locationId: location.id,
        durationMinutes,
      });
      setActiveHold(hold);
      setRemainingSeconds(600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to establish bay hold.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedBay = bays.find((b) => b.id === selectedBayId);
  const hourlyRate = location.hourlyRateCents / 100;
  const basePrice = (hourlyRate * (durationMinutes / 60)).toFixed(2);
  const deposit = (location.securityDepositCents / 100).toFixed(2);
  const platformFee = (Number(basePrice) * 0.15).toFixed(2);
  const total = (Number(basePrice) + Number(deposit) + Number(platformFee)).toFixed(2);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeHold ? 'Bay Hold Active (10-Minute Lock)' : 'Reserve Parking Space'}
      description={`Location: ${location.name} (${location.timezone})`}
      maxWidth="lg"
    >
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeHold ? (
        <div className="space-y-4">
          {/* Active Hold Banner with Live Countdown */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-900">
                  Bay Exclusively Reserved For You
                </div>
                <div className="text-[11px] text-emerald-700">
                  Bay {selectedBay?.bayNumber} is temporarily locked on the server.
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] uppercase tracking-wider text-emerald-800 font-semibold">
                Time Remaining
              </div>
              <div className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
                {formatSeconds(remainingSeconds)}
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Hold ID:</span>
              <span className="font-mono text-slate-900">{activeHold.holdId}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Selected Bay:</span>
              <span className="font-medium text-slate-900">{selectedBay?.bayNumber} ({selectedBay?.bayType})</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Booking Duration:</span>
              <span className="font-medium text-slate-900">{durationMinutes / 60} Hours (30-min precision)</span>
            </div>
            <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-200">
              <span>Segregated Security Deposit:</span>
              <span className="font-mono font-medium text-slate-900">${deposit}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold text-sm pt-1">
              <span>Total Payable at Checkout:</span>
              <span className="font-mono">${total}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Dismiss
            </Button>
            <Button
              variant="primary"
              size="sm"
              themeContext="user"
              onClick={() => {
                onClose();
                if (onNavigate) {
                  onNavigate(
                    `/booking/review?holdId=${activeHold.holdId}&bayId=${activeHold.bayId}&locationId=${activeHold.locationId}`
                  );
                }
              }}
            >
              Continue to Review (${total})
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bay Selection (Demonstrates Location vs Bay entity separation) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Specific Physical Bay
            </label>
            <div className="grid grid-cols-2 gap-2">
              {bays.map((bay) => {
                const isAvail = bay.status === 'AVAILABLE';
                return (
                  <button
                    key={bay.id}
                    type="button"
                    disabled={!isAvail}
                    onClick={() => setSelectedBayId(bay.id)}
                    className={`p-3 text-left border rounded-lg transition-all flex flex-col justify-between ${
                      selectedBayId === bay.id && isAvail
                        ? 'border-[#087E8A] bg-teal-50/40 ring-1 ring-[#087E8A]'
                        : isAvail
                        ? 'border-slate-200 hover:border-slate-300 bg-white'
                        : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 flex items-center justify-between">
                        <span>Bay {bay.bayNumber}</span>
                        {!isAvail && (
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-normal">
                            {bay.status}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {bay.bayType} {bay.levelOrFloor ? `· ${bay.levelOrFloor}` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Duration
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#087E8A]"
            >
              <option value={60}>1.0 Hour</option>
              <option value={90}>1.5 Hours</option>
              <option value={120}>2.0 Hours</option>
              <option value={180}>3.0 Hours</option>
              <option value={240}>4.0 Hours</option>
              <option value={480}>8.0 Hours</option>
              <option value={1440}>24.0 Hours (1 Day)</option>
              <option value={2880}>48.0 Hours (2 Days)</option>
              <option value={4320}>72.0 Hours (Continuous Maximum)</option>
            </select>
          </div>

          {/* Pricing Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Parking Fee ({durationMinutes / 60}h @ ${hourlyRate}/h):</span>
              <span className="font-mono tabular-nums text-slate-900">${basePrice}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Platform Fee:</span>
              <span className="font-mono tabular-nums text-slate-900">${platformFee}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Refundable Security Deposit (Escrowed):</span>
              <span className="font-mono tabular-nums text-slate-900">${deposit}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-200">
              <span>Estimated Total:</span>
              <span className="font-mono tabular-nums">${total}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-normal flex items-start gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Clicking below issues an authoritative 10-minute hold on the server to prevent race conditions while you checkout.
            </span>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              themeContext="user"
              isLoading={isLoading}
              onClick={handleCreateHold}
            >
              Lock 10-Minute Hold
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
