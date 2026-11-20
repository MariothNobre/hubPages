import { randomUUID } from 'node:crypto'
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
import pg from 'pg'

const fields = 'u.id, u.account_id AS "accountId", u.email, u.name, u.password_hash AS "passwordHash"'
export async function createIdentityStore(connectionString, testFile) {
  if (!connectionString) return fileIdentityStore(testFile)
  const pool = new pg.Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000 })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(702071, 1)')
    await client.query(await readFile(new URL('./migrations/001-customer-identity.sql', import.meta.url), 'utf8'))
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error }
  finally { client.release() }
  const user = async (where, value) => (await pool.query(`SELECT ${fields} FROM hubpages_users u JOIN hubpages_accounts a ON a.id=u.account_id WHERE a.status='active' AND ${where}=$1`, [value])).rows[0]
  return {
    findEmail: (email) => user('u.email', email),
    async create(input) {
      const transaction = await pool.connect()
      const accountId = randomUUID(), id = randomUUID()
      try {
        await transaction.query('BEGIN')
        await transaction.query('INSERT INTO hubpages_accounts(id,name) VALUES($1,$2)', [accountId, input.name])
        await transaction.query('INSERT INTO hubpages_users(id,account_id,email,name,password_hash,terms_version) VALUES($1,$2,$3,$4,$5,$6)', [id, accountId, input.email, input.name, input.passwordHash, input.termsVersion])
        await transaction.query('COMMIT')
        return { ...input, id, accountId }
      } catch (error) { await transaction.query('ROLLBACK'); throw error }
      finally { transaction.release() }
    },
    async addSession(hash, userId, expiresAt) { await pool.query('INSERT INTO hubpages_customer_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [hash, userId, new Date(expiresAt)]) },
    async session(hash) { return (await pool.query(`SELECT ${fields} FROM hubpages_customer_sessions s JOIN hubpages_users u ON u.id=s.user_id JOIN hubpages_accounts a ON a.id=u.account_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.status='active'`, [hash])).rows[0] },
    async revoke(hash) { await pool.query('DELETE FROM hubpages_customer_sessions WHERE token_hash=$1', [hash]) },
    async update(id, input) {
      const transaction = await pool.connect()
      try {
        await transaction.query('BEGIN')
        await transaction.query('UPDATE hubpages_users SET name=$2,email=$3,password_hash=COALESCE($4,password_hash),updated_at=now() WHERE id=$1', [id, input.name, input.email, input.passwordHash ?? null])
        if (input.passwordHash) await transaction.query('DELETE FROM hubpages_customer_sessions WHERE user_id=$1', [id])
        await transaction.query('COMMIT')
      } catch (error) { await transaction.query('ROLLBACK'); throw error }
      finally { transaction.release() }
    },
  }
}

// Local isolated tests only; never used for DEV/production when DATABASE_URL exists.
function fileIdentityStore(path) {
  let pending = Promise.resolve()
  const read = async () => { try { return JSON.parse(await readFile(path, 'utf8')) } catch (e) { if (e.code === 'ENOENT') return { users: [], sessions: [] }; throw e } }
  const change = (operation) => {
    const task = pending.then(async () => {
      const state = await read(); const result = operation(state)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(`${path}.tmp`, JSON.stringify(state), { mode: 0o600 })
      await rename(`${path}.tmp`, path)
      return result
    })
    pending = task.catch(() => undefined)
    return task
  }
  return {
    async findEmail(email) { return (await read()).users.find((u) => u.email === email) },
    create: (input) => change((state) => { if (state.users.some((u) => u.email === input.email)) throw Object.assign(new Error('Duplicate'), { code: '23505' }); const user = { ...input, id: randomUUID(), accountId: randomUUID() }; state.users.push(user); return user }),
    addSession: (hash, userId, expiresAt) => change((state) => { state.sessions.push({ hash, userId, expiresAt }) }),
    async session(hash) { const state = await read(); const session = state.sessions.find((s) => s.hash === hash && s.expiresAt > Date.now()); return session && state.users.find((u) => u.id === session.userId) },
    revoke: (hash) => change((state) => { state.sessions = state.sessions.filter((s) => s.hash !== hash) }),
    update: (id, input) => change((state) => { const user = state.users.find((u) => u.id === id); if (!user) throw new Error('User missing'); if (state.users.some((u) => u.id !== id && u.email === input.email)) throw Object.assign(new Error('Duplicate'), { code: '23505' }); Object.assign(user, { name: input.name, email: input.email }, input.passwordHash ? { passwordHash: input.passwordHash } : {}); if (input.passwordHash) state.sessions = state.sessions.filter((s) => s.userId !== id) }),
  }
}
