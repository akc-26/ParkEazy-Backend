-- ParkEazy Database Migration 003: Search & Discovery Optimization Indexes (PH06)

-- 1. Composite index for multi-tenant active facility status and geographical lookup
CREATE INDEX IF NOT EXISTS idx_parking_facilities_search 
  ON parking_facilities(tenant_id, status, city);

-- 2. Index for coordinates to accelerate Haversine distance and bounding box calculations
CREATE INDEX IF NOT EXISTS idx_parking_facilities_geo 
  ON parking_facilities(latitude, longitude);

-- 3. Composite index on parking spaces for vehicle category and status filtering
CREATE INDEX IF NOT EXISTS idx_parking_spaces_vehicle_search 
  ON parking_spaces(facility_id, vehicle_category, is_active, status);

-- 4. Index on hourly rate for price range filtering
CREATE INDEX IF NOT EXISTS idx_parking_spaces_rate 
  ON parking_spaces(hourly_rate_inr);
