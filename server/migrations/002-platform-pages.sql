-- Additive only. The original payload.platform remains an untouched migration snapshot.
CREATE TABLE IF NOT EXISTS hubpages_page_owners (
  id text PRIMARY KEY,
  account_id uuid UNIQUE REFERENCES hubpages_accounts(id),
  CHECK ((id='legacy-owner' AND account_id IS NULL) OR (account_id IS NOT NULL AND id=account_id::text))
);
CREATE TABLE IF NOT EXISTS hubpages_studio_pages (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL REFERENCES hubpages_page_owners(id),
  origin text NOT NULL,
  editorial_status text NOT NULL,
  financial_status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  revision integer NOT NULL CHECK (revision>0),
  draft jsonb NOT NULL CHECK (jsonb_typeof(draft)='object'),
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (id,owner_id)
);
CREATE INDEX IF NOT EXISTS hubpages_studio_pages_owner_idx ON hubpages_studio_pages(owner_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS hubpages_studio_revisions (
  page_id uuid NOT NULL REFERENCES hubpages_studio_pages(id),
  version integer NOT NULL CHECK (version>0),
  document jsonb NOT NULL,
  PRIMARY KEY (page_id,version),
  CHECK ((document->>'version')::integer=version)
);
CREATE TABLE IF NOT EXISTS hubpages_studio_audit (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  page_id uuid NOT NULL,
  document jsonb NOT NULL,
  FOREIGN KEY (page_id,owner_id) REFERENCES hubpages_studio_pages(id,owner_id)
);
CREATE INDEX IF NOT EXISTS hubpages_studio_audit_owner_idx ON hubpages_studio_audit(owner_id,page_id);
CREATE TABLE IF NOT EXISTS hubpages_studio_images (
  page_id uuid NOT NULL REFERENCES hubpages_studio_pages(id),
  slot text NOT NULL,
  mime text NOT NULL CHECK (mime IN ('image/jpeg','image/png','image/webp')),
  content bytea NOT NULL CHECK (octet_length(content)<=2097152),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id,slot)
);
CREATE OR REPLACE FUNCTION hubpages_keep_studio_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Studio history is append-only';
END $$;
CREATE OR REPLACE FUNCTION hubpages_keep_page_origin() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.origin IS DISTINCT FROM OLD.origin OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Studio origin and ownership are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER hubpages_studio_revisions_immutable BEFORE UPDATE OR DELETE ON hubpages_studio_revisions FOR EACH ROW EXECUTE FUNCTION hubpages_keep_studio_history();
CREATE TRIGGER hubpages_studio_audit_immutable BEFORE UPDATE OR DELETE ON hubpages_studio_audit FOR EACH ROW EXECUTE FUNCTION hubpages_keep_studio_history();
CREATE TRIGGER hubpages_studio_origin_immutable BEFORE UPDATE ON hubpages_studio_pages FOR EACH ROW EXECUTE FUNCTION hubpages_keep_page_origin();
