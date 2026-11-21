-- Immutable publication snapshots. Never changes legacy pages, tracking or credentials.
CREATE TABLE hubpages_studio_publications (
  id uuid PRIMARY KEY,
  page_id uuid NOT NULL,
  owner_id text NOT NULL,
  revision integer NOT NULL CHECK(revision>0),
  draft jsonb NOT NULL CHECK(jsonb_typeof(draft)='object'),
  published_at timestamptz NOT NULL,
  public_url text NOT NULL,
  mode text NOT NULL CHECK (mode='dev-free'),
  FOREIGN KEY(page_id,owner_id) REFERENCES hubpages_studio_pages(id,owner_id),
  FOREIGN KEY(page_id,revision) REFERENCES hubpages_studio_revisions(page_id,version) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX hubpages_publications_page_idx ON hubpages_studio_publications(page_id,published_at DESC);
CREATE TABLE hubpages_studio_publication_images (
  publication_id uuid NOT NULL REFERENCES hubpages_studio_publications(id),
  slot text NOT NULL,
  mime text NOT NULL CHECK(mime IN ('image/png','image/jpeg','image/webp')),
  content bytea NOT NULL CHECK(octet_length(content)<=2097152),
  PRIMARY KEY(publication_id,slot)
);
CREATE TRIGGER hubpages_publications_immutable BEFORE UPDATE OR DELETE ON hubpages_studio_publications FOR EACH ROW EXECUTE FUNCTION hubpages_keep_studio_history();
CREATE TRIGGER hubpages_publication_images_immutable BEFORE UPDATE OR DELETE ON hubpages_studio_publication_images FOR EACH ROW EXECUTE FUNCTION hubpages_keep_studio_history();
INSERT INTO hubpages_schema_migrations(version) VALUES(3);
