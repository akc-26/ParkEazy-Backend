-- Persistent customer extension requests with host-scoped review decisions.
CREATE TABLE IF NOT EXISTS booking_extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  requested_additional_hours NUMERIC(5,2) NOT NULL CHECK (requested_additional_hours > 0 AND requested_additional_hours <= 72),
  requested_ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by_host_id UUID REFERENCES users(id) ON DELETE SET NULL,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_extension_requests_host_queue
  ON booking_extension_requests (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_extension_requests_booking
  ON booking_extension_requests (booking_id, created_at DESC);
