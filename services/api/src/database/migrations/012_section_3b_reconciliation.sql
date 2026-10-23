-- =============================================================================
-- ParkEazy Migration 012: Section 3B Unified Schemas for Schedules, Closures & Maintenance
-- Forward-compatible schema alignment reconciling NestJS and Express models,
-- column aliases, and tenant isolation without modifying or dropping existing tables.
-- =============================================================================

-- 1. Ensure facility_closures exists with all unified columns
CREATE TABLE IF NOT EXISTS facility_closures (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) DEFAULT 'default',
    host_id VARCHAR(64),
    space_id VARCHAR(64),
    bay_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    start_time_utc TIMESTAMPTZ,
    end_time_utc TIMESTAMPTZ,
    affected_bay_ids TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconcile columns on facility_closures if table already exists
ALTER TABLE facility_closures ALTER COLUMN host_id DROP NOT NULL;
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'default';
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS host_id VARCHAR(64);
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS space_id VARCHAR(64);
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS bay_id VARCHAR(64);
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Scheduled Facility Closure';
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS reason VARCHAR(255) DEFAULT 'maintenance';
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS start_time_utc TIMESTAMPTZ;
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS end_time_utc TIMESTAMPTZ;
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS affected_bay_ids TEXT[];
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE facility_closures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_facility_closures_facility_tenant
    ON facility_closures (facility_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_facility_closures_window
    ON facility_closures (starts_at, ends_at);

-- 2. Ensure facility_maintenance_periods exists with all unified columns
CREATE TABLE IF NOT EXISTS facility_maintenance_periods (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) DEFAULT 'default',
    host_id VARCHAR(64),
    space_id VARCHAR(64),
    bay_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    start_time_utc TIMESTAMPTZ,
    end_time_utc TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconcile columns on facility_maintenance_periods if table already exists
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(64) DEFAULT 'default';
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS host_id VARCHAR(64);
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS space_id VARCHAR(64);
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS bay_id VARCHAR(64);
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS title VARCHAR(255) DEFAULT 'Scheduled Maintenance';
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'scheduled';
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS start_time_utc TIMESTAMPTZ;
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS end_time_utc TIMESTAMPTZ;
ALTER TABLE facility_maintenance_periods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_facility_maint_facility_tenant
    ON facility_maintenance_periods (facility_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_facility_maint_window
    ON facility_maintenance_periods (starts_at, ends_at);

-- 3. Ensure parking_facilities has timezone column
ALTER TABLE parking_facilities ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) DEFAULT 'Asia/Kolkata';

-- 4. Ensure operating schedules have is_overnight column
ALTER TABLE operating_schedules ADD COLUMN IF NOT EXISTS is_overnight BOOLEAN DEFAULT FALSE;
