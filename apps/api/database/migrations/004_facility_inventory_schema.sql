-- ============================================================================
-- ParkEazy Migration 004: Host Facility & Parking-Space Inventory Schema
-- Invariants Enforced:
--  1. Facilities (parking_locations) support property types, instructions, and media.
--  2. Physical parking spaces (parking_bays) enforce vehicle clearance, dimensions,
--     accessible flags, and space-specific access instructions.
--  3. Publication status and timestamp tracking for marketplace discovery.
-- ============================================================================

ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS property_type VARCHAR(50) DEFAULT 'GARAGE';
ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS access_instructions TEXT;
ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';
ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS published_at_utc TIMESTAMPTZ;

ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS max_vehicle_height_meters NUMERIC(4, 2);
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS max_vehicle_length_meters NUMERIC(4, 2);
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS max_vehicle_width_meters NUMERIC(4, 2);
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS supported_vehicles TEXT[] DEFAULT '{"SEDAN","SUV","COMPACT"}';
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS ev_charger_kw NUMERIC(5, 2);
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS is_accessible BOOLEAN DEFAULT FALSE;
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS is_covered BOOLEAN DEFAULT FALSE;
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS instructions TEXT;

CREATE INDEX IF NOT EXISTS idx_parking_locations_host_id ON parking_locations(host_id);
CREATE INDEX IF NOT EXISTS idx_parking_locations_status ON parking_locations(status);
CREATE INDEX IF NOT EXISTS idx_parking_bays_location_id ON parking_bays(location_id);
