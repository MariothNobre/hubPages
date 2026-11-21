import { request as httpRequest } from 'node:http'
import { pendingChanges,reviewSignature } from '../shared/studio-wizard.mjs'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp,writeFile,readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join,resolve } from 'node:path'
import { randomUUID,scryptSync } from 'node:crypto'
import pg from 'pg'
import { trafficReport } from '../server/workspace-model.mjs'
const production=process.env.HUBPAGES_TEST_PRODUCTION==='true'
let database=process.env.HUBPAGES_TEST_DATABASE_URL||''
// Each run creates its own schema in the disposable CI database; no existing schema is removed.
if(database){const url=new URL(database);if(url.pathname!=='/hubpages_ci')throw Error('Exclusive hubpages_ci test database required');const schema='workspace_test_'+randomUUID().replaceAll('-','');const pool=new pg.Pool({connectionString:database});try{await pool.query(`CREATE SCHEMA ${schema}`)}finally{await pool.end()}url.searchParams.set('options','-c search_path='+schema);database=url.toString()}
const directory=await mkdtemp(join(tmpdir(),'hubpages-workspace-')),file=join(directory,'content.json'),base='http://localhost:4198',password='LocalOnlyPassword123!',salt=Buffer.from('workspace-test')
const origin=production?'https://hubpages.com.br':base
const defaults=JSON.parse(await readFile('server/templates/legacy-defaults.json','utf8'))
const legacy={admin:{name:'Admin preservado',email:'admin@example.test',passwordHash:`scrypt$${salt.toString('base64url')}$${scryptSync(password,salt,64).toString('base64url')}`},pages:structuredClone(defaults),tracking:{infancia_alem_das_telas:{accessToken:'synthetic-local-only',testEventCode:'TEST1'}},analytics:{infancia_alem_das_telas:{visits:55},infancia_alem_das_telas_es:{visits:12}}}
legacy.pages.infancia_alem_das_telas.metaPixelId='123456789';legacy.pages.infancia_alem_das_telas.metaPixelEnabled=true
legacy.pages.infancia_alem_das_telas_es.published=false
await writeFile(file,JSON.stringify(legacy))
await writeFile(join(directory,'index.html'),'<!doctype html><html><body>Isolated Studio test shell</body></html>')
const env={...process.env,DATABASE_URL:database,DATA_FILE:file,STATIC_DIR:process.env.HUBPAGES_WORKSPACE_PREVIEW==='true'?resolve('dist'):directory,PORT:'4198',APP_ORIGINS:origin,HUBPAGES_PLATFORM_ENABLED:'true',HUBPAGES_CUSTOMER_SIGNUP_ENABLED:'true',HUBPAGES_ENV:production?'production':'development',HUBPAGES_DEV_FREE_PUBLISH_ENABLED:production?'false':'true',HUBPAGES_FREE_PUBLISH_ENABLED:production?'true':'false',HUBPAGES_PUBLIC_ORIGIN:origin,HUBPAGES_STUDIO_UNIFIED_ENABLED:'true',HUBPAGES_DEV_PUBLIC_ORIGIN:base,HUBPAGES_ADMIN_EMAIL:legacy.admin.email,HUBPAGES_SESSION_SECRET:'workspace-local-test-key'}
let child,logs=''
async function start(){child=spawn(process.execPath,['server/index.mjs'],{env,stdio:['ignore','pipe','pipe']});child.stdout.on('data',v=>logs+=v);child.stderr.on('data',v=>logs+=v);await new Promise((done,reject)=>{child.stdout.once('data',done);child.once('exit',code=>reject(Error('Server exit '+code+' '+logs)))})}
async function stop(){if(!child)return;await new Promise(done=>{child.once('exit',done);child.kill()});child=null}
const request=(path,method='GET',body,cookie='',referer)=>{const headers={Origin:origin,'Content-Type':'application/json',Cookie:cookie,Host:new URL(origin).host,...(referer?{Referer:origin+referer}:{})};if(!production)return fetch(base+path,{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});return new Promise((done,reject)=>{const req=httpRequest(base+path,{method,headers:{...headers,...(body===undefined?{}:{'Content-Length':Buffer.byteLength(JSON.stringify(body))})}},response=>{const chunks=[];response.on('data',v=>chunks.push(v));response.on('end',()=>{const h=new Headers();for(const[k,v]of Object.entries(response.headers))for(const item of Array.isArray(v)?v:[v])if(item!==undefined)h.append(k,item);done(new Response(response.statusCode===204?null:Buffer.concat(chunks),{status:response.statusCode,headers:h}))})});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body))})}
async function data(path,method,body,cookie){if(method==='POST'&&path.endsWith('/publish')){const root=path.slice(0,-8),page=await data(root,'GET',undefined,cookie),context=await data(root+'/publication-review','GET',undefined,cookie),draft={...page.draft,visitedSteps:[...new Set([...(page.draft.visitedSteps||[]),7])],reviewedSignature:reviewSignature(page.draft,context.assetVersion)},saved=await data(root,'PUT',{revision:page.revision,draft},cookie);body={revision:saved.revision}}const r=await request(path,method,body,cookie);const raw=await r.text();let d;try{d=JSON.parse(raw)}catch{throw Error('Invalid test response '+path+' '+r.status+' '+raw.slice(0,80))}assert.equal(r.ok,true,JSON.stringify(d));return d}
const cookie=r=>r.headers.get('set-cookie').split(';')[0]
try{
  await start()
  if(production&&database){await new Promise((done,reject)=>{const check=spawn(process.execPath,['server/verify-production-studio.mjs'],{env,stdio:['ignore','pipe','pipe']});let output='';check.stdout.on('data',v=>output+=v);check.stderr.on('data',v=>output+=v);check.on('exit',code=>code?reject(Error(output)):(console.log(output.trim()),done()))})}
  const login=await request('/api/admin/login','POST',{email:legacy.admin.email,password}),admin=cookie(login);assert.equal(login.status,200)
  const list=await data('/api/platform/pages','GET',undefined,admin);assert.equal(list.pages.length,2);assert.deepEqual(list.legacyPages,[])
  let pt=list.pages.find(p=>p.legacySlug==='infancia_alem_das_telas'),es=list.pages.find(p=>p.legacySlug.endsWith('_es'))
  assert.equal(pt.visits,55);assert.equal(es.visits,12);assert.equal(pt.online,0);assert.ok(pt.coverUrl)
  pt=await data('/api/platform/pages/'+pt.id,'GET',undefined,admin);es=await data('/api/platform/pages/'+es.id,'GET',undefined,admin)
  assert.equal(list.billing.environment,production?'production':'development');assert.equal(list.billing.publicOrigin,origin)
  assert.equal(es.editorialStatus,'draft','legacy unpublished state is preserved')
  assert.equal((await request('/api/public/resolve?url='+encodeURIComponent(origin+'/infancia_alem_das_telas_es'))).status,404)
  es=await data('/api/platform/pages/'+es.id+'/publish','POST',{revision:es.revision},admin)
  assert.equal(es.publication.mode,production?'temporary-free':'dev-free')
  const publicHeaders=await request('/infancia_alem_das_telas_es');assert.equal(Boolean(publicHeaders.headers.get('x-robots-tag')), !production);assert.ok(publicHeaders.headers.get('content-security-policy').includes("media-src 'self' https:"))
  assert.equal((await request('/infancia_alem_das_telas_es')).status,200,'native publication must not be blocked by stale unpublished legacy source')
  assert.equal(pt.draft.title,defaults.infancia_alem_das_telas.title);assert.equal(es.draft.template,'infancia_es');assert.equal(es.draft.priceLabel,'US$ 6.90')
  assert.equal((await data('/api/platform/pages/'+pt.id+'/tracking','GET',undefined,admin)).metaConversionsApiConfigured,true)
  assert.equal((await data('/api/platform/pages/'+es.id+'/tracking','GET',undefined,admin)).metaConversionsApiConfigured,true)
  assert.equal((await request('/api/admin/pages/infancia_alem_das_telas','PUT',{},admin)).status,409)
  assert.equal((await request('/api/resolve-page?url='+encodeURIComponent(origin+'/infancia_alem_das_telas'))).status,404)
  const config=await data('/api/customer/config'),signup=await request('/api/customer/register','POST',{name:'Cliente',email:'workspace@example.test',password,acceptTerms:true,termsVersion:config.termsVersion}),customer=cookie(signup)
  assert.equal(signup.status,201);assert.equal((await request('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,customer)).status,404)
  await data('/api/platform/preferences','PUT',{listView:'list'},admin)
  assert.equal((await data('/api/platform/pages','GET',undefined,admin)).preferences.listView,'list');assert.equal((await data('/api/platform/preferences','GET',undefined,customer)).listView,'cards')
  const catalog=await data('/api/platform/templates','GET',undefined,customer);assert.equal(catalog.templates[0].name,'Aurora')
  let themed=await data('/api/platform/pages','POST',{name:'Aurora personalizada',template:'infancia_pt',colorTheme:'oceano'},customer)
  const themeRoot='/api/platform/pages/'+themed.id,themeTitle='Conteúdo do cliente preservado'
  assert.equal(themed.draft.colorTheme,'oceano')
  assert.equal((await request(themeRoot,'PUT',{revision:themed.revision,draft:{...themed.draft,colorTheme:'arbitrary-css'}},customer)).status,422)
  themed=await data(themeRoot,'PUT',{revision:themed.revision,draft:{...themed.draft,title:themeTitle,checkoutUrl:'https://pay.example.test/aurora',publicUrl:origin+'/aurora_theme',colorTheme:'lavanda'}},customer)
  assert.equal((await data(themeRoot,'GET',undefined,customer)).draft.colorTheme,'lavanda')
  const themedPublication=await data(themeRoot+'/publish','POST',{revision:themed.revision},customer)
  let liveTheme=await data('/api/public/resolve?url='+encodeURIComponent(origin+'/aurora_theme'));assert.equal(liveTheme.draft.colorTheme,'lavanda');assert.equal(liveTheme.draft.title,themeTitle)
  themed=await data(themeRoot,'GET',undefined,customer)
  themed=await data(themeRoot,'PUT',{revision:themed.revision,draft:{...themed.draft,colorTheme:'rose'}},customer)
  assert.ok(pendingChanges(themed.draft,liveTheme.draft).some(change=>change.id==='colorTheme'))
  assert.equal((await data('/api/public/resolve?url='+encodeURIComponent(origin+'/aurora_theme'))).draft.colorTheme,'lavanda','palette changes stay in draft until republished')
  const themeCopy=await data(themeRoot+'/duplicate','POST',undefined,customer);assert.equal(themeCopy.draft.colorTheme,'rose');assert.equal(themeCopy.draft.title,themeTitle)
  themed=await data(themeRoot+'/publish','POST',{revision:themed.revision},customer)
  liveTheme=await data('/api/public/resolve?url='+encodeURIComponent(origin+'/aurora_theme'));assert.equal(liveTheme.draft.colorTheme,'rose');assert.equal(liveTheme.draft.title,themeTitle)
  assert.ok(themedPublication.publication)
  console.log('PASS: Aurora theme creation, validation, persistence, content preservation, draft/publication isolation and duplication')
  const model=await data('/api/platform/pages','POST',{name:'Teste de progresso',template:'infancia_pt'},customer);assert.deepEqual(model.draft.visitedSteps,[])
  const visited=await data('/api/platform/pages/'+model.id,'PUT',{revision:model.revision,draft:{...model.draft,visitedSteps:[2,5]}},customer);assert.deepEqual(visited.draft.visitedSteps,[2,5])
  assert.equal((await data('/api/platform/pages/'+model.id,'GET',undefined,customer)).draft.visitedSteps[0],2)
  const galleryId=randomUUID(),mediaRoot='/api/platform/pages/'+model.id,mediaPath=mediaRoot+'/images/'+galleryId
  let mediaPage=await data(mediaRoot,'PUT',{revision:visited.revision,draft:{...visited.draft,checkoutUrl:'https://pay.example.test/buy',publicUrl:origin+'/media_test',sectionCounts:{method:3,manual:2,bonus:2,sample:4},sampleEnabled:false,offerGallery:[{id:galleryId,imageUrl:'',title:'Vídeo de teste',mediaType:'video'}],blocks:visited.draft.blocks.map(b=>b.kind==='author'?{...b,enabled:false}:b.kind==='sample'?{...b,sampleSource:'Origem editada',sampleKicker:'Chamada editada',title:'Título editado',body:'Descrição editada'}:b),templateButtons:{sampleHero:{enabled:false},sampleSolution:{enabled:true}}}},customer)
  assert.deepEqual(mediaPage.draft.sectionCounts,{method:3,manual:2,bonus:2,sample:4});assert.equal(mediaPage.draft.sampleEnabled,false);assert.equal(mediaPage.draft.blocks.find(b=>b.kind==='sample').sampleSource,'Origem editada')
  const video=Buffer.from([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0]),png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')
  const uploadMedia=bytes=>fetch(base+mediaPath,{method:'PUT',headers:{Origin:origin,Cookie:customer,'Content-Type':'application/octet-stream'},body:bytes})
  assert.equal((await uploadMedia(Buffer.from('<svg/>'))).status,422)
  assert.equal((await uploadMedia(video)).status,200)
  assert.equal((await request(mediaPath,'GET',undefined,admin)).status,404)
  const part=await fetch(base+mediaPath,{headers:{Cookie:customer,Range:'bytes=4-7'}});assert.equal(part.status,206);assert.equal(await part.text(),'ftyp');assert.equal(part.headers.get('content-type'),'video/mp4')
  assert.equal((await fetch(base+mediaPath,{headers:{Cookie:customer,Range:'bytes=200-300'}})).status,416)
  mediaPage=await data(mediaRoot,'PUT',{revision:mediaPage.revision,draft:{...mediaPage.draft,offerGallery:[{id:galleryId,imageUrl:mediaPath,mediaType:'video',title:'Vídeo de teste'}]}},customer)
  const mediaCopy=await data(mediaRoot+'/duplicate','POST',undefined,customer);assert.equal(mediaCopy.draft.offerGallery[0].imageUrl,`/api/platform/pages/${mediaCopy.id}/images/${galleryId}`);assert.equal((await request(mediaCopy.draft.offerGallery[0].imageUrl,'GET',undefined,customer)).status,200)
  const missingReview=await request(mediaRoot+'/publish','POST',{revision:mediaPage.revision},customer);assert.equal(missingReview.status,422);assert.match((await missingReview.json()).message,/Revisão/)
  mediaPage=await data(mediaRoot+'/publish','POST',{revision:mediaPage.revision},customer)
  const cleanReview=await data(mediaRoot+'/publication-review','GET',undefined,customer);assert.equal(pendingChanges(mediaPage.draft,cleanReview.publishedDraft,cleanReview.changedImageSlots).length,0,'all publication notifications clear after publish')
  const mediaLive=await data('/api/public/resolve?url='+encodeURIComponent(origin+'/media_test')),oldMedia=mediaLive.draft.offerGallery[0].imageUrl
  assert.match(oldMedia,/\/api\/public\/publications\//);assert.equal((await request(oldMedia)).headers.get('content-type'),'video/mp4')
  assert.equal((await uploadMedia(png)).status,200);assert.equal((await request(oldMedia)).headers.get('content-type'),'video/mp4','draft replacement must not change the current publication')
  assert.equal((await request(mediaRoot+'/publish','POST',{revision:mediaPage.revision},customer)).status,422,'replacing a binary invalidates the reviewed publication')
  const binaryReview=await data(mediaRoot+'/publication-review','GET',undefined,customer);assert.ok(binaryReview.changedImageSlots.includes(galleryId))
  mediaPage=await data(mediaRoot,'PUT',{revision:mediaPage.revision,draft:{...mediaPage.draft,offerGallery:[{id:galleryId,imageUrl:mediaPath,mediaType:'image',title:'Foto de teste'}]}},customer)
  mediaPage=await data(mediaRoot+'/publish','POST',{revision:mediaPage.revision},customer)
  assert.equal((await request(oldMedia)).status,404,'no historical binary library after republishing')
  if(database){const pool=new pg.Pool({connectionString:database});try{assert.equal(Number((await pool.query('SELECT count(*) FROM hubpages_studio_publication_images i JOIN hubpages_studio_publications p ON p.id=i.publication_id WHERE p.page_id=$1',[mediaPage.id])).rows[0].count),1,'only current publication binary remains on disk')}finally{await pool.end()}}
  const newMedia=(await data('/api/public/resolve?url='+encodeURIComponent(origin+'/media_test'))).draft.offerGallery[0].imageUrl;assert.deepEqual(Buffer.from(await(await request(newMedia)).arrayBuffer()),png)
  mediaPage=await data(mediaRoot,'PUT',{revision:mediaPage.revision,draft:{...mediaPage.draft,offerGallery:[]}},customer);assert.equal((await request(mediaPath,'GET',undefined,customer)).status,404)
  await data(mediaRoot+'/publish','POST',{revision:mediaPage.revision},customer);assert.equal((await request(newMedia)).status,404)
  const prefs=await data('/api/platform/preferences','PUT',{guideOpen:false},customer);assert.equal(prefs.guideOpen,false);await data('/api/platform/preferences','PUT',{listView:'list'},customer);assert.deepEqual(await data('/api/platform/preferences','GET',undefined,customer),{listView:'list',guideOpen:false})
  const randomPages=await Promise.all([data('/api/platform/pages','POST',{name:'Minha nova página',template:'infancia_pt'},customer),data('/api/platform/pages','POST',{name:'Minha nova página',template:'infancia_pt'},customer)]);for(const p of randomPages)assert.match(p.draft.publicUrl,/\/minha_nova_pagina_\d{3,6}$/);assert.notEqual(randomPages[0].draft.publicUrl,randomPages[1].draft.publicUrl)
  console.log('PASS: editor configuration persistence, gallery ownership/duplication, video MIME/ranges, atomic replacement and obsolete media cleanup')
  const pub=await data('/api/public/resolve?url='+encodeURIComponent(pt.publication.url)),visitorId=randomUUID(),tabId=randomUUID(),body={publicationId:pub.id,visitorId,tabId,viewId:randomUUID(),sequence:1,url:pub.url,isNewVisit:true,active:true}
  const visit=async (patch={},referer='/infancia_alem_das_telas')=>request('/api/public/traffic','POST',{...body,...patch},'',referer)
  assert.equal((await visit({},'/admin')).status,403);assert.equal((await visit({},'/studio')).status,403);assert.equal((await visit()).status,202);assert.equal((await visit()).status,202)
  let report=await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin);assert.equal(report.total,56);assert.equal(report.online,1);assert.equal(report.measured,1);assert.equal(report.legacyTotal,55)
  const repeated=await Promise.all(Array.from({length:3},()=>visit({viewId:randomUUID()})));assert.ok(repeated.every(r=>r.status===202))
  report=await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin);assert.equal(report.total,59,'every repeated access counts, including concurrent refreshes by the same visitor');assert.equal(report.online,1);assert.equal(report.measured,4)
  const extraTabId=randomUUID()
  await visit({tabId:extraTabId,isNewVisit:false});assert.equal((await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin)).online,1)
  const body2={...body,visitorId:randomUUID(),tabId:randomUUID(),viewId:randomUUID()};await request('/api/public/traffic','POST',body2,'','/infancia_alem_das_telas');report=await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin);assert.equal(report.total,60);assert.equal(report.online,2)
  await request('/api/public/traffic','POST',{...body2,sequence:3,isNewVisit:false,active:false},'','/infancia_alem_das_telas')
  await request('/api/public/traffic','POST',{...body2,sequence:2,isNewVisit:false,active:true},'','/infancia_alem_das_telas')
  assert.equal((await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin)).online,1,'late heartbeat cannot revive a closed tab')
  const third={...body,visitorId:randomUUID(),tabId:randomUUID(),viewId:randomUUID(),isNewVisit:false}
  await request('/api/public/traffic','POST',third,'','/infancia_alem_das_telas')
  assert.equal((await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin)).online,2)
  if(database){const pool=new pg.Pool({connectionString:database});try{await pool.query("UPDATE hubpages_studio_presence SET last_seen=now()-interval '91 seconds' WHERE page_id=$1 AND tab_id=$2",[pt.id,third.tabId])}finally{await pool.end()}}
  else{const state=JSON.parse(await readFile(file,'utf8'));for(const[key,presence]of Object.entries(state.workspace.presence[pt.id]))if(key.endsWith(':'+third.tabId))presence.at=Date.now()-91000;await writeFile(file,JSON.stringify(state))}
  assert.equal((await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin)).online,1,'abandoned presence expires')
  await visit({sequence:10,isNewVisit:false,active:false});await visit({tabId:extraTabId,sequence:10,isNewVisit:false,active:false})
  assert.equal((await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin)).online,0)
  await visit({sequence:11,isNewVisit:false});report=await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin);assert.equal(report.online,1);assert.equal(report.total,60,'presence changes do not inflate accesses')
  assert.equal((await visit({viewId:'invalid'})).status,422);assert.equal((await visit({sequence:-1})).status,422)
  for(let i=0;i<2;i++)assert.equal((await request('/api/analytics/visit','POST',{pageSlug:'infancia_alem_das_telas',visitorId,isNewVisit:true},'','/infancia_alem_das_telas')).status,202)
  report=await data('/api/platform/pages/'+pt.id+'/metrics','GET',undefined,admin);assert.equal(report.total,62,'old clients also count repeated accesses')
  assert.equal((await data('/api/platform/metrics','GET',undefined,admin)).metrics[pt.id].visits,62)
  const saved=await data('/api/platform/pages/'+pt.id,'PUT',{revision:pt.revision,draft:{...pt.draft,title:'Título preservado alterado',publicUrl:origin+'/novo_endereco'}},admin)
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
  assert.equal((await request('/api/platform/pages','GET',undefined,again)).status,401,'logged out admin cookie is revoked');await stop();await start();assert.equal((await request('/api/platform/pages','GET',undefined,again)).status,401,'logout revocation survives restart')
  const reportTest=trafficReport([{hour:'2026-11-20T03:00:00Z',visits:3},{hour:'2026-11-20T23:00:00Z',visits:7}],20,1,10,new Date('2026-11-21T01:00:00Z'));assert.equal(reportTest.hours[0].visits,3);assert.equal(reportTest.hours[20].visits,7);assert.deepEqual(reportTest.peakHours,[20])
  console.log('PASS: '+(production?'production':'DEV')+' adoption PT/ES, credentials, metrics/dedup/presence, owner isolation, preferences, visited steps, address retirement, unpublish, scoped permanent deletion and restart tombstones ('+(database?'PostgreSQL':'file')+')')
}catch(error){console.error(logs);throw error}finally{if(process.env.HUBPAGES_WORKSPACE_PREVIEW==='true')console.log('Local isolated workspace: '+base+'/admin — admin@example.test / '+password);else await stop()}
