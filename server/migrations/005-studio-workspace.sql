CREATE TABLE hubpages_studio_preferences(owner_id text PRIMARY KEY REFERENCES hubpages_page_owners(id),list_view text NOT NULL DEFAULT 'cards' CHECK(list_view IN ('cards','list')));
CREATE TABLE hubpages_studio_legacy(slug text PRIMARY KEY,page_id uuid UNIQUE REFERENCES hubpages_studio_pages(id) ON DELETE SET NULL,purged_at timestamptz);
CREATE TABLE hubpages_studio_traffic(page_id uuid NOT NULL REFERENCES hubpages_studio_pages(id) ON DELETE CASCADE,hour timestamptz NOT NULL,visits bigint NOT NULL DEFAULT 0,PRIMARY KEY(page_id,hour));
CREATE TABLE hubpages_studio_visitors(page_id uuid NOT NULL REFERENCES hubpages_studio_pages(id) ON DELETE CASCADE,visitor_hash text NOT NULL,last_visit_at timestamptz NOT NULL,PRIMARY KEY(page_id,visitor_hash));
CREATE TABLE hubpages_studio_presence(page_id uuid NOT NULL REFERENCES hubpages_studio_pages(id) ON DELETE CASCADE,visitor_hash text NOT NULL,tab_id uuid NOT NULL,last_seen timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(page_id,visitor_hash,tab_id));
CREATE INDEX hubpages_presence_seen_idx ON hubpages_studio_presence(last_seen);
CREATE TABLE hubpages_studio_purges(page_id uuid PRIMARY KEY,owner_id text NOT NULL,purged_at timestamptz NOT NULL DEFAULT now());
-- History remains immutable outside an explicitly scoped permanent-deletion transaction.
CREATE OR REPLACE FUNCTION hubpages_keep_studio_history() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text; row_page text;
BEGIN
  target := current_setting('hubpages.purge_page',true);
  IF TG_OP='DELETE' AND COALESCE(target,'')<>'' THEN
    IF TG_TABLE_NAME='hubpages_studio_publication_images' THEN
      SELECT page_id::text INTO row_page FROM hubpages_studio_publications WHERE id=OLD.publication_id;
    ELSE row_page := OLD.page_id::text;
    END IF;
    IF row_page=target THEN RETURN OLD; END IF;
  END IF;
  RAISE EXCEPTION 'Studio history is append-only';
END $$;
INSERT INTO hubpages_schema_migrations(version) VALUES(5);
