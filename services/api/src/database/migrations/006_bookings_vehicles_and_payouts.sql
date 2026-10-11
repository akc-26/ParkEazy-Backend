-- =============================================================================
-- ParkEazy Database Migration 006: User Vehicles, Favorites, Payments & Payouts
-- Safe to apply; preserves all existing tables and constraints.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plate_number VARCHAR(32) NOT NULL,
    vehicle_category VARCHAR(16) NOT NULL DEFAULT 'car',
    make VARCHAR(64),
    model VARCHAR(64),
    color VARCHAR(32),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vehicles_user_tenant
    ON user_vehicles (user_id, tenant_id);

CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_favorite UNIQUE (user_id, facility_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user
    ON user_favorites (user_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL DEFAULT 'razorpay',
    provider_order_id VARCHAR(128) NOT NULL,
    provider_payment_id VARCHAR(128),
    amount_inr NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    method VARCHAR(32) DEFAULT 'upi',
    status VARCHAR(32) NOT NULL DEFAULT 'captured',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_booking
    ON payment_transactions (booking_id);

CREATE TABLE IF NOT EXISTS payout_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    settlement_reference VARCHAR(64) NOT NULL UNIQUE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    gross_earnings_inr NUMERIC(10, 2) NOT NULL,
    platform_commission_inr NUMERIC(10, 2) NOT NULL,
    net_payout_inr NUMERIC(10, 2) NOT NULL,
    utr_number VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    disbursed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payout_settlements_host_tenant
    ON payout_settlements (host_id, tenant_id);
