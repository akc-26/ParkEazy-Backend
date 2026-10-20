-- =============================================================================
-- ParkEazy Database Migration 005: Auth Sessions, OTP, Password Reset & Host Profiles
-- Adds persistence tables used by the current AuthService and UsersService.
-- Safe to run on existing installations; does not drop or rewrite existing data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active
    ON auth_sessions (user_id, expires_at)
    WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_auth_sessions_tenant
    ON auth_sessions (tenant_id);

CREATE TABLE IF NOT EXISTS otp_challenges (
    id UUID PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    destination VARCHAR(255) NOT NULL,
    channel VARCHAR(16) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_tenant_destination
    ON otp_challenges (tenant_id, destination, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expiry
    ON otp_challenges (expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user
    ON password_reset_tokens (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_reset_expiry
    ON password_reset_tokens (expires_at);

CREATE TABLE IF NOT EXISTS host_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    business_name VARCHAR(255),
    pan_number VARCHAR(32),
    gstin VARCHAR(32),
    bank_account_number VARCHAR(64),
    bank_ifsc VARCHAR(32),
    bank_name VARCHAR(128),
    kyc_status VARCHAR(32) NOT NULL DEFAULT 'not_started',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_contact_name VARCHAR(128),
    emergency_contact_phone VARCHAR(32),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_host_profile_user_tenant UNIQUE (user_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_host_profiles_tenant_status
    ON host_profiles (tenant_id, kyc_status, is_approved);
