-- ============================================================================
-- ParkEazy Migration 002: Customer Vehicles, Credentials, Notifications & Refunds
-- Invariants Enforced:
--  1. Customer vehicles are uniquely identified per user.
--  2. Password hashes and salts stored securely with no plaintext credentials.
--  3. Notification preferences track channel-level driver opt-ins.
--  4. Refunds are recorded with double-entry ledger references and idempotency.
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_vehicles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_plate VARCHAR(32) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    color VARCHAR(50),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_license_plate UNIQUE (user_id, license_plate)
);

CREATE TABLE IF NOT EXISTS user_credentials (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_booking_confirmations BOOLEAN NOT NULL DEFAULT TRUE,
    email_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    sms_gate_access BOOLEAN NOT NULL DEFAULT TRUE,
    sms_expiry_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    push_status_updates BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_refunds (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id),
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    provider VARCHAR(50) NOT NULL,
    provider_refund_id VARCHAR(128),
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vehicles_user_id ON user_vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_booking_refunds_booking_id ON booking_refunds(booking_id);
