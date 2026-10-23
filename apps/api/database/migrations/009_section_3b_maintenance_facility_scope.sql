-- =============================================================================
-- ParkEazy Migration 009: Section 3B Facility-Level Maintenance Scope
-- Allows maintenance_blocks to be scoped to either an individual bay or the entire facility.
-- =============================================================================

ALTER TABLE maintenance_blocks
  ALTER COLUMN space_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_blocks_facility
  ON maintenance_blocks(facility_id, start_time_utc, end_time_utc);
