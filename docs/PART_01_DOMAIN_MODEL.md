# ParkEazy — Part 01: Proposed Domain Model & Data Architecture

> **Status**: PROPOSED CONCEPTUAL ARCHITECTURAL SPECIFICATION (Part 01)  
> **Target Database Engine**: PostgreSQL 16+ with PostGIS Geospatial Extension (Planned for Part 03)  
> **Implementation Boundary**: This is a conceptual data blueprint. No production migrations or tables are implemented in Part 01. All financial parameters (commission rates, grace periods, penalty fees) are unapproved conceptual proposals pending sign-off in `PART_01_DECISIONS_REGISTER.md`.

---

## 1. Domain Model Overview & ER Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Tenant      │──────<│      User       │──────<│  UserVehicle    │
└────────┬────────┘       └────────┬────────┘       └─────────────────┘
         │                         │
         │                         ├───────────────────────────────────┐
         │                         │                                   │
         ▼                         ▼                                   ▼
┌─────────────────┐       ┌─────────────────┐                 ┌─────────────────┐
│ ParkingFacility │──────<│   HostProfile   │                 │     Booking     │
└────────┬────────┘       └─────────────────┘                 └────────┬────────┘
         │                                                             │
         ├─────────────────────────┐                                   ├─────────────────┐
         │                         │                                   │                 │
         ▼                         ▼                                   ▼                 ▼
┌─────────────────┐       ┌─────────────────┐                 ┌─────────────────┐ ┌───────────────┐
│  ParkingSpace   │       │OperatingSchedule│                 │ PaymentAttempt  │ │ReservationHold│
└────────┬────────┘       └─────────────────┘                 └────────┬────────┘ └───────────────┘
         │                                                             │
         ├─────────────────────────┐                                   ▼
         │                         │                          ┌─────────────────┐
         ▼                         ▼                          │PaymentTransact'n│
┌─────────────────┐       ┌─────────────────┐                 └────────┬────────┘
│ SpaceAmenity    │       │   SpaceMedia    │                          │
└─────────────────┘       └─────────────────┘                          ▼
                                                              ┌─────────────────┐
                                                              │PayoutSettlement │
                                                              └─────────────────┘
```

---

## 2. Core Domain Entities

### 2.1 Multi-Tenancy & Platform Identity
```sql
-- 1. Tenant & White-Label Branding
CREATE TABLE tenants (
    id VARCHAR(64) PRIMARY KEY, -- e.g. 'default', 'metro-park'
    display_name VARCHAR(128) NOT NULL,
    legal_name VARCHAR(255),
    tagline VARCHAR(255),
    primary_domain VARCHAR(255) UNIQUE,
    theme_tokens JSONB NOT NULL, -- BrandColors, typography, radii
    assets JSONB NOT NULL, -- logoUrl, iconUrl, faviconUrl
    status VARCHAR(32) DEFAULT 'active', -- active, suspended
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users & Credentials
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE RESTRICT,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32),
    password_hash VARCHAR(255),
    full_name VARCHAR(128),
    avatar_url VARCHAR(512),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) DEFAULT 'active', -- active, suspended, deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_tenant_user_email UNIQUE (tenant_id, email)
);

-- 3. Role Assignments (RBAC)
CREATE TABLE role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL, -- 'customer', 'host', 'attendant', 'superadmin'
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_tenant_role UNIQUE (user_id, tenant_id, role)
);
```

### 2.2 Facility & Space Management
```sql
-- 4. Parking Facility
CREATE TABLE parking_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    host_id UUID REFERENCES users(id),
    facility_code VARCHAR(32) NOT NULL, -- e.g. '#FAC-0104'
    name VARCHAR(255) NOT NULL, -- 'Anna Nagar Plaza Parking'
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL, -- 'Chennai'
    postal_code VARCHAR(16) NOT NULL,
    geo_point GEOGRAPHY(Point, 4326) NOT NULL, -- PostGIS Longitude / Latitude
    entrance_instructions TEXT,
    gate_pin_code VARCHAR(16),
    is_covered BOOLEAN DEFAULT FALSE,
    is_24_7 BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) DEFAULT 'draft', -- draft, under_review, published, suspended
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_facility_geo ON parking_facilities USING GIST (geo_point);
CREATE INDEX idx_facility_city ON parking_facilities (tenant_id, city);

-- 5. Individual Parking Spaces
CREATE TABLE parking_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES parking_facilities(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    bay_identifier VARCHAR(32) NOT NULL, -- 'A-01', 'B-12'
    floor_level VARCHAR(32) DEFAULT 'Ground',
    vehicle_category VARCHAR(16) NOT NULL, -- 'car', 'bike', 'auto', 'suv'
    has_ev_charger BOOLEAN DEFAULT FALSE,
    ev_charger_power_kw NUMERIC(4, 1), -- e.g. 7.4, 22.0
    is_disabled_accessible BOOLEAN DEFAULT FALSE,
    hourly_rate_inr NUMERIC(10, 2) NOT NULL, -- ₹40.00
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_facility_bay UNIQUE (facility_id, bay_identifier)
);

