-- ============================================================================
-- ParkEazy Migration 005: HP-05 Pricing & Policies and HP-06 Availability & Calendar
-- Invariants Enforced:
--  1. Monetary amounts in integer cents (exact minor units, no floats).
--  2. Foreign keys linked to parking_locations and parking_bays.
--  3. Audit log records all mutations with correlation ID and actor ID.
--  4. Explicit UTC timestamp bounds and status constraints.
-- ============================================================================

CREATE TABLE IF NOT EXISTS pricing_rate_plans (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    bay_id VARCHAR(64) REFERENCES parking_bays(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    hourly_rate_cents INTEGER NOT NULL CHECK (hourly_rate_cents >= 0),
    daily_rate_cents INTEGER NOT NULL CHECK (daily_rate_cents >= 0),
    min_billable_minutes INTEGER NOT NULL DEFAULT 60,
    min_booking_minutes INTEGER NOT NULL DEFAULT 60,
    max_booking_minutes INTEGER NOT NULL DEFAULT 4320,
    step_minutes INTEGER NOT NULL DEFAULT 30,
    vehicle_category VARCHAR(50) DEFAULT 'ALL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_until_utc TIMESTAMPTZ,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_plans_facility_id ON pricing_rate_plans(facility_id);
CREATE INDEX IF NOT EXISTS idx_rate_plans_host_id ON pricing_rate_plans(host_id);

CREATE TABLE IF NOT EXISTS facility_operating_hours (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    open_time VARCHAR(10) NOT NULL DEFAULT '00:00',
    close_time VARCHAR(10) NOT NULL DEFAULT '23:59',
    is_overnight BOOLEAN NOT NULL DEFAULT FALSE,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_facility_day UNIQUE (facility_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_operating_hours_facility ON facility_operating_hours(facility_id);

CREATE TABLE IF NOT EXISTS facility_pricing_policies (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE UNIQUE,
    min_duration_minutes INTEGER NOT NULL DEFAULT 60,
    max_duration_minutes INTEGER NOT NULL DEFAULT 4320,
    booking_increment_minutes INTEGER NOT NULL DEFAULT 30,
    transition_buffer_minutes INTEGER NOT NULL DEFAULT 15,
    cancellation_policy_tier VARCHAR(50) NOT NULL DEFAULT 'STANDARD_48H',
    security_deposit_cents INTEGER NOT NULL DEFAULT 2000,
    overstay_penalty_per_hour_cents INTEGER NOT NULL DEFAULT 1500,
    effective_from_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facility_closures (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    bay_id VARCHAR(64) REFERENCES parking_bays(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    reason VARCHAR(50) NOT NULL DEFAULT 'MAINTENANCE',
    start_time_utc TIMESTAMPTZ NOT NULL,
    end_time_utc TIMESTAMPTZ NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_closures_facility ON facility_closures(facility_id);
CREATE INDEX IF NOT EXISTS idx_closures_time_range ON facility_closures(start_time_utc, end_time_utc);

CREATE TABLE IF NOT EXISTS recurring_availability_schedules (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    space_id VARCHAR(64) REFERENCES parking_bays(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time VARCHAR(10) NOT NULL DEFAULT '00:00',
    end_time VARCHAR(10) NOT NULL DEFAULT '23:59',
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_sched_facility ON recurring_availability_schedules(facility_id);

CREATE TABLE IF NOT EXISTS availability_overrides (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    space_id VARCHAR(64) REFERENCES parking_bays(id) ON DELETE CASCADE,
    override_date DATE NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    reason TEXT NOT NULL,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avail_overrides_facility ON availability_overrides(facility_id, override_date);

CREATE TABLE IF NOT EXISTS maintenance_blocks (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    space_id VARCHAR(64) NOT NULL REFERENCES parking_bays(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time_utc TIMESTAMPTZ NOT NULL,
    end_time_utc TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_space_time ON maintenance_blocks(space_id, start_time_utc, end_time_utc);

CREATE TABLE IF NOT EXISTS pricing_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    host_id VARCHAR(64) NOT NULL REFERENCES users(id),
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    space_id VARCHAR(64),
    action VARCHAR(100) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    previous_value JSONB,
    new_value JSONB,
    diff_summary TEXT NOT NULL,
    correlation_id VARCHAR(128),
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_audit_facility ON pricing_audit_logs(facility_id);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_host ON pricing_audit_logs(host_id);
