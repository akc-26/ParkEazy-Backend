-- =============================================================================
-- ParkEazy Migration 012: Section 3C Pricing Rules and Real Availability Schema
-- Objective:
--  1. Ensure canonical pricing_rate_plans table exists with all standard columns
--  2. Support vehicle categories, bay overrides, duration boundaries, and effective date bounds
--  3. Safe repeated application idempotency
--  4. Backfill baseline rate plans from existing parking facilities
-- =============================================================================

CREATE TABLE IF NOT EXISTS pricing_rate_plans (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) DEFAULT 'default',
    host_id VARCHAR(64),
    bay_id VARCHAR(64),
    space_id VARCHAR(64),
    name VARCHAR(255) NOT NULL DEFAULT 'Standard Rate Plan',
    hourly_rate_cents INTEGER NOT NULL DEFAULT 500,
    daily_rate_cents INTEGER NOT NULL DEFAULT 3500,
    min_billable_minutes INTEGER NOT NULL DEFAULT 60,
    min_booking_minutes INTEGER NOT NULL DEFAULT 60,
    max_booking_minutes INTEGER NOT NULL DEFAULT 4320,
    step_minutes INTEGER NOT NULL DEFAULT 30,
    vehicle_category VARCHAR(50) NOT NULL DEFAULT 'ALL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until_utc TIMESTAMPTZ,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist on pricing_rate_plans
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS facility_id VARCHAR(64);
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'default';
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS host_id VARCHAR(64);
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS bay_id VARCHAR(64);
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS space_id VARCHAR(64);
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS name VARCHAR(255) DEFAULT 'Standard Rate Plan';
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS hourly_rate_cents INTEGER DEFAULT 500;
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS daily_rate_cents INTEGER DEFAULT 3500;
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS min_billable_minutes INTEGER DEFAULT 60;
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS min_booking_minutes INTEGER DEFAULT 60;
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS max_booking_minutes INTEGER DEFAULT 4320;
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS step_minutes INTEGER DEFAULT 30;
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(50) DEFAULT 'ALL';
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS effective_from_utc TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS effective_until_utc TIMESTAMPTZ;
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS created_at_utc TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE pricing_rate_plans ADD COLUMN IF NOT EXISTS updated_at_utc TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_pricing_rate_plans_fac_active ON pricing_rate_plans(facility_id, is_active, effective_from_utc);
CREATE INDEX IF NOT EXISTS idx_pricing_rate_plans_host ON pricing_rate_plans(host_id);
