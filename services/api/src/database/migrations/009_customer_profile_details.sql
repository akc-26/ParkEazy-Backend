-- Persist optional customer profile details without changing existing account rows.
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(120);
ALTER TABLE users ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);
