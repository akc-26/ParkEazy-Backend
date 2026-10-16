-- ============================================================================
-- ParkEazy Initial Schema Migration: 001_initial_schema.sql
-- Invariants Enforced:
--  1. Parking Locations and Physical Parking Bays are separate entities.
--  2. Booking holds have explicit 10-minute expiration timestamps.
--  3. Financial ledger is append-only (no updates/deletions permitted).
--  4. Explicit timezone stored for each parking location.
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50),
    roles TEXT[] NOT NULL DEFAULT '{"CUSTOMER"}',
    is_host_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parking_locations (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'US',
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Los_Angeles',
    access_method VARCHAR(50) NOT NULL DEFAULT 'OPEN_ACCESS',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    hourly_rate_cents INTEGER NOT NULL DEFAULT 500,
    daily_rate_cents INTEGER NOT NULL DEFAULT 3500,
    security_deposit_cents INTEGER NOT NULL DEFAULT 2000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parking_bays (
    id VARCHAR(64) PRIMARY KEY,
    location_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    bay_number VARCHAR(50) NOT NULL,
    bay_type VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
    level_or_floor VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    is_ev_charging BOOLEAN NOT NULL DEFAULT FALSE,
    has_cctv BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_location_bay UNIQUE (location_id, bay_number)
);

CREATE TABLE IF NOT EXISTS booking_holds (
    id VARCHAR(64) PRIMARY KEY,
    bay_id VARCHAR(64) NOT NULL REFERENCES parking_bays(id),
    location_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id),
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    start_time_utc TIMESTAMPTZ NOT NULL,
    end_time_utc TIMESTAMPTZ NOT NULL,
    hold_expires_at_utc TIMESTAMPTZ NOT NULL, -- Exactly 10 minutes from creation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_holds_expiration ON booking_holds(hold_expires_at_utc);

CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(64) PRIMARY KEY,
    bay_id VARCHAR(64) NOT NULL REFERENCES parking_bays(id),
    location_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id),
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    start_time_utc TIMESTAMPTZ NOT NULL,
    end_time_utc TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED',
    base_amount_cents INTEGER NOT NULL,
    security_deposit_cents INTEGER NOT NULL,
    platform_fee_cents INTEGER NOT NULL,
    taxes_cents INTEGER NOT NULL,
    total_payable_cents INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    license_plate VARCHAR(30),
    checked_in_at_utc TIMESTAMPTZ,
    checked_out_at_utc TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_ledger (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL,
    entry_type VARCHAR(50) NOT NULL,
    debit_account VARCHAR(50) NOT NULL,
    credit_account VARCHAR(50) NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    payment_provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(100),
    description TEXT NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    correlation_id VARCHAR(128) NOT NULL,
    actor_id VARCHAR(64),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(64),
    details JSONB,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
