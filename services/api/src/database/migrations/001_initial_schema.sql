-- =============================================================================
-- ParkEazy Database Migration 001: Initial Relational Schema
-- PostgreSQL 16+ compatible with safe conditional PostGIS support
-- =============================================================================

-- 1. Migration tracking table (if not exists)
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    checksum VARCHAR(64) NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    execution_time_ms INTEGER NOT NULL
);

-- 2. Attempt optional PostGIS extension safely without failing in restricted environments
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS postgis;
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'PostGIS extension skipped: insufficient privilege';
        WHEN undefined_file THEN
            RAISE NOTICE 'PostGIS extension skipped: extension files not installed on host';
        WHEN OTHERS THEN
            RAISE NOTICE 'PostGIS extension skipped: %', SQLERRM;
    END;
END $$;

-- 3. Multi-Tenant White-Label Configuration
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(128) NOT NULL,
    legal_name VARCHAR(255),
    tagline VARCHAR(255),
    primary_domain VARCHAR(255) UNIQUE,
    theme_tokens JSONB NOT NULL,
    assets JSONB NOT NULL,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. User Accounts & Credentials
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    password_hash VARCHAR(255),
    full_name VARCHAR(128),
    avatar_url VARCHAR(512),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email)
);

-- 5. Role Assignments (RBAC)
CREATE TABLE IF NOT EXISTS role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_tenant_role UNIQUE (user_id, tenant_id, role)
);

-- 6. Parking Facilities
CREATE TABLE IF NOT EXISTS parking_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    facility_code VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(16) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    entrance_instructions TEXT,
    gate_pin_code VARCHAR(16),
    is_covered BOOLEAN DEFAULT FALSE,
    is_24_7 BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) DEFAULT 'draft',
    amenities JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_tenant_facility_code UNIQUE (tenant_id, facility_code)
);

CREATE INDEX IF NOT EXISTS idx_facility_city ON parking_facilities (tenant_id, city);
CREATE INDEX IF NOT EXISTS idx_facility_coords ON parking_facilities (latitude, longitude);

-- Optional PostGIS point and GIST index
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'parking_facilities' AND column_name = 'geo_point'
        ) THEN
            ALTER TABLE parking_facilities ADD COLUMN geo_point GEOGRAPHY(Point, 4326);
            UPDATE parking_facilities SET geo_point = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE geo_point IS NULL;
            CREATE INDEX IF NOT EXISTS idx_facility_geo ON parking_facilities USING GIST (geo_point);
        END IF;
    END IF;
END $$;

-- 7. Parking Spaces (Bays)
CREATE TABLE IF NOT EXISTS parking_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    bay_identifier VARCHAR(32) NOT NULL,
    floor_level VARCHAR(32) DEFAULT 'Ground',
    vehicle_category VARCHAR(16) NOT NULL,
    has_ev_charger BOOLEAN DEFAULT FALSE,
    ev_charger_power_kw NUMERIC(4, 1),
    is_disabled_accessible BOOLEAN DEFAULT FALSE,
    hourly_rate_inr NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_facility_bay UNIQUE (facility_id, bay_identifier)
);

CREATE INDEX IF NOT EXISTS idx_space_facility ON parking_spaces (facility_id, is_active);

-- 8. Operating Schedules
CREATE TABLE IF NOT EXISTS operating_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID NOT NULL REFERENCES parking_facilities(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_facility_day UNIQUE (facility_id, day_of_week)
);

-- 9. Ephemeral Reservation Holds (Concurrency Lock)
-- Note on DEC-04: Hold expiration is dynamic (passed application-side without rigid DB check constraint)
CREATE TABLE IF NOT EXISTS reservation_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES parking_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_holds ON reservation_holds (space_id, expires_at) 
WHERE is_released = FALSE;

-- 10. Bookings (Core Transaction Entity)
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    booking_reference VARCHAR(32) UNIQUE NOT NULL,
    space_id UUID NOT NULL REFERENCES parking_spaces(id) ON DELETE RESTRICT,
    facility_id UUID NOT NULL REFERENCES parking_facilities(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    vehicle_plate VARCHAR(32) NOT NULL,
    vehicle_category VARCHAR(16) NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    actual_check_in_at TIMESTAMPTZ,
    actual_check_out_at TIMESTAMPTZ,
    base_amount_inr NUMERIC(10, 2) NOT NULL,
    platform_fee_inr NUMERIC(10, 2) NOT NULL,
    tax_inr NUMERIC(10, 2) NOT NULL,
    total_amount_inr NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) NOT NULL,
    qr_access_token VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_space_booking_times ON bookings (space_id, starts_at, ends_at) 
WHERE status IN ('confirmed', 'active');
