-- =============================================================================
-- ParkEazy Database Migration 007: Booking Lifecycle, Safeguards & Overstay
-- Forward-only schema additions for Part 07 booking lifecycle management.
-- Safe to apply; preserves all existing tables and constraints.
-- =============================================================================

-- 1. Booking Lifecycle Audit Events
CREATE TABLE IF NOT EXISTS booking_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    actor_id UUID,
    actor_role VARCHAR(32) NOT NULL DEFAULT 'customer',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_booking
    ON booking_lifecycle_events (booking_id, created_at DESC);

-- 2. Booking Extensions Ledger
CREATE TABLE IF NOT EXISTS booking_extensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    previous_ends_at TIMESTAMPTZ NOT NULL,
    new_ends_at TIMESTAMPTZ NOT NULL,
    additional_hours NUMERIC(5, 2) NOT NULL,
    additional_amount_inr NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extensions_booking
    ON booking_extensions (booking_id);

-- 3. Booking Overstays & Penalty Tracker
CREATE TABLE IF NOT EXISTS booking_overstays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    scheduled_ends_at TIMESTAMPTZ NOT NULL,
    actual_departure_at TIMESTAMPTZ,
    overstay_minutes INT NOT NULL DEFAULT 0,
    grace_period_minutes INT NOT NULL DEFAULT 15,
    penalty_rate_per_hour_inr NUMERIC(10, 2) NOT NULL DEFAULT 80.00,
    total_penalty_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_overstays_booking
    ON booking_overstays (booking_id);

-- 4. Booking Dispute & Support Tickets
CREATE TABLE IF NOT EXISTS booking_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_booking
    ON booking_support_tickets (booking_id);
