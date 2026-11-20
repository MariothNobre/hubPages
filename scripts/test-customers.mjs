import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { scryptSync } from 'node:crypto'
import pg from 'pg'
const testDatabase = process.env.HUBPAGES_TEST_DATABASE_URL ?? ''
if (testDatabase && new URL(testDatabase).pathname !== '/hubpages_ci') throw new Error('PostgreSQL tests require an exclusive database named hubpages_ci')
const directory = await mkdtemp(join(tmpdir(), 'hubpages-customer-test-'))
const file = join(directory, 'content.json')
const password = 'LocalOnlyPassword123!'
const salt = Buffer.from('local-customer-test')
const hash = `scrypt$${salt.toString('base64url')}$${scryptSync(password, salt, 64).toString('base64url')}`
const legacy = { admin: { name: 'Admin preservado', email: 'admin@example.test', passwordHash: hash }, pages: { infancia_alem_das_telas: { title: 'Preservado', metaPixelId: '123456789', metaPixelEnabled: true } }, tracking: { infancia_alem_das_telas: { accessToken: 'synthetic-local-only' } }, analytics: { infancia_alem_das_telas: { visits: 55 } } }
await writeFile(file, JSON.stringify(legacy))
const base = 'http://localhost:4197'
const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, DATABASE_URL: testDatabase, DATA_FILE: file, STATIC_DIR: resolve('dist'), PORT: '4197', APP_ORIGINS: base, HUBPAGES_PLATFORM_ENABLED: 'true', HUBPAGES_CUSTOMER_SIGNUP_ENABLED: 'true', HUBPAGES_ADMIN_EMAIL: legacy.admin.email, HUBPAGES_SESSION_SECRET: 'local-admin-test-secret' }, stdio: ['ignore', 'pipe', 'pipe'] })
const request = async (path, method = 'GET', body, cookie = '') => fetch(`${base}${path}`, { method, headers: { Origin: base, 'Content-Type': 'application/json', Cookie: cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
const cookieOf = (response) => response.headers.get('set-cookie').split(';')[0]
try {
  await new Promise((done, reject) => { child.stdout.once('data', done); child.once('exit', (code) => reject(new Error(`Server exited: ${code}`))) })
  const config = await (await request('/api/customer/config')).json()
  const register = async (name, email) => request('/api/customer/register', 'POST', { name, email, password, acceptTerms: true, termsVersion: config.termsVersion, role: 'admin', accountId: 'legacy-owner' })
  assert.equal((await request('/api/customer/register', 'POST', { name: 'Sem aceite', email: 'no@example.test', password })).status, 422)
  const aResponse = await register('Conta A', 'a@example.test'), bResponse = await register('Conta B', 'b@example.test')
  assert.equal(aResponse.status, 201); assert.equal(bResponse.status, 201)
  const a = cookieOf(aResponse), b = cookieOf(bResponse)
  const aUser = (await aResponse.json()).user, bUser = (await bResponse.json()).user
  assert.notEqual(aUser.accountId, bUser.accountId); assert.notEqual(aUser.accountId, 'legacy-owner'); assert.equal(aUser.role, 'customer'); assert.equal(aUser.passwordHash, undefined)
  assert.equal((await register('Duplicada', 'A@example.test')).status, 409)
  assert.equal((await register('Admin', legacy.admin.email)).status, 409)
  assert.equal((await request('/api/admin/analytics', 'GET', undefined, a)).status, 401)
  const created = await (await request('/api/platform/pages', 'POST', { name: 'Somente A' }, a)).json()
  const bList = await (await request('/api/platform/pages', 'GET', undefined, b)).json()
  assert.equal(bList.pages.length, 0); assert.equal(bList.legacyPages.length, 0)
  for (const [path, method, body] of [[`/api/platform/pages/${created.id}`, 'GET'], [`/api/platform/pages/${created.id}`, 'PUT', { revision: 1, draft: created.draft }], [`/api/platform/pages/${created.id}/duplicate`, 'POST'], [`/api/platform/pages/${created.id}/restore`, 'POST', { version: 1, revision: 1 }], [`/api/platform/pages/${created.id}/publish`, 'POST']]) assert.equal((await request(path, method, body, b)).status, 404, `${method} ${path} must reject other accounts`)
  assert.equal((await request(`/api/platform/pages/${created.id}/publish`, 'POST', undefined, a)).status, 409)
  const updated = await request('/api/customer/profile', 'PUT', { name: 'Conta A atualizada', email: 'a-new@example.test', currentPassword: password, newPassword: 'UpdatedLocalPassword123!' }, a)
  assert.equal(updated.status, 200)
  assert.equal((await request(`/api/platform/pages/${created.id}`, 'GET', undefined, a)).status, 401)
  const relogin = await request('/api/customer/login', 'POST', { email: 'a-new@example.test', password: 'UpdatedLocalPassword123!' })
  assert.equal(relogin.status, 200)
  const fresh = cookieOf(relogin)
  assert.equal((await request(`/api/platform/pages/${created.id}`, 'GET', undefined, fresh)).status, 200)
  assert.equal((await request('/api/customer/logout', 'POST', undefined, fresh)).status, 200)
  assert.equal((await request(`/api/platform/pages/${created.id}`, 'GET', undefined, fresh)).status, 401)
  const adminLogin = await request('/api/admin/login', 'POST', { email: legacy.admin.email, password })
  assert.equal(adminLogin.status, 200)
  const adminPages = await (await request('/api/platform/pages', 'GET', undefined, cookieOf(adminLogin))).json()
  assert.equal(adminPages.pages.length, 0); assert.equal(adminPages.legacyPages.length, 2)
  let actual = JSON.parse(await readFile(file, 'utf8'))
  if (testDatabase) {
    const pool = new pg.Pool({ connectionString: testDatabase })
    try {
      actual = (await pool.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_users')).rows[0].n, 2)
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_accounts')).rows[0].n, 2)
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_schema_migrations WHERE version=1')).rows[0].n, 1)
      console.log('PASS: real PostgreSQL additive migration, account transactions and legacy state preservation')
    } finally { await pool.end() }
  }
  for (const key of Object.keys(legacy)) assert.deepStrictEqual(actual[key], legacy[key])
  console.log('PASS: two customer accounts isolated across list/read/update/duplicate/restore/publish; role spoof rejected; password/session revocation; legacy unchanged')
} finally {
  if (process.env.HUBPAGES_CUSTOMER_TEST_PREVIEW === 'true') console.log(`Local isolated customer preview: ${base}/conta (b@example.test / ${password})`)
  else child.kill()
}
