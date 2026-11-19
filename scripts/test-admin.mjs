import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { scryptSync } from 'node:crypto'
const directory = await mkdtemp(join(tmpdir(), 'hubpages-admin-test-'))
const password = 'LocalTestPassword123!'
const salt = Buffer.from('test-only-salt')
const hash = `scrypt$${salt.toString('base64url')}$${scryptSync(password, salt, 64).toString('base64url')}`
const file = join(directory, 'content.json')
await writeFile(file, JSON.stringify({ admin: { email: 'test@example.com', passwordHash: hash }, pages: { infancia_alem_das_telas: { publicUrl: 'https://test.example.com/oferta', published: true } } }))
const base = 'http://localhost:4196'
const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, DATABASE_URL: '', PORT: '4196', STATIC_DIR: resolve('dist'), DATA_FILE: file, APP_ORIGINS: base, HUBPAGES_ADMIN_EMAIL: 'test@example.com', HUBPAGES_SESSION_SECRET: 'local-test-secret' }, stdio: ['ignore', 'pipe', 'pipe'] })
try {
  await new Promise((done, reject) => { child.stdout.once('data', done); child.once('exit', (code) => reject(new Error(`Server exited: ${code}`))) })
  const login = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com', password }) })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const headers = { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }
  const alias = await fetch(`${base}/api/resolve-page?url=${encodeURIComponent('https://test.example.com/oferta')}`)
  assert.equal((await alias.json()).slug, 'infancia_alem_das_telas')
  const profile = await fetch(`${base}/api/admin/profile`, { method: 'PUT', headers, body: JSON.stringify({ name: 'Teste', email: 'updated@example.com', currentPassword: password, newPassword: 'UpdatedPassword123!' }) })
  assert.equal(profile.status, 200)
  assert.equal((await fetch(`${base}/api/admin/profile`, { headers })).status, 401)
  const state = JSON.parse(await readFile(file, 'utf8'))
  assert.equal(state.admin.email, 'updated@example.com')
  state.pages.infancia_alem_das_telas.published = false
  await writeFile(file, JSON.stringify(state))
  assert.equal((await fetch(`${base}/api/resolve-page?url=${encodeURIComponent('https://test.example.com/oferta')}`)).status, 404)
  assert.equal((await fetch(`${base}/api/pages/infancia_alem_das_telas`)).status, 404)
  console.log('PASS: login, alias, profile, password invalidation and draft blocking')
} finally { child.kill() }
