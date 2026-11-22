-- DEV-only service. No changes to existing users, passwords, sessions or pages.
CREATE TABLE hubpages_saas_roles (
 subject text PRIMARY KEY,
 role text NOT NULL CHECK(role IN ('super_admin','customer')),
 assigned_at timestamptz NOT NULL DEFAULT now(),
 assigned_by text NOT NULL
);
CREATE TABLE hubpages_saas_audit (
 id uuid PRIMARY KEY,
 event_key text UNIQUE,
 actor text NOT NULL,
 action text NOT NULL,
 target text NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('allowed','denied')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hubpages_saas_audit_time ON hubpages_saas_audit(created_at DESC,id);
CREATE INDEX hubpages_saas_audit_actor ON hubpages_saas_audit(actor,created_at DESC);
CREATE FUNCTION hubpages_keep_saas_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'SaaS audit is append-only'; END $$;
CREATE TRIGGER hubpages_saas_audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON hubpages_saas_audit
 FOR EACH STATEMENT EXECUTE FUNCTION hubpages_keep_saas_audit();
INSERT INTO hubpages_schema_migrations(version) VALUES(11);
