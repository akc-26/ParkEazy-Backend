-- Session tokens include a prefix plus a 64-character digest and can exceed VARCHAR(64).
-- Widen the generic entity key without changing existing identifiers or data.
ALTER TABLE app_store_entities ALTER COLUMN id TYPE VARCHAR(128);
