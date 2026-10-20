-- ParkEazy Migration 008: Booking concurrency and lifecycle integrity.
-- Existing booking writes serialize on the parking_spaces row (SELECT ... FOR UPDATE).
-- These indexes support overlap checks without relying on process-local locks.
CREATE INDEX IF NOT EXISTS idx_bookings_space_active_window
  ON bookings (space_id, starts_at, ends_at)
  WHERE status IN ('confirmed', 'active');

CREATE INDEX IF NOT EXISTS idx_reservation_holds_space_active_window
  ON reservation_holds (space_id, starts_at, ends_at, expires_at)
  WHERE is_released = FALSE;

CREATE INDEX IF NOT EXISTS idx_bookings_customer_recent
  ON bookings (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking_status
  ON payment_transactions (booking_id, status);

-- Do not impose a rigid overlap exclusion constraint here: turnaround-buffer
-- semantics are enforced in the same transaction that locks each space row.
-- This preserves the existing schema and supports the configured 15-minute buffer.
