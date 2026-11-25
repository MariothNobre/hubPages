CREATE TABLE hubpages_gold_plan (
 id integer PRIMARY KEY CHECK(id=1), amount_cents integer NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000),
 version integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO hubpages_gold_plan(id,amount_cents) VALUES(1,2990);
CREATE TABLE hubpages_gold_grants (
 account_id uuid PRIMARY KEY REFERENCES hubpages_accounts(id),
 reason text NOT NULL CHECK(reason IN ('existing_account','email_exempt')),
 user_id uuid REFERENCES hubpages_users(id), granted_at timestamptz NOT NULL DEFAULT now()
);
-- This snapshot runs once, never backfills future registrations on restart.
INSERT INTO hubpages_gold_grants(account_id,reason,user_id)
 SELECT a.id,CASE WHEN EXISTS(SELECT 1 FROM hubpages_users u WHERE u.account_id=a.id AND lower(u.email)='mjsnobre2@gmail.com') THEN 'email_exempt' ELSE 'existing_account' END,
 (SELECT u.id FROM hubpages_users u WHERE u.account_id=a.id ORDER BY u.created_at,u.id LIMIT 1)
 FROM hubpages_accounts a;
CREATE TABLE hubpages_gold_orders (
 account_id uuid PRIMARY KEY REFERENCES hubpages_accounts(id), payer_id uuid NOT NULL REFERENCES hubpages_users(id),
 reference uuid NOT NULL UNIQUE, amount_cents integer NOT NULL CHECK(amount_cents>0), plan_version integer NOT NULL,
 phase text NOT NULL DEFAULT 'new', customer_id text UNIQUE, subscription_id text UNIQUE,
 invoice_url text, payment_status text, terms_version text NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE hubpages_gold_payments (
 id text PRIMARY KEY, account_id uuid NOT NULL REFERENCES hubpages_gold_orders(account_id),
 amount_cents integer NOT NULL, state text NOT NULL, valid_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hubpages_gold_payments_account ON hubpages_gold_payments(account_id,valid_until);
INSERT INTO hubpages_schema_migrations(version) VALUES(13);
