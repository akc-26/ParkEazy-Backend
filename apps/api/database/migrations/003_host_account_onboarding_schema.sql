-- ============================================================================
-- ParkEazy Migration 003: Host Account Profiles, Onboarding & Auth Tokens
-- Invariants Enforced:
--  1. Host profile is bound 1:1 with authenticated users entity.
--  2. Verification tokens have cryptographic hashes and explicit expiration timestamps.
--  3. Onboarding tracks distinct profile and eligibility milestones.
-- ============================================================================

CREATE TABLE IF NOT EXISTS host_profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    business_type VARCHAR(50) NOT NULL DEFAULT 'INDIVIDUAL',
    business_name VARCHAR(255),
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    phone_number VARCHAR(50) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'US',
    emergency_contact_name VARCHAR(100) NOT NULL,
    emergency_contact_phone VARCHAR(50) NOT NULL,
    ownership_type VARCHAR(50) NOT NULL DEFAULT 'OWNED',
    property_types TEXT[] NOT NULL DEFAULT '{"DRIVEWAY"}',
    has_liability_insurance BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_policy_number VARCHAR(100),
    insurance_expiry_date DATE,
    accepts_terms BOOLEAN NOT NULL DEFAULT TRUE,
    accepts_host_agreement BOOLEAN NOT NULL DEFAULT TRUE,
    application_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    onboarding_step VARCHAR(50) NOT NULL DEFAULT 'PROFILE',
    status_reason TEXT,
    submitted_at_utc TIMESTAMPTZ,
    reviewed_at_utc TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_verification_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type VARCHAR(50) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    target_destination VARCHAR(255) NOT NULL,
    expires_at_utc TIMESTAMPTZ NOT NULL,
    consumed_at_utc TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at_utc TIMESTAMPTZ NOT NULL,
    consumed_at_utc TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at_utc TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_lookup ON auth_verification_tokens(user_id, token_type, expires_at_utc);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_lookup ON auth_password_reset_tokens(user_id, expires_at_utc);
CREATE INDEX IF NOT EXISTS idx_host_profiles_status ON host_profiles(application_status);

