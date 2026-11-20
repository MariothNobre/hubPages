import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp,writeFile,readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'
import { randomUUID,scryptSync } from 'node:crypto'
import pg from 'pg'
import { trafficReport } from '../server/workspace-model.mjs'
let database=process.env.HUBPAGES_TEST_DATABASE_URL||''
// Each run creates its own schema in the disposable CI database; no existing schema is removed.
if(database){const url=new URL(database);if(url.pathname!=='/hubpages_ci')throw Error('Exclusive hubpages_ci test database required');const schema='workspace_test_'+randomUUID().replaceAll('-','');const pool=new pg.Pool({connectionString:database});try{await pool.query(`CREATE SCHEMA ${schema}`)}finally{await pool.end()}url.searchParams.set('options','-c search_path='+schema);database=url.toString()}
const directory=await mkdtemp(join(tmpdir(),'hubpages-workspace-')),file=join(directory,'content.json'),base='http://localhost:4198',password='LocalOnlyPassword123!',salt=Buffer.from('workspace-test')
const defaults=JSON.parse(await readFile('server/templates/legacy-defaults.json','utf8'))
const legacy={admin:{name:'Admin preservado',email:'admin@example.test',passwordHash:`scrypt$${salt.toString('base64url')}$${scryptSync(password,salt,64).toString('base64url')}`},pages:structuredClone(defaults),tracking:{infancia_alem_das_telas:{accessToken:'synthetic-local-only',testEventCode:'TEST1'}},analytics:{infancia_alem_das_telas:{visits:55},infancia_alem_das_telas_es:{visits:12}}}
legacy.pages.infancia_alem_das_telas.metaPixelId='123456789';legacy.pages.infancia_alem_das_telas.metaPixelEnabled=true
legacy.pages.infancia_alem_das_telas_es.published=false
await writeFile(file,JSON.stringify(legacy))
await writeFile(join(directory,'index.html'),'<!doctype html><html><body>Isolated Studio test shell</body></html>')
const env={...process.env,DATABASE_URL:database,DATA_FILE:file,STATIC_DIR:process.env.HUBPAGES_WORKSPACE_PREVIEW==='true'?resolve('dist'):directory,PORT:'4198',APP_ORIGINS:base,HUBPAGES_PLATFORM_ENABLED:'true',HUBPAGES_CUSTOMER_SIGNUP_ENABLED:'true',HUBPAGES_ENV:'development',HUBPAGES_DEV_FREE_PUBLISH_ENABLED:'true',HUBPAGES_STUDIO_UNIFIED_ENABLED:'true',HUBPAGES_DEV_PUBLIC_ORIGIN:base,HUBPAGES_ADMIN_EMAIL:legacy.admin.email,HUBPAGES_SESSION_SECRET:'workspace-local-test-key'}
let child,logs=''
async function start(){child=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',v=>logs+=v);child.stderr.on('data',v=>logs+=v);await new Promise((done,reject)=>{child.stdout.once('data',done);child.once('exit',code=>reject(Error('Server exit '+code+' '+logs)))})}
async function stop(){if(!child)return;await new Promise(done=>{child.once('exit',done);child.kill()});child=null}
const request=(path,method='GET',body,cookie='',referer)=>fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie,...(referer?{Referer:base+referer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})})
async function data(path,method,body,cookie){const r=await request(path,method,body,cookie);const d=await r.json();assert.equal(r.ok,true,JSON.stringify(d));return d}
const cookie=r=>r.headers.get('set-cookie').split(';')[0]
try{
  await start()
  const login=await request('/api/admin/login','POST',{email:legacy.admin.email,password}),admin=cookie(login);assert.equal(login.status,200)
  const list=await data('/api/platform/pages','GET',undefined,admin);assert.equal(list.pages.length,2);assert.deepEqual(list.legacyPages,[])
  let pt=list.pages.find(p=>p.legacySlug==='infancia_alem_das_telas'),es=list.pages.find(p=>p.legacySlug.endsWith('_es'))
  assert.equal(pt.visits,55);assert.equal(es.visits,12);assert.equal(pt.online,0);assert.ok(pt.coverUrl)
  pt=await data('/api/platform/pages/'+pt.id,'GET',undefined,admin);es=await data('/api/platform/pages/'+es.id,'GET',undefined,admin)
  assert.equal(es.editorialStatus,'draft','legacy unpublished state is preserved')
  assert.equal((await request('/api/public/resolve?url='+encodeURIComponent(base+'/infancia_alem_das_telas_es'))).status,404)
  es=await data('/api/platform/pages/'+es.id+'/publish','POST',{revision:es.revision},admin)
  assert.equal((await request('/infancia_alem_das_telas_es')).status,200,'native publication must not be blocked by stale unpublished legacy source')
  assert.equal(pt.draft.title,defaults.infancia_alem_das_telas.title);assert.equal(es.draft.template,'infancia_es');assert.equal(es.draft.priceLabel,'US$ 6.90')
  assert.equal((await data('/api/platform/pages/'+pt.id+'/tracking','GET',undefined,admin)).metaConversionsApiConfigured,true)
  assert.equal((await data('/api/platform/pages/'+es.id+'/tracking','GET',undefined,admin)).metaConversionsApiConfigured,true)
  assert.equal((await request('/api/admin/pages/infancia_alem_das_telas','PUT',{},admin)).status,409)
  assert.equal((await request('/api/resolve-page?url='+encodeURIComponent(base+'/infancia_alem_das_telas'))).status,404)
  const config=await data('/api/customer/config'),signup=await request('/api/customer/register','POST',{name:'Cliente',email:'workspace@example.test',password,acceptTerms:true,termsVersion:config.termsVersion}),customer=cookie(signup)
  assert.equal(signup.status,201);assert.equal((await request('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,customer)).status,404)
  await data('/api/platform/preferences','PUT',{listView:'list'},admin)
  assert.equal((await data('/api/platform/pages','GET',undefined,admin)).preferences.listView,'list');assert.equal((await data('/api/platform/preferences','GET',undefined,customer)).listView,'cards')
  const model=await data('/api/platform/pages','POST',{name:'Teste de progresso',template:'infancia_pt'},customer);assert.deepEqual(model.draft.visitedSteps,[])
  const visited=await data('/api/platform/pages/'+model.id,'PUT',{revision:model.revision,draft:{...model.draft,visitedSteps:[2,5]}},customer);assert.deepEqual(visited.draft.visitedSteps,[2,5])
  assert.equal((await data('/api/platform/pages/'+model.id,'GET',undefined,customer)).draft.visitedSteps[0],2)
  const pub=await data('/api/public/resolve?url='+encodeURIComponent(pt.publication.url)),visitorId=randomUUID(),tabId=randomUUID(),body={publicationId:pub.id,visitorId,tabId,url:pub.url,isNewVisit:true,active:true}
  const visit=async (patch={},referer='/infancia_alem_das_telas')=>request('/api/public/traffic','POST',{...body,...patch},'',referer)
  assert.equal((await visit({},'/admin')).status,403);assert.equal((await visit({},'/studio')).status,403);assert.equal((await visit()).status,202);assert.equal((await visit()).status,202)
  let report=await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin);assert.equal(report.total,56);assert.equal(report.online,1);assert.equal(report.measured,1);assert.equal(report.legacyTotal,55)
  await visit({tabId:randomUUID(),isNewVisit:false});assert.equal((await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin)).online,1)
  const body2={...body,visitorId:randomUUID(),tabId:randomUUID()};await request('/api/public/traffic','POST',body2,'','/infancia_alem_das_telas');report=await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin);assert.equal(report.total,57);assert.equal(report.online,2)
  await request('/api/public/traffic','POST',{...body2,active:false},'','/infancia_alem_das_telas');assert.equal((await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin)).online,1)
  const saved=await data('/api/platform/pages/'+pt.id,'PUT',{revision:pt.revision,draft:{...pt.draft,title:'Título preservado alterado',publicUrl:base+'/novo_endereco'}},admin)
  const publication=await data('/api/platform/pages/'+pt.id+'/publish','POST',{revision:saved.revision},admin);assert.ok(publication.publication)
  assert.equal((await request('/api/public/resolve?url='+encodeURIComponent(pub.url))).status,404);assert.equal((await visit()).status,404)
  assert.equal((await request('/api/resolve-page?url='+encodeURIComponent(pub.url))).status,404)
  assert.equal((await request('/api/platform/pages/'+pt.id+'/purge','POST',{revision:publication.revision,confirmation:'EXCLUIR'},admin)).status,409)
  const unpublished=await data('/api/platform/pages/'+pt.id+'/unpublish','POST',{revision:publication.revision},admin);assert.equal(unpublished.editorialStatus,'draft')
  assert.equal((await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin)).online,0)
  const trashed=await data('/api/platform/pages/'+pt.id,'DELETE',{revision:unpublished.revision},admin)
  assert.equal((await request('/api/platform/pages/'+pt.id+'/purge','POST',{revision:trashed.revision,confirmation:'EXCLUIR'},customer)).status,404)
  assert.equal((await request('/api/platform/pages/'+pt.id+'/purge','POST',{revision:trashed.revision,confirmation:'x'},admin)).status,409)
  if(database){const pool=new pg.Pool({connectionString:database});try{await assert.rejects(pool.query('DELETE FROM hubpages_studio_revisions WHERE page_id=$1',[pt.id]),/append-only/);await assert.rejects(pool.query('UPDATE hubpages_studio_publications SET draft=draft'),/append-only/)}finally{await pool.end()}}
  await data('/api/platform/pages/'+pt.id+'/purge','POST',{revision:trashed.revision,confirmation:'EXCLUIR'},admin)
  await stop();await start()
  const again=cookie(await request('/api/admin/login','POST',{email:legacy.admin.email,password}));const remaining=await data('/api/platform/pages','GET',undefined,again);assert.equal(remaining.pages.length,1);assert.equal(remaining.pages[0].id,es.id);assert.equal(remaining.preferences.listView,'list')
  assert.equal((await data('/api/platform/profile','GET',undefined,again)).email,legacy.admin.email)
  await data('/api/platform/logout','POST',undefined,again)
  const reportTest=trafficReport([{hour:'2026-11-20T03:00:00Z',visits:3},{hour:'2026-11-20T23:00:00Z',visits:7}],20,1,10,new Date('2026-11-21T01:00:00Z'));assert.equal(reportTest.hours[0].visits,3);assert.equal(reportTest.hours[20].visits,7);assert.deepEqual(reportTest.peakHours,[20])
  console.log('PASS: DEV adoption PT/ES, credentials, metrics/dedup/presence, owner isolation, preferences, visited steps, address retirement, unpublish, scoped permanent deletion and restart tombstones ('+(database?'PostgreSQL':'file')+')')
}catch(error){console.error(logs);throw error}finally{if(process.env.HUBPAGES_WORKSPACE_PREVIEW==='true')console.log('Local isolated workspace: '+base+'/admin — admin@example.test / '+password);else await stop()}
