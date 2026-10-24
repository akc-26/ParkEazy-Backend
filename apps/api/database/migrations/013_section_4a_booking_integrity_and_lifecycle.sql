-- =============================================================================
-- ParkEazy Migration 013: Section 4A Booking Integrity, Durable Holds & Lifecycle
-- Enforces:
--  1. Columns on booking_holds for quote snapshot, lease duration, and release tracking
--  2. Columns on bookings for quote snapshot, commercial term locking, and lifecycle status
--  3. Lifecycle audit events and indexes for rapid concurrency checks
-- =============================================================================

-- 1. Ensure booking_holds columns exist
CREATE TABLE IF NOT EXISTS booking_holds (
    id VARCHAR(64) PRIMARY KEY,
    bay_id VARCHAR(64) NOT NULL,
    location_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    start_time_utc TIMESTAMPTZ NOT NULL,
    end_time_utc TIMESTAMPTZ NOT NULL,
    hold_expires_at_utc TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE booking_holds ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'default';
ALTER TABLE booking_holds ADD COLUMN IF NOT EXISTS host_id VARCHAR(64);
ALTER TABLE booking_holds ADD COLUMN IF NOT EXISTS is_released BOOLEAN DEFAULT FALSE;
ALTER TABLE booking_holds ADD COLUMN IF NOT EXISTS quote_snapshot TEXT;
ALTER TABLE booking_holds ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
ALTER TABLE booking_holds ADD COLUMN IF NOT EXISTS hold_duration_seconds INTEGER DEFAULT 600;
ALTER TABLE booking_holds ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_booking_holds_bay_active_window
    ON booking_holds (bay_id, hold_expires_at_utc, is_released);

-- 2. Ensure bookings columns exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'default';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_id VARCHAR(64);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(64);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quote_snapshot TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at_utc TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gate_access_code VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS access_instructions TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(128);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'SUCCEEDED';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS metadata TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_bay_window_status
    ON bookings (bay_id, start_time_utc, end_time_utc, status);
CREATE INDEX IF NOT EXISTS idx_bookings_idempotency_key
    ON bookings (idempotency_key);

-- 3. Ensure booking lifecycle events table exists for audit tracking
CREATE TABLE IF NOT EXISTS booking_lifecycle_events (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) DEFAULT 'default',
    event_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64),
    actor_role VARCHAR(32) DEFAULT 'customer',
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_booking_id
    ON booking_lifecycle_events (booking_id, created_at DESC);
