import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import pg from 'pg'

export function saasDevEnabled(env, origin) {
 return env.HUBPAGES_SAAS_ADMIN_ENABLED === 'true' && env.HUBPAGES_ENV === 'development' &&
  (origin === 'https://dev.hubpages.com.br' || /^http:\/\/localhost:\d+$/.test(origin))
}
const digest = value => createHash('sha256').update(value).digest('hex')
const permissions = Object.freeze({super_admin: ['admin.dashboard.read','admin.users.read','admin.audit.read'], customer: []})
export const authorityError = (status, message) => Object.assign(new Error(message), {status})

// No client-provided role, email or account identifier is accepted as authority.
export async function createSaasAuthority({connectionString, checkpointPath}) {
 if (!connectionString) throw new Error('SaaS authority requires isolated PostgreSQL')
 const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8'))
 assert.ok(checkpoint.principal && checkpoint.ownerId, 'Verified identity checkpoint required')
 const pool = new pg.Pool({connectionString, max: 2, connectionTimeoutMillis: 5000})
 const client = await pool.connect()
 let failed=false
 try {
  await client.query('BEGIN')
  await client.query('SELECT pg_advisory_xact_lock(702075,11)')
  // Revalidate against the actual existing database before assigning any authority.
  if (checkpoint.principal === 'legacy-owner') {
   assert.equal(checkpoint.ownerId, 'legacy-owner')
   const state = (await client.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload
   assert.ok(state.admin?.passwordHash, 'Existing administrative password required')
   assert.equal(digest(state.admin.passwordHash), checkpoint.legacyPassword, 'Preflight identity changed')
  } else {
   const user = (await client.query('SELECT account_id,password_hash FROM hubpages_users WHERE id=$1', [checkpoint.principal])).rows[0]
   assert.ok(user, 'Verified principal must already exist')
   assert.equal(user.account_id, checkpoint.ownerId)
   assert.equal(digest(user.password_hash), checkpoint.users.find(u=>u.id===checkpoint.principal)?.digest)
  }
  if (!(await client.query('SELECT version FROM hubpages_schema_migrations WHERE version=11')).rowCount)
   await client.query(await readFile(new URL('./migrations/011-saas-authority.sql', import.meta.url), 'utf8'))
  const existing = (await client.query('SELECT role FROM hubpages_saas_roles WHERE subject=$1', [checkpoint.principal])).rows[0]
  if (!existing) {
   await client.query("INSERT INTO hubpages_saas_roles(subject,role,assigned_by) VALUES($1,'super_admin','verified-dev-preflight')", [checkpoint.principal])
   await client.query("INSERT INTO hubpages_saas_audit(id,event_key,actor,action,target,outcome) VALUES($1,$2,'verified-dev-preflight','role.bootstrap',$3,'allowed')", [randomUUID(), 'principal.bootstrap', checkpoint.principal])
  }
  await client.query('COMMIT')
 } catch (error) { failed=true; await client.query('ROLLBACK'); throw error }
 finally { client.release(); if(failed)await pool.end() }
 const audit = async (actor,action,target,outcome='allowed') => {
  // Fixed fields only: never write bodies, credentials, cookies, OTPs or tokens.
  if (![actor,action,target].every(v=>typeof v==='string'&&v.length<=160)) throw new Error('Invalid audit event')
  await pool.query('INSERT INTO hubpages_saas_audit(id,actor,action,target,outcome) VALUES($1,$2,$3,$4,$5)', [randomUUID(),actor,action,target,outcome])
 }
 return {
  async identity(customer, legacySession) {
   if (!customer && !legacySession) return null
   const subject = customer?.id ?? 'legacy-owner'
   const role = (await pool.query('SELECT role FROM hubpages_saas_roles WHERE subject=$1', [subject])).rows[0]?.role ?? 'customer'
   return {subject, ownerId:customer?.accountId ?? 'legacy-owner', role, permissions:permissions[role] ?? []}
  },
  async require(identity, permission) {
   if (!identity) throw authorityError(401, 'Entre na sua conta para continuar.')
   if (!identity.permissions.includes(permission)) throw authorityError(403, 'Este recurso é exclusivo da administração HubPages.')
  },
  audit,
  async dashboard() {
   const values = await pool.query(`SELECT
    (SELECT count(*)::integer FROM hubpages_users) AS customers,
    (SELECT count(*)::integer FROM hubpages_accounts WHERE status='active') AS "activeAccounts",
    (SELECT count(*)::integer FROM hubpages_studio_pages) AS pages,
    (SELECT count(*)::integer FROM hubpages_studio_publications) AS "publicationSnapshots",
    (SELECT COALESCE(sum(visits),0)::bigint::text FROM hubpages_studio_traffic) AS "recordedAccesses",
    (SELECT count(*)::integer FROM hubpages_studio_domains WHERE document->>'verified'='true') AS "verifiedDomains"`)
   return {...values.rows[0], financial:{configured:false,revenue:null}, infrastructure:{source:'node-process',rssBytes:process.memoryUsage().rss,vpsMetricsAvailable:false}}
  },
  async users() {
   return (await pool.query(`SELECT u.id,u.account_id AS "accountId",u.name,u.email,a.status,u.created_at AS "createdAt",
    COALESCE(r.role,'customer') AS role FROM hubpages_users u JOIN hubpages_accounts a ON a.id=u.account_id
    LEFT JOIN hubpages_saas_roles r ON r.subject=u.id::text ORDER BY u.created_at DESC LIMIT 100`)).rows
  },
  async events(before) {
   if (before && !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(before)) throw authorityError(422,'Data inválida.')
   return (await pool.query('SELECT id,actor,action,target,outcome,created_at AS "createdAt" FROM hubpages_saas_audit WHERE ($1::timestamptz IS NULL OR created_at<$1::timestamptz) ORDER BY created_at DESC,id DESC LIMIT 100', [before||null])).rows
  },
  close:()=>pool.end(),
 }
}
