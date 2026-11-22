import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createHash,randomBytes,scryptSync} from 'node:crypto'
import {mkdtemp,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'
import pg from 'pg'
import {saasDevEnabled} from '../server/saas-authority.mjs'

assert.equal(saasDevEnabled({HUBPAGES_ENV:'production',HUBPAGES_SAAS_ADMIN_ENABLED:'true'},'https://hubpages.com.br'),false)
assert.equal(saasDevEnabled({HUBPAGES_ENV:'development',HUBPAGES_SAAS_ADMIN_ENABLED:'true'},'https://hubpages.com.br'),false)
assert.equal(saasDevEnabled({HUBPAGES_ENV:'development'},'https://dev.hubpages.com.br'),false)
assert.equal(saasDevEnabled({HUBPAGES_ENV:'development',HUBPAGES_SAAS_ADMIN_ENABLED:'true'},'https://dev.hubpages.com.br'),true)
const database=process.env.HUBPAGES_TEST_DATABASE_URL
if(!database){console.log('PASS: DEV-only authority gate. PostgreSQL/HTTP integration requires exclusive CI database.');process.exit(0)}
assert.equal(new URL(database).pathname,'/hubpages_ci','Only exclusive CI database permitted')
const schema='saas_ci_'+randomBytes(6).toString('hex')
const root=new pg.Pool({connectionString:database,max:1})
await root.query(`CREATE SCHEMA ${schema}`)
const target=new URL(database);target.searchParams.set('options',`-c search_path=${schema}`)
const pool=new pg.Pool({connectionString:target.href,max:1})
const directory=await mkdtemp(join(tmpdir(),'hubpages-saas-'))
const file=join(directory,'content.json'),checkpoint=join(directory,'checkpoint.json')
const password='LocalSaasOnlyPassword123!',salt=Buffer.from('local-saas-test')
const hash=`scrypt$${salt.toString('base64url')}$${scryptSync(password,salt,64).toString('base64url')}`
const legacy={admin:{email:'admin@example.test',name:'Admin preserved',passwordHash:hash},pages:{},analytics:{}}
await writeFile(file,JSON.stringify(legacy))
await writeFile(checkpoint,JSON.stringify({principal:'legacy-owner',ownerId:'legacy-owner',legacyPassword:createHash('sha256').update(hash).digest('hex'),users:[]}))
const base='http://localhost:4201';let child;let stderr=''
async function start(flag=true,environment='development'){
 stderr=''
 child=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,DATABASE_URL:target.href,DATA_FILE:file,STATIC_DIR:resolve('dist'),PORT:'4201',APP_ORIGINS:base,HUBPAGES_DEV_PUBLIC_ORIGIN:base,HUBPAGES_ENV:environment,HUBPAGES_PLATFORM_ENABLED:'true',HUBPAGES_CUSTOM_DOMAINS_ENABLED:'true',HUBPAGES_CUSTOMER_SIGNUP_ENABLED:'true',HUBPAGES_SESSION_SECRET:'local-only-saas-session-secret',HUBPAGES_SAAS_ADMIN_ENABLED:String(flag),HUBPAGES_SAAS_CHECKPOINT_PATH:checkpoint},stdio:['ignore','pipe','pipe']})
 child.stderr.on('data',d=>{stderr+=d.toString()})
 await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(new Error('Server did not start: '+stderr)),30000);child.stdout.once('data',()=>{clearTimeout(timer);done()});child.once('exit',code=>{clearTimeout(timer);reject(new Error('Server exit '+code+': '+stderr))})})
}
async function stop(){if(child?.exitCode===null)await new Promise(done=>{child.once('exit',done);child.kill()})}
const request=(path,method='GET',body,cookie='')=>fetch(base+path,{method,headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})
const cookieOf=r=>r.headers.get('set-cookie').split(';')[0]
try{
 await start(false)
 const login=await request('/api/platform/login','POST',{email:legacy.admin.email,password});assert.equal(login.status,200)
 const admin=cookieOf(login)
 assert.equal((await request('/api/saas/session','GET',undefined,admin)).status,404)
 await stop();await start()
 // Existing session issued before migration continues working unchanged.
 const session=await(await request('/api/saas/session','GET',undefined,admin)).json()
 assert.equal(session.role,'super_admin');assert.equal(session.subject,'legacy-owner')
 assert.equal((await request('/api/platform/pages','GET',undefined,admin)).status,200)
 assert.equal((await request('/api/saas/admin/dashboard')).status,401)
 const config=await(await request('/api/customer/config')).json()
 const registration=await request('/api/customer/register','POST',{name:'Customer isolation',email:'customer@example.test',password,acceptTerms:true,termsVersion:config.termsVersion,role:'super_admin',accountId:'legacy-owner'})
 assert.equal(registration.status,201);const customer=cookieOf(registration)
 const identity=await(await request('/api/saas/session','GET',undefined,customer)).json()
 assert.equal(identity.role,'customer');assert.deepEqual(identity.permissions,[])
 for(const path of ['dashboard','users','audit'])assert.equal((await request('/api/saas/admin/'+path,'GET',undefined,customer)).status,403)
 assert.equal((await request('/api/saas/admin/dashboard?role=super_admin','GET',undefined,customer)).status,403)
 assert.equal((await request('/api/saas/admin/roles','POST',{role:'super_admin'},customer)).status,404)
 assert.equal((await request('/api/saas/admin/users','POST',{},admin)).status,405)
 const users=await(await request('/api/saas/admin/users','GET',undefined,admin)).json()
 assert.equal(users.users.length,1);assert.equal(users.users[0].role,'customer');assert.equal(users.users[0].passwordHash,undefined)
 const dashboard=await(await request('/api/saas/admin/dashboard','GET',undefined,admin)).json()
 assert.equal(dashboard.customers,1);assert.equal(dashboard.financial.revenue,null);assert.equal(dashboard.infrastructure.vpsMetricsAvailable,false)
 const audit=await(await request('/api/saas/admin/audit','GET',undefined,admin)).json()
 assert.equal(audit.events.filter(e=>e.action==='role.bootstrap').length,1)
 assert.ok(audit.events.some(e=>e.action==='permission.denied'&&e.outcome==='denied'))
 assert.ok(!JSON.stringify(audit).includes(password));assert.ok(!JSON.stringify(audit).includes(hash))
 await assert.rejects(pool.query('UPDATE hubpages_saas_audit SET action=action'),/append-only/)
 await assert.rejects(pool.query('DELETE FROM hubpages_saas_audit'),/append-only/)
 await assert.rejects(pool.query('TRUNCATE hubpages_saas_audit'),/append-only/)
 const state=(await pool.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload
 assert.deepEqual(state,legacy)
 const count=(await pool.query('SELECT count(*)::int AS n FROM hubpages_saas_roles')).rows[0].n
 await stop();await start()
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_saas_roles')).rows[0].n,count)
 assert.equal((await pool.query("SELECT count(*)::int AS n FROM hubpages_saas_audit WHERE action='role.bootstrap'")).rows[0].n,1)
 assert.equal((await request('/api/saas/session','GET',undefined,admin)).status,200)
 await stop();await start(true,'production')
 assert.equal((await request('/api/saas/session','GET',undefined,admin)).status,404)
 console.log('PASS: real PostgreSQL RBAC, preexisting session/hash preservation, bootstrap idempotence, spoof/IDOR denial, immutable secret-free audit and production disabled')
}finally{await stop();await pool.end();await root.query(`DROP SCHEMA ${schema} CASCADE`);await root.end()}
