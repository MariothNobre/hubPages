import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { scryptSync } from 'node:crypto'
import pg from 'pg'
import { createDraft, saveDraft } from '../server/platform.mjs'
import { createPostgresStore } from '../server/postgres-store.mjs'
import { createIdentityStore } from '../server/identity-store.mjs'
import { createPlatformStore } from '../server/platform-store.mjs'
const testDatabase = process.env.HUBPAGES_TEST_DATABASE_URL ?? ''
if (testDatabase && new URL(testDatabase).pathname !== '/hubpages_ci') throw new Error('PostgreSQL tests require an exclusive database named hubpages_ci')
const directory = await mkdtemp(join(tmpdir(), 'hubpages-customer-test-'))
const file = join(directory, 'content.json')
const password = 'LocalOnlyPassword123!'
const salt = Buffer.from('local-customer-test')
const hash = `scrypt$${salt.toString('base64url')}$${scryptSync(password, salt, 64).toString('base64url')}`
const legacy = { admin: { name: 'Admin preservado', email: 'admin@example.test', passwordHash: hash }, pages: { infancia_alem_das_telas: { title: 'Preservado', metaPixelId: '123456789', metaPixelEnabled: true } }, tracking: { infancia_alem_das_telas: { accessToken: 'synthetic-local-only' } }, analytics: { infancia_alem_das_telas: { visits: 55 } } }
const seed = createDraft(legacy,'legacy-owner',{name:'Rascunho preexistente',title:'Título preservado'})
saveDraft(legacy,'legacy-owner',seed.id,{revision:1,draft:{...seed.draft,title:'Revisão preservada'}})
legacy.platform.pages[seed.id].origin='imported_authorized'
if(testDatabase) {
  await createPostgresStore(testDatabase,legacy)
  await createIdentityStore(testDatabase,'')
  const migrated = await createPlatformStore(testDatabase)
  assert.deepStrictEqual(await migrated.read('legacy-owner',seed.id),legacy.platform.pages[seed.id])
  await migrated.close()
  console.log('PASS: existing Studio draft and complete revision chain migrated without changing source')
}
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
  const catalog=await (await request('/api/platform/templates','GET',undefined,a)).json()
  assert.equal(catalog.templates[0].id,'infancia_pt')
  const model=await (await request('/api/platform/pages','POST',{name:'Modelo independente',template:'infancia_pt'},a)).json()
  assert.equal(model.draft.blocks.filter((block)=>block.kind==='sample').length,12)
  assert.equal(model.draft.checkoutUrl,'');assert.equal(model.draft.metaPixelId,'')
  const updates=await Promise.all(['Primeira edição','Segunda edição'].map(title=>request(`/api/platform/pages/${created.id}`,'PUT',{revision:created.revision,draft:{...created.draft,title}},a)))
  assert.deepEqual(updates.map((r)=>r.status).sort(),[200,409])
  const current=await (await request(`/api/platform/pages/${created.id}`,'GET',undefined,a)).json()
  assert.equal(current.revisions.length,2)
  const restored=await (await request(`/api/platform/pages/${created.id}/restore`,'POST',{revision:2,version:1},a)).json()
  assert.equal(restored.revision,3);assert.equal(restored.draft.title,created.draft.title)
  const imagePath=`/api/platform/pages/${model.id}/images/hero`
  const imageBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')
  const upload=async(cookie,bytes=imageBytes)=>fetch(`${base}${imagePath}`,{method:'PUT',headers:{Origin:base,Cookie:cookie,'Content-Type':'image/png'},body:bytes})
  assert.equal((await upload(b)).status,404)
  assert.equal((await upload(a,Buffer.from('<svg></svg>'))).status,422)
  assert.equal((await upload(a)).status,200)
  const imageRead=await request(imagePath,'GET',undefined,a)
  assert.equal(imageRead.status,200);assert.deepEqual(Buffer.from(await imageRead.arrayBuffer()),imageBytes)
  assert.equal((await request(imagePath,'GET',undefined,b)).status,404)
  assert.equal((await request(imagePath)).status,401)
  const imageSaved=await (await request(`/api/platform/pages/${model.id}`,'PUT',{revision:model.revision,draft:{...model.draft,imageUrl:imagePath}},a)).json()
  assert.equal(imageSaved.draft.imageUrl,imagePath)
  assert.equal((await upload(a)).status,200)
  const copied=await (await request(`/api/platform/pages/${model.id}/duplicate`,'POST',undefined,a)).json()
  assert.equal(copied.draft.imageUrl,`/api/platform/pages/${copied.id}/images/hero`)
  assert.equal((await request(copied.draft.imageUrl,'GET',undefined,a)).status,200)
  assert.equal((await request(`/api/platform/pages/${model.id}`,'PUT',{revision:imageSaved.revision,draft:{...imageSaved.draft,imageUrl:''}},a)).status,200)
  assert.equal((await request(imagePath,'GET',undefined,a)).status,404)
  const settings=await (await request(`/api/platform/pages/${model.id}`,'GET',undefined,a)).json()
  const configured=await (await request(`/api/platform/pages/${model.id}`,'PUT',{revision:settings.revision,draft:{...settings.draft,templateTexts:{t_test:'Texto editado diretamente'},templateButtons:{header:{enabled:false},hero:{enabled:true,url:'',inheritLink:false}},blocks:settings.draft.blocks.map((block,i)=>i===0?{...block,showButton:false,buttonUrl:'',inheritLink:false}:block)}},a)).json()
  assert.equal(configured.draft.templateTexts.t_test,'Texto editado diretamente')
  assert.equal(configured.draft.templateButtons.header.enabled,false)
  assert.equal(configured.draft.templateButtons.hero.inheritLink,false)
  assert.equal(configured.draft.blocks[0].showButton,false)
  assert.equal(configured.draft.blocks[0].templateRole,'pain')
  assert.equal(configured.draft.blocks[0].inheritLink,false)
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
  assert.equal(adminPages.pages.length, 1); assert.equal(adminPages.legacyPages.length, 2)
  let actual = JSON.parse(await readFile(file, 'utf8'))
  if (testDatabase) {
    const pool = new pg.Pool({ connectionString: testDatabase })
    try {
      actual = (await pool.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_users')).rows[0].n, 2)
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_accounts')).rows[0].n, 2)
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_schema_migrations WHERE version=1')).rows[0].n, 1)
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_schema_migrations WHERE version=2')).rows[0].n, 1)
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_studio_images WHERE page_id=$1',[copied.id])).rows[0].n,1)
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_studio_revisions WHERE page_id=$1',[created.id])).rows[0].n,3)
      await assert.rejects(pool.query('UPDATE hubpages_studio_revisions SET document=document WHERE page_id=$1',[created.id]),/append-only/)
      await assert.rejects(pool.query("UPDATE hubpages_studio_pages SET origin='native' WHERE id=$1",[seed.id]),/immutable/)
      console.log('PASS: real PostgreSQL additive migration, account transactions and legacy state preservation')
    } finally { await pool.end() }
  }
  for (const key of Object.keys(legacy).filter((key)=>key!=='platform')) assert.deepStrictEqual(actual[key], legacy[key])
  if(testDatabase) assert.deepStrictEqual(actual.platform,legacy.platform)
  console.log('PASS: two customer accounts isolated across list/read/update/duplicate/restore/publish; role spoof rejected; password/session revocation; legacy unchanged')
} finally {
  if (process.env.HUBPAGES_CUSTOMER_TEST_PREVIEW === 'true') console.log(`Local isolated customer preview: ${base}/conta (b@example.test / ${password})`)
  else child.kill()
}
