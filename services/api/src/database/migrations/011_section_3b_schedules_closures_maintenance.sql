-- =============================================================================
-- ParkEazy Database Migration 011: Section 3B Operating Hours, Closures & Maintenance
-- Forward-only schema additions for facility operating schedules, date closures,
-- and maintenance management. Preserves all existing tables and data.
-- =============================================================================

-- 1. Add timezone column to parking_facilities if not already present
ALTER TABLE parking_facilities
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Kolkata';

-- 2. Extend operating_schedules with overnight indicator and tenant isolation
ALTER TABLE operating_schedules
  ADD COLUMN IF NOT EXISTS is_overnight BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_operating_schedules_tenant
  ON operating_schedules (tenant_id);

-- 3. Date-Specific Facility Closures (Blackouts / Holidays / Events / Facility-wide blocks)
CREATE TABLE IF NOT EXISTS facility_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    space_id UUID REFERENCES parking_spaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    reason VARCHAR(64) NOT NULL DEFAULT 'maintenance',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_closure_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_facility_closures_facility_tenant
    ON facility_closures (facility_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_facility_closures_window
    ON facility_closures (starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_facility_closures_space
    ON facility_closures (space_id);

-- 4. Facility and Space Maintenance Periods (Facility-level or Individual Bay)
CREATE TABLE IF NOT EXISTS facility_maintenance_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    space_id UUID REFERENCES parking_spaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_maintenance_time_order CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_facility_maintenance_facility
    ON facility_maintenance_periods (facility_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_facility_maintenance_space
    ON facility_maintenance_periods (space_id);

CREATE INDEX IF NOT EXISTS idx_facility_maintenance_window
    ON facility_maintenance_periods (starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_facility_maintenance_status
    ON facility_maintenance_periods (status);
