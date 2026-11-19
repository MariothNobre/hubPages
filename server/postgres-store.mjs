import pg from 'pg'

// Exclusive HubPages database. Never configure this with Sistera credentials.
export async function createPostgresStore(connectionString, initialStore) {
  const pool = new pg.Pool({ connectionString, max: 4, connectionTimeoutMillis: 5000 })
  await pool.query('CREATE TABLE IF NOT EXISTS hubpages_state (id integer PRIMARY KEY CHECK (id = 1), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())')
  await pool.query('INSERT INTO hubpages_state (id, payload) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING', [JSON.stringify(initialStore)])
  return {
    async read() { const result = await pool.query('SELECT payload FROM hubpages_state WHERE id = 1'); return result.rows[0].payload },
    async write(value) { await pool.query('UPDATE hubpages_state SET payload = $1::jsonb, updated_at = now() WHERE id = 1', [JSON.stringify(value)]) },
  }
}
