-- Additive migration: leaves hubpages_state and its legacy administrator untouched.
CREATE TABLE IF NOT EXISTS hubpages_schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hubpages_accounts (
  id uuid PRIMARY KEY,
  name varchar(120) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hubpages_users (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES hubpages_accounts(id),
  email varchar(254) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  password_hash text NOT NULL,
  terms_version varchar(80) NOT NULL,
  terms_accepted_at timestamptz NOT NULL DEFAULT now(),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS hubpages_customer_sessions (
  token_hash char(64) PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES hubpages_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS hubpages_users_account_idx ON hubpages_users(account_id);
CREATE INDEX IF NOT EXISTS hubpages_sessions_user_idx ON hubpages_customer_sessions(user_id);
INSERT INTO hubpages_schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
