-- ============================================================================
-- ParkEazy Migration 006: Host Operations, Extension Requests, Payouts & Workflows
-- Invariants Enforced:
--  1. Extension requests link booking, facility, host, and customer with explicit status.
--  2. Payout records maintain financial audit trails and connect to host payout methods.
--  3. Reviews, notifications, and operational disputes persist with relational integrity.
-- ============================================================================

CREATE TABLE IF NOT EXISTS booking_extension_requests (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    customer_id VARCHAR(64) NOT NULL REFERENCES users(id),
    requested_additional_hours NUMERIC(4, 2) NOT NULL DEFAULT 1,
    additional_price_cents INTEGER NOT NULL DEFAULT 0,
    platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    requested_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decision_at_utc TIMESTAMPTZ,
    decision_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_ext_req_facility ON booking_extension_requests(facility_id);
CREATE INDEX IF NOT EXISTS idx_ext_req_booking ON booking_extension_requests(booking_id);
CREATE INDEX IF NOT EXISTS idx_ext_req_status ON booking_extension_requests(status);

CREATE TABLE IF NOT EXISTS host_payout_methods (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payout_type VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER',
    beneficiary_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    routing_number VARCHAR(100),
    account_number_masked VARCHAR(50) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_methods_host ON host_payout_methods(host_id);

CREATE TABLE IF NOT EXISTS host_payout_records (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) REFERENCES parking_locations(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    payout_method_id VARCHAR(64) REFERENCES host_payout_methods(id),
    reference_or_utr VARCHAR(100),
    requested_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settled_at_utc TIMESTAMPTZ,
    failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_payout_records_host ON host_payout_records(host_id);

CREATE TABLE IF NOT EXISTS customer_reviews (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    host_reply TEXT,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_facility ON customer_reviews(facility_id);

CREATE TABLE IF NOT EXISTS host_notifications (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255),
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_host ON host_notifications(host_id, is_read);

CREATE TABLE IF NOT EXISTS support_disputes (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) REFERENCES bookings(id) ON DELETE SET NULL,
    facility_id VARCHAR(64) REFERENCES parking_locations(id) ON DELETE SET NULL,
    raised_by_user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    resolution_notes TEXT,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at_utc TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_facility ON support_disputes(facility_id);
