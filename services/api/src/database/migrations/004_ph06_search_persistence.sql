-- PH06: Persist fields used by the search and inventory domain models.
-- Safe for databases where some columns were added manually during earlier development.
ALTER TABLE parking_facilities
  ADD COLUMN IF NOT EXISTS operating_model VARCHAR(64) DEFAULT 'commercial_garage';

ALTER TABLE parking_spaces
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) NOT NULL DEFAULT 'available';

CREATE INDEX IF NOT EXISTS idx_parking_spaces_vehicle_status_search
  ON parking_spaces (tenant_id, facility_id, vehicle_category, is_active, status);

CREATE INDEX IF NOT EXISTS idx_bookings_active_space_window
  ON bookings (space_id, starts_at, ends_at)
  WHERE status IN ('confirmed', 'active');
