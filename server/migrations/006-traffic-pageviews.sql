-- Receipts prevent transport retries from double-counting one access, never deduplicate a visitor.
CREATE TABLE hubpages_studio_views(
  page_id uuid NOT NULL REFERENCES hubpages_studio_pages(id) ON DELETE CASCADE,
  view_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(page_id,view_id)
);
CREATE INDEX hubpages_views_created_idx ON hubpages_studio_views(created_at);
-- Keep a short-lived inactive row so an out-of-order heartbeat cannot revive a closed tab.
ALTER TABLE hubpages_studio_presence ADD COLUMN event_sequence bigint NOT NULL DEFAULT 0;
ALTER TABLE hubpages_studio_presence ADD COLUMN active boolean NOT NULL DEFAULT true;
INSERT INTO hubpages_schema_migrations(version) VALUES(6);
