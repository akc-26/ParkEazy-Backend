-- ============================================================================
-- ParkEazy Migration 007: Authoritative Active Application Store & Relational Extensions
-- Extends PostgreSQL schema to cover all active frontend operations, sessions,
-- provider configurations, system audit trails, pricing rules, and messaging.
-- ============================================================================

-- 1. Users extensions
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_details JSONB;

-- 2. Parking locations (Facilities) extensions
ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE parking_locations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Parking bays extensions
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS custom_hourly_rate_cents INTEGER;
ALTER TABLE parking_bays ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Bookings extensions
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 5. Financial ledger extensions
ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS host_id VARCHAR(64);
ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100);
ALTER TABLE financial_ledger ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';
ALTER TABLE financial_ledger ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE financial_ledger ALTER COLUMN payment_provider DROP NOT NULL;
ALTER TABLE financial_ledger ALTER COLUMN debit_account DROP NOT NULL;
ALTER TABLE financial_ledger ALTER COLUMN credit_account DROP NOT NULL;

-- 6. Payout records extensions
ALTER TABLE host_payout_records ADD COLUMN IF NOT EXISTS method VARCHAR(50) DEFAULT 'ach_bank_transfer';
ALTER TABLE host_payout_records ADD COLUMN IF NOT EXISTS destination_account VARCHAR(255);
ALTER TABLE host_payout_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE host_payout_records ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);
ALTER TABLE host_payout_records ADD COLUMN IF NOT EXISTS provider_transfer_id VARCHAR(128);


-- 7. Active Sessions
CREATE TABLE IF NOT EXISTS active_sessions (
    token VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at);

-- 8. Facility Pricing Rules
CREATE TABLE IF NOT EXISTS facility_pricing_rules (
    id VARCHAR(64) PRIMARY KEY,
    facility_id VARCHAR(64) NOT NULL REFERENCES parking_locations(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_facility ON facility_pricing_rules(facility_id);

-- 9. Active Provider Configs (Category A operational + encrypted Category B credentials)
CREATE TABLE IF NOT EXISTS provider_configs (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mode VARCHAR(50) NOT NULL DEFAULT 'test',
    operational_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_tested_at TIMESTAMPTZ,
    test_status VARCHAR(50),
    test_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. System Audit Logs
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id VARCHAR(64),
    user_name VARCHAR(255),
    user_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(100)
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON system_audit_logs(entity_type, entity_id);

-- 11. Customer-Host Message Threads
CREATE TABLE IF NOT EXISTS message_threads (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64),
    facility_id VARCHAR(64),
    customer_id VARCHAR(64),
    host_id VARCHAR(64),
    data JSONB NOT NULL,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. App Entity Persistence Store (authoritative store collection entries)
CREATE TABLE IF NOT EXISTS app_store_entities (
    collection VARCHAR(64) NOT NULL,
    id VARCHAR(64) NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS idx_app_store_entities_collection ON app_store_entities(collection);
