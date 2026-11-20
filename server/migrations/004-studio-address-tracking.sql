CREATE TABLE hubpages_studio_addresses (
  public_url text PRIMARY KEY,
  page_id uuid NOT NULL REFERENCES hubpages_studio_pages(id),
  owner_id text NOT NULL,
  FOREIGN KEY(page_id,owner_id) REFERENCES hubpages_studio_pages(id,owner_id)
);
CREATE INDEX hubpages_addresses_page_idx ON hubpages_studio_addresses(page_id);
INSERT INTO hubpages_studio_addresses(public_url,page_id,owner_id)
SELECT extra->'publication'->>'url',id,owner_id FROM hubpages_studio_pages
WHERE editorial_status='published' AND COALESCE(extra->'publication'->>'url','')<>'' AND COALESCE(extra->>'trashedAt','')='';
CREATE TABLE hubpages_studio_tracking (
  page_id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  token_ciphertext text NOT NULL DEFAULT '',
  test_event_code varchar(100) NOT NULL DEFAULT '',
  FOREIGN KEY(page_id,owner_id) REFERENCES hubpages_studio_pages(id,owner_id)
);
CREATE TABLE hubpages_studio_meta_events (
  publication_id uuid NOT NULL REFERENCES hubpages_studio_publications(id),
  event_id varchar(64) NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  PRIMARY KEY(publication_id,event_id)
);
INSERT INTO hubpages_schema_migrations(version) VALUES(4);
