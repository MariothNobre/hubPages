CREATE TABLE hubpages_studio_domains (
 id uuid PRIMARY KEY,
 owner_id text NOT NULL,
 page_id uuid NOT NULL REFERENCES hubpages_studio_pages(id) ON DELETE CASCADE,
 hostname text NOT NULL,
 document jsonb NOT NULL,
 UNIQUE(owner_id, hostname)
);
CREATE UNIQUE INDEX hubpages_domain_verified_host ON hubpages_studio_domains(hostname) WHERE document->>'verified'='true';
CREATE INDEX hubpages_domain_page ON hubpages_studio_domains(page_id,owner_id);
INSERT INTO hubpages_schema_migrations(version) VALUES(10);
