ALTER TABLE hubpages_studio_preferences ADD COLUMN IF NOT EXISTS guide_open boolean NOT NULL DEFAULT true;
INSERT INTO hubpages_schema_migrations(version) VALUES(8);
