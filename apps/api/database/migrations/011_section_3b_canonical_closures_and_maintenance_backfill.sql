-- =============================================================================
-- ParkEazy Migration 011: Canonical Schema Reconciliation & Safe Legacy Backfill
-- Objective:
--  1. Standardize canonical columns on facility_closures (starts_at, ends_at, space_id, bay_id, host_id)
--  2. Standardize canonical columns on facility_maintenance_periods (starts_at, ends_at, space_id, bay_id)
--  3. Preserve all existing records; backfill non-null values deterministically
--  4. Never overwrite non-null canonical values with legacy data
--  5. Standardize default facility timezone to 'Asia/Kolkata'
--  6. Maintain repeat-application idempotence without dropping populated columns
-- =============================================================================

-- 1. Ensure facility_closures table exists with all canonical & legacy columns
CREATE TABLE IF NOT EXISTS facility_closures (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) DEFAULT 'default',
    host_id VARCHAR(64),
    space_id VARCHAR(64),
    bay_id VARCHAR(64),
    title VARCHAR(255) NOT NULL DEFAULT 'Scheduled Facility Closure',
    reason VARCHAR(255) NOT NULL DEFAULT 'maintenance',
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

-- Ensure all columns exist on facility_closures
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

-- 2. Deterministic, safe backfill for facility_closures:
-- Rule: Do NOT overwrite non-null canonical columns (starts_at, ends_at)
UPDATE facility_closures
SET starts_at = COALESCE(start_time_utc, start_date)
WHERE starts_at IS NULL AND COALESCE(start_time_utc, start_date) IS NOT NULL;

UPDATE facility_closures
SET ends_at = COALESCE(end_time_utc, end_date)
WHERE ends_at IS NULL AND COALESCE(end_time_utc, end_date) IS NOT NULL;

-- Keep bidirectional compatibility columns synced for older queries
UPDATE facility_closures
SET start_time_utc = starts_at
WHERE start_time_utc IS NULL AND starts_at IS NOT NULL;

UPDATE facility_closures
SET end_time_utc = ends_at
WHERE end_time_utc IS NULL AND ends_at IS NOT NULL;

UPDATE facility_closures
SET start_date = starts_at
WHERE start_date IS NULL AND starts_at IS NOT NULL;

UPDATE facility_closures
SET end_date = ends_at
WHERE end_date IS NULL AND ends_at IS NOT NULL;

-- Backfill space_id / bay_id bidirectional aliases
UPDATE facility_closures
SET space_id = bay_id
WHERE space_id IS NULL AND bay_id IS NOT NULL;

UPDATE facility_closures
SET bay_id = space_id
WHERE bay_id IS NULL AND space_id IS NOT NULL;

UPDATE facility_closures
SET space_id = affected_bay_ids[1], bay_id = affected_bay_ids[1]
WHERE space_id IS NULL AND affected_bay_ids IS NOT NULL AND affected_bay_ids[1] IS NOT NULL;

-- host_id backfill is intentionally omitted from this portable migration.
-- The pg-mem development adapter does not implement PostgreSQL UPDATE ... FROM
-- reliably. Existing host_id values are preserved; the application can resolve
-- ownership through parking_locations when reading these legacy records.

-- Backfill missing tenant_id
UPDATE facility_closures
SET tenant_id = 'default'
WHERE tenant_id IS NULL;

-- 3. Ensure facility_maintenance_periods table exists
CREATE TABLE IF NOT EXISTS facility_maintenance_periods (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) DEFAULT 'default',
    host_id VARCHAR(64),
    space_id VARCHAR(64),
    bay_id VARCHAR(64),
    title VARCHAR(255) NOT NULL DEFAULT 'Scheduled Maintenance',
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

-- Ensure all columns exist on facility_maintenance_periods
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

-- 4. Deterministic backfill for facility_maintenance_periods
UPDATE facility_maintenance_periods
SET starts_at = COALESCE(start_time_utc, start_time)
WHERE starts_at IS NULL AND COALESCE(start_time_utc, start_time) IS NOT NULL;

UPDATE facility_maintenance_periods
SET ends_at = COALESCE(end_time_utc, end_time)
WHERE ends_at IS NULL AND COALESCE(end_time_utc, end_time) IS NOT NULL;

UPDATE facility_maintenance_periods
SET start_time_utc = starts_at
WHERE start_time_utc IS NULL AND starts_at IS NOT NULL;

UPDATE facility_maintenance_periods
SET end_time_utc = ends_at
WHERE end_time_utc IS NULL AND ends_at IS NOT NULL;

UPDATE facility_maintenance_periods
SET start_time = starts_at
WHERE start_time IS NULL AND starts_at IS NOT NULL;

UPDATE facility_maintenance_periods
SET end_time = ends_at
WHERE end_time IS NULL AND ends_at IS NOT NULL;

UPDATE facility_maintenance_periods
SET space_id = bay_id
WHERE space_id IS NULL AND bay_id IS NOT NULL;

UPDATE facility_maintenance_periods
SET bay_id = space_id
WHERE bay_id IS NULL AND space_id IS NOT NULL;

-- host_id backfill is intentionally omitted for pg-mem portability; existing
-- host_id values remain untouched and ownership can be resolved by facility_id.

UPDATE facility_maintenance_periods
SET tenant_id = 'default'
WHERE tenant_id IS NULL;

-- 5. Legacy maintenance_blocks backfill is not run from this migration because
-- pg-mem does not support the procedural DO block used for table-existence
-- checks. Keep legacy data intact; perform that backfill in a PostgreSQL-only
-- deployment migration after confirming the source table schema.

-- 6. Standardize timezone column default on parking_locations
ALTER TABLE parking_locations
  ALTER COLUMN timezone SET DEFAULT 'Asia/Kolkata';

UPDATE parking_locations
SET timezone = 'Asia/Kolkata'
WHERE timezone IS NULL OR timezone = '' OR timezone = 'UTC';

-- 7. Optimized query indexes
CREATE INDEX IF NOT EXISTS idx_fc_canonical_lookup
  ON facility_closures (facility_id, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_fmp_canonical_lookup
  ON facility_maintenance_periods (facility_id, starts_at, ends_at);
