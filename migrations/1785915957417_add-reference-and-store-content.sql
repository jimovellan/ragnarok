-- Up Migration

ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS reference TEXT NOT NULL DEFAULT '';
ALTER TABLE knowledge ADD COLUMN IF NOT EXISTS store_content BOOLEAN NOT NULL DEFAULT true;

-- Down Migration

ALTER TABLE knowledge DROP COLUMN IF EXISTS store_content;
ALTER TABLE knowledge DROP COLUMN IF EXISTS reference;
