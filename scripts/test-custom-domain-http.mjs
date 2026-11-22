import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {request as httpRequest} from 'node:http'
import {mkdtemp,writeFile,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {randomUUID,scryptSync} from 'node:crypto'
import {reviewSignature} from '../shared/studio-wizard.mjs'
const directory=await mkdtemp(join(tmpdir(),'hubpages-domains-http-')),file=join(directory,'content.json'),origin='http://localhost:4206',hostname='oferta.dominio.com.br',customOrigin='https://'+hostname,password='LocalDomainTestOnly123!',salt=Buffer.from('domain-test')
await writeFile(file,JSON.stringify({admin:{name:'Teste local',email:'domain@example.test',passwordHash:`scrypt$${salt.toString('base64url')}$${scryptSync(password,salt,64).toString('base64url')}`},pages:{}}))
await writeFile(join(directory,'index.html'),'<html>Isolated domain test shell</html>')
const dnsFixture=join(directory,'dns-fixture.mjs');await writeFile(dnsFixture,"import {Resolver} from 'node:dns/promises';Resolver.prototype.resolveNs=async name=>{if(name==='sistera.com.br')return ['ns1.example.test'];throw Object.assign(Error(),{code:'ENODATA'})}")
let child,logs='',cookie=''
async function start(production=false,enabled=true){child=spawn(process.execPath,['--import',pathToFileURL(dnsFixture).href,'server/index.mjs'],{env:{...process.env,DATABASE_URL:'',DATA_FILE:file,STATIC_DIR:directory,PORT:'4206',HUBPAGES_PLATFORM_ENABLED:'true',HUBPAGES_ADMIN_EMAIL:'domain@example.test',HUBPAGES_ENV:production?'production':'development',HUBPAGES_STUDIO_UNIFIED_ENABLED:'true',HUBPAGES_CUSTOM_DOMAINS_ENABLED:enabled?'true':'false',HUBPAGES_DEV_FREE_PUBLISH_ENABLED:'true',HUBPAGES_SESSION_SECRET:'local-domain-test-secret',APP_ORIGINS:production?'https://hubpages.com.br':origin,...(production?{HUBPAGES_PUBLIC_ORIGIN:'https://hubpages.com.br'}:{HUBPAGES_PUBLIC_ORIGIN:origin})},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);await new Promise((done,reject)=>{child.stdout.once('data',done);child.once('exit',()=>reject(Error(logs)))})}
async function stop(){if(child&&child.exitCode===null){await new Promise(done=>{child.once('exit',done);child.kill()});child=null}}
const request=(path,method='GET',body,host=new URL(origin).host,headers={})=>new Promise((done,reject)=>{const data=body===undefined?undefined:JSON.stringify(body),req=httpRequest(origin+path,{method,headers:{Host:host,Origin:host===hostname?customOrigin:origin,Cookie:cookie,'Content-Type':'application/json',...(data?{'Content-Length':Buffer.byteLength(data)}:{}),...headers}},response=>{const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>done({status:response.statusCode,headers:response.headers,text:Buffer.concat(chunks).toString()}))});req.on('error',reject);req.end(data)})
async function data(path,method='GET',body,host,headers){const r=await request(path,method,body,host,headers);assert.ok(r.status<300,r.text);return JSON.parse(r.text)}
try{
 await start()
 const login=await request('/api/admin/login','POST',{email:'domain@example.test',password});assert.equal(login.status,200);cookie=login.headers['set-cookie'][0].split(';')[0]
 assert.equal((await data('/api/customer/config')).features.customDomains,true);assert.deepEqual((await data('/api/customer/config')).domainPolicy,{requiresConnectedParent:false,individualDnsProof:true})
 let page=await data('/api/platform/pages','POST',{name:'Fixture domínio',title:'Conteúdo publicado',checkoutUrl:'https://pay.example.test/test',publicUrl:origin+'/dominio_fixture',blocks:[]})
 const root='/api/platform/pages/'+page.id
 assert.equal((await request(root+'/domains')).status,200)
 assert.equal((await request(root+'/domains','POST',{hostname:'https://dominio.com.br/path'})).status,422)
 const pendingDomain=await data(root+'/domains','POST',{hostname:'infancia.sistera.com.br',provider:'hostgator'});assert.equal(pendingDomain.verified,false);assert.equal(pendingDomain.enabled,false);assert.equal(pendingDomain.records[0].name,'_hubpages.infancia.sistera.com.br');assert.equal((await request(root+'/domains/'+pendingDomain.id+'/activate','POST')).status,422,'preparing an address is not proof of ownership');assert.equal((await request(root+'/domains','POST',{hostname:'app.sistera.com.br'})).status,422)
 await data(root+'/domains/'+pendingDomain.id+'/cancel','POST');assert.ok(!(await data(root+'/domains')).domains.some(d=>d.id===pendingDomain.id));assert.equal((await request(root+'/domains/'+pendingDomain.id+'/check','POST')).status,409);const restarted=await data(root+'/domains','POST',{hostname:'infancia.sistera.com.br',provider:'hostgator'});assert.notEqual(restarted.records[0].value,pendingDomain.records[0].value,'restart requires a new DNS proof');
 const review=await data(root+'/publication-review');page=await data(root,'PUT',{revision:page.revision,draft:{...page.draft,visitedSteps:[7],reviewedSignature:reviewSignature(page.draft,review.assetVersion)}})
 page=await data(root+'/publish','POST',{revision:page.revision})
 const claim={id:randomUUID(),ownerId:'legacy-owner',pageId:page.id,hostname,zone:'dominio.com.br',provider:'outro',token:'local-test-only',verified:true,enabled:true,tls:true,readyUntil:new Date(Date.now()+86400000).toISOString(),dns:{ownership:true,pointing:true,ready:true,checkedAt:new Date().toISOString()}}
 async function seed(change={}){const state=JSON.parse(await readFile(file,'utf8'));state.customDomains=[{...claim,...change}];await writeFile(file,JSON.stringify(state))}
 await seed()
 const cards=await data('/api/platform/pages');assert.deepEqual(cards.pages.find(p=>p.id===page.id).customDomains,[{id:claim.id,hostname,url:customOrigin}]);assert.ok(!JSON.stringify(cards.pages).includes('local-test-only'),'no domain proof tokens in page summaries')
 const pub=await data('/api/public/resolve?url='+encodeURIComponent(customOrigin+'/'),'GET',undefined,hostname);assert.equal(pub.id,page.publication.id);assert.equal(pub.draft.title,'Conteúdo publicado');assert.equal(pub.url,customOrigin)
 assert.equal((await request('/','GET',undefined,hostname)).status,200);assert.equal((await request(root+'/domains/'+claim.id+'/cancel','POST')).status,409,'active domains use explicit disconnection instead')
 for(const path of ['/studio','/entrar','/api/customer/config','/api/platform/pages'])assert.equal((await request(path,'GET',undefined,hostname)).status,404,'no private routes on customer domains')
 assert.equal((await request('/','GET',undefined,'unclaimed.dominio.com.br')).status,404)
 assert.equal((await request('/api/domains/tls?domain='+hostname)).status,200)
 assert.equal((await request('/api/domains/tls?domain=unclaimed.dominio.com.br')).status,403)
 const id=randomUUID(),body={publicationId:pub.id,visitorId:id,tabId:randomUUID(),viewId:randomUUID(),sequence:1,url:customOrigin+'/',isNewVisit:true,active:true}
 assert.equal((await request('/api/public/traffic','POST',body,hostname,{Referer:customOrigin+'/'})).status,202)
 assert.equal((await request('/api/public/traffic','POST',{...body,viewId:randomUUID()},hostname,{Referer:customOrigin+'/'})).status,202)
 const report=await data(root+'/metrics');assert.equal(report.total,2);assert.equal(report.online,1,'aliases use the same page metrics, counting each access')
 assert.equal((await request('/api/public/traffic','POST',{...body,publicationId:randomUUID()},hostname,{Referer:customOrigin+'/'})).status,403)
 assert.equal((await request('/api/public/traffic','POST',body,hostname,{Referer:customOrigin+'/studio'})).status,403)
 const event={publicationId:pub.id,eventId:randomUUID(),eventSourceUrl:customOrigin+'/'}
 assert.equal((await request('/api/public/meta/events','POST',event,hostname)).status,200)
 assert.equal((await request('/api/public/meta/events','POST',{...event,publicationId:randomUUID()},hostname)).status,403)
 await data(root+'/domains/'+claim.id+'/disconnect','POST');assert.deepEqual((await data('/api/platform/pages')).pages.find(p=>p.id===page.id).customDomains,[]);assert.equal((await request('/api/public/resolve?url='+encodeURIComponent(customOrigin+'/'),'GET',undefined,hostname)).status,404)
 assert.equal((await data('/api/public/resolve?url='+encodeURIComponent(page.publication.url))).id,pub.id,'disconnect preserves the native publication')
 await seed({enabled:false,tls:false});assert.equal((await request('/.well-known/hubpages-connection','GET',undefined,hostname)).status,200);assert.equal((await request('/','GET',undefined,hostname)).status,404)
 await seed({readyUntil:'2000-01-01T00:00:00Z'});assert.equal((await request('/api/domains/tls?domain='+hostname)).status,403)
 await seed();page=await data(root+'/unpublish','POST',{revision:page.revision});assert.equal((await request('/api/public/resolve?url='+encodeURIComponent(customOrigin+'/'),'GET',undefined,hostname)).status,404)
 await stop();await start(true)
 const prodDomain=await data(root+'/domains','POST',{hostname:'infancia.sistera.com.br',provider:'hostgator'},'hubpages.com.br',{Origin:'https://hubpages.com.br'});assert.equal(prodDomain.verified,false);assert.equal(prodDomain.enabled,false);assert.equal(prodDomain.records[1].name,'infancia.sistera.com.br','production accepts the hostname without a previously connected parent');await data(root+'/domains/'+prodDomain.id+'/cancel','POST',undefined,'hubpages.com.br',{Origin:'https://hubpages.com.br'});assert.ok(!(await data(root+'/domains','GET',undefined,'hubpages.com.br')).domains.some(d=>d.id===prodDomain.id));
 const config=await data('/api/customer/config','GET',undefined,'hubpages.com.br');assert.equal(config.features.customDomains,true,'production explicitly enables domains after promotion');assert.deepEqual(config.domainPolicy,{requiresConnectedParent:false,individualDnsProof:true})
 assert.equal((await request('/api/domains/tls?domain='+hostname,'GET',undefined,'hubpages.com.br')).status,200);assert.equal((await request('/api/domains/route?domain='+hostname,'GET',undefined,'hubpages.com.br')).headers['x-hubpages-upstream'],'hubpages-prod:8080');assert.equal((await request('/api/domains/tls?domain=unknown.example.com','GET',undefined,'hubpages.com.br')).status,403)
 await stop();await start(true,false);assert.equal((await data('/api/customer/config','GET',undefined,'hubpages.com.br')).features.customDomains,false);assert.equal((await request('/api/domains/tls?domain='+hostname,'GET',undefined,'hubpages.com.br')).status,403)
 console.log('PASS: custom-host publication, private-route isolation, TLS proof/admission, traffic/Meta page binding, disconnect/unpublish/expiry and production gate')
}catch(error){console.error(logs);throw error}finally{await stop()}
