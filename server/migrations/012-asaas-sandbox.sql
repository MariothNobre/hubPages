CREATE TABLE hubpages_asaas_config (
 id integer PRIMARY KEY CHECK(id=1), key_cipher text NOT NULL, webhook_cipher text NOT NULL,
 email text NOT NULL, webhook_id text, checked_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE hubpages_asaas_events (
 id text PRIMARY KEY, event_type text NOT NULL, resource_id text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz,
 attempts integer NOT NULL DEFAULT 0, retry_at timestamptz NOT NULL DEFAULT now(),
 provider_status text, result text CHECK(result IN ('reconciled','ignored','retry')), last_error text
);
CREATE INDEX hubpages_asaas_events_pending ON hubpages_asaas_events(retry_at) WHERE processed_at IS NULL;
CREATE TABLE hubpages_asaas_lab (
 id integer PRIMARY KEY CHECK(id=1), customer_id text, subscription_id text, payment_id text,
 phase text NOT NULL DEFAULT 'new', payment_status text, invoice_url text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO hubpages_schema_migrations(version) VALUES(12);