-- 6. Operating Schedules & Closures
CREATE TABLE operating_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES parking_facilities(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL, -- 0 (Sun) to 6 (Sat)
    open_time TIME NOT NULL, -- 08:00
    close_time TIME NOT NULL, -- 22:00
    is_closed BOOLEAN DEFAULT FALSE
);

CREATE TABLE facility_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES parking_facilities(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255)
);
```

### 2.3 Booking Lifecycle, Concurrency & Holds
```sql
-- 7. Ephemeral Reservation Holds (Concurrency Lock)
CREATE TABLE reservation_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID REFERENCES parking_spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL, -- 10-Minute Hold TTL
    is_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_active_holds ON reservation_holds (space_id, expires_at) WHERE is_released = FALSE;

-- 8. Bookings (Core Transaction Entity)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    booking_reference VARCHAR(32) UNIQUE NOT NULL, -- '#PKZ-2026-9481'
    space_id UUID REFERENCES parking_spaces(id) ON DELETE RESTRICT,
    facility_id UUID REFERENCES parking_facilities(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES users(id) ON DELETE RESTRICT,
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
CREATE INDEX idx_space_booking_times ON bookings (space_id, starts_at, ends_at) 
WHERE status IN ('confirmed', 'active');
```

### 2.4 Payments, Commission & Settlements
```sql
-- 9. Payment Transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE RESTRICT,
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    provider VARCHAR(32) NOT NULL, -- 'razorpay', 'stripe'
    provider_order_id VARCHAR(128) NOT NULL,
    provider_payment_id VARCHAR(128) UNIQUE,
    amount_inr NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(8) DEFAULT 'INR',
    method VARCHAR(32), -- 'upi', 'card', 'netbanking'
    status VARCHAR(32) NOT NULL, -- 'initiated', 'captured', 'failed', 'refunded'
    webhook_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Platform Commissions & Host Settlements
CREATE TABLE host_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    settlement_reference VARCHAR(64) UNIQUE NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    gross_earnings_inr NUMERIC(10, 2) NOT NULL,
    platform_commission_inr NUMERIC(10, 2) NOT NULL,
    net_payout_inr NUMERIC(10, 2) NOT NULL,
    utr_number VARCHAR(64),
    status VARCHAR(32) NOT NULL, -- 'scheduled', 'processing', 'completed', 'failed'
    disbursed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Booking Lifecycle State Machine

```
               [Customer Search]
                       │
                       ▼
             [Select Space & Time]
                       │
                       ▼
            ┌─────────────────────┐
            │   RESERVATION_HOLD  │  (10-Minute Lock TTL)
            └──────────┬──────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[Hold Expiry / Timeout]     [Payment Initiated]
         │                           │
         ▼                           ▼
  [EXPIRED / CANCELLED]     ┌─────────────────┐
                            │AWAITING_WEBHOOK │
                            └────────┬────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
             [Payment Failed]              [Webhook Verified]
                     │                               │
                     ▼                               ▼
             [PAYMENT_FAILED]               ┌─────────────────┐
                                            │    CONFIRMED    │
                                            └────────┬────────┘
                                                     │
                                                     ▼
                                            [Arrival Check-in]
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │     ACTIVE      │
                                            └────────┬────────┘
                                                     │
                                     ┌───────────────┴───────────────┐
                                     ▼                               ▼
                            [Normal Departure]               [Exceeds End Time]
                                     │                               │
                                     ▼                               ▼
                            ┌─────────────────┐             ┌─────────────────┐
                            │    COMPLETED    │             │ OVERSTAY_FLAGGED│
                            └─────────────────┘             └─────────────────┘
```

---

## 4. Concurrency & Anti-Collision Protocols

To satisfy the **Zero Double-Booking Invariant**, space reservation checks operate through a two-tiered safeguard:

1. **Distributed Ephemeral Hold (Tier 1)**:
   When a user clicks "Proceed to Payment", a row is inserted into `reservation_holds` with a 10-minute expiry timestamp. Any concurrent checkout queries must verify that neither a confirmed booking nor an unexpired hold exists for that slot and interval:
   ```sql
   SELECT id FROM parking_spaces ps
   WHERE ps.id = :spaceId
     AND NOT EXISTS (
       SELECT 1 FROM bookings b
       WHERE b.space_id = ps.id
         AND b.status IN ('confirmed', 'active')
         AND (b.starts_at, b.ends_at) OVERLAPS (:requestedStart, :requestedEnd)
     )
     AND NOT EXISTS (
       SELECT 1 FROM reservation_holds rh
       WHERE rh.space_id = ps.id
         AND rh.is_released = FALSE
         AND rh.expires_at > NOW()
         AND (rh.starts_at, rh.ends_at) OVERLAPS (:requestedStart, :requestedEnd)
     )
   FOR UPDATE;
   ```
2. **Database Serializable Finalization (Tier 2)**:
   When the payment gateway webhook arrives, the transaction transitions the hold into a `CONFIRMED` booking inside a database transaction isolated with `SERIALIZABLE` isolation level, releasing the hold simultaneously.
