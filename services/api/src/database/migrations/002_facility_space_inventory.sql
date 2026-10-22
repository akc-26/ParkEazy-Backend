-- ParkEazy Database Migration 002: Facility & Space Inventory Extensions (PH05)

-- 1. Extend parking_facilities table with physical access & entrance metadata
ALTER TABLE parking_facilities
  ADD COLUMN IF NOT EXISTS ingress_type VARCHAR(64) DEFAULT 'two_way_ramp',
  ADD COLUMN IF NOT EXISTS property_owner VARCHAR(255),
  ADD COLUMN IF NOT EXISTS landmark VARCHAR(255),
  ADD COLUMN IF NOT EXISTS max_height_clearance_meters NUMERIC(4, 2) DEFAULT 2.10,
  ADD COLUMN IF NOT EXISTS access_hotline VARCHAR(32),
  ADD COLUMN IF NOT EXISTS turn_by_turn_directions TEXT,
  ADD COLUMN IF NOT EXISTS pedestrian_access_instructions TEXT,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- 2. Extend parking_spaces table with physical dimensional attributes & amenities
ALTER TABLE parking_spaces
  ADD COLUMN IF NOT EXISTS classification VARCHAR(64) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS stall_position VARCHAR(64) DEFAULT 'single_independent',
  ADD COLUMN IF NOT EXISTS maneuverability_angle VARCHAR(64) DEFAULT '90_perpendicular',
  ADD COLUMN IF NOT EXISTS surface_flooring VARCHAR(64) DEFAULT 'epoxy_coated',
  ADD COLUMN IF NOT EXISTS sensor_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS max_length_meters NUMERIC(4, 2) DEFAULT 5.40,
  ADD COLUMN IF NOT EXISTS max_width_meters NUMERIC(4, 2) DEFAULT 2.50,
  ADD COLUMN IF NOT EXISTS max_height_meters NUMERIC(4, 2) DEFAULT 2.40,
  ADD COLUMN IF NOT EXISTS max_weight_tonnes NUMERIC(4, 2) DEFAULT 3.50,
  ADD COLUMN IF NOT EXISTS allowed_vehicle_categories JSONB DEFAULT '["car"]'::jsonb,
  ADD COLUMN IF NOT EXISTS fuel_compatibility JSONB DEFAULT '["petrol", "diesel", "electric"]'::jsonb,
  ADD COLUMN IF NOT EXISTS ev_plug_type VARCHAR(128) DEFAULT 'Type 2 AC (7.4kW - 22kW)',
  ADD COLUMN IF NOT EXISTS access_method VARCHAR(64) DEFAULT 'anpr_barrier',
  ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '["covered_roof", "cctv_security"]'::jsonb,
  ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- 3. Indexes for spatial and dimensional queries
CREATE INDEX IF NOT EXISTS idx_parking_spaces_classification ON parking_spaces(classification);
CREATE INDEX IF NOT EXISTS idx_parking_spaces_ev ON parking_spaces(has_ev_charger);
CREATE INDEX IF NOT EXISTS idx_parking_facilities_status ON parking_facilities(status);
