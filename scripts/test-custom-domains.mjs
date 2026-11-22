import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {domainName,dnsRecords,checkDomainDns,domainZone,dnsProvider} from '../server/custom-domain-dns.mjs'
import {createDomainStore} from '../server/custom-domain-store.mjs'
import {customDomainService} from '../server/custom-domains.mjs'
import {createPlatformStore} from '../server/platform-store.mjs'
const origin='https://dev.hubpages.com.br',ipv4='179.199.148.219',ownerA=randomUUID(),ownerB=randomUUID()
assert.equal(domainName(' https://OFERTA.Exemplo.com.br/ '),'oferta.exemplo.com.br')
assert.equal(domainName('ação.com.br'),'xn--ao-siap.com.br')
for(const name of ['http://exemplo.com.br','https://exemplo.com.br/admin','127.0.0.1','localhost','site.local','exemplo.com.br:8080','*.exemplo.com.br','app.sistera.com.br','dev.hubpages.com.br','exemplo.com.br?token=x','user@exemplo.com.br'])assert.throws(()=>domainName(name))
assert.equal(domainName('teste.sistera.com.br',{allowedReserved:['teste.sistera.com.br']}),'teste.sistera.com.br')
assert.throws(()=>domainName('app.sistera.com.br',{allowedReserved:['teste.sistera.com.br']}))
assert.equal(domainName('site.sistera.com.br',{allowedReserved:['site.sistera.com.br']}),'site.sistera.com.br')
assert.throws(()=>domainName('app.sistera.com.br',{allowedReserved:['site.sistera.com.br']}),e=>e.status===422&&e.message.includes('O formato está correto'))
assert.throws(()=>domainName('site.sistera.com.br/caminho',{allowedReserved:['site.sistera.com.br']}),e=>e.message.includes('sem caminho'))
assert.equal(domainName('campanha.sistera.com.br',{connectedBases:['sistera.com.br']}),'campanha.sistera.com.br')
assert.throws(()=>domainName('app.sistera.com.br',{connectedBases:['sistera.com.br'],allowedReserved:['app.sistera.com.br']}),e=>e.status===422)
const claim={hostname:'oferta.exemplo.com.br',zone:'exemplo.com.br',token:'token-isolado'}
assert.equal(dnsRecords({...claim,zone:null},ipv4)[0].shortName,null,'never invent a short host when DNS zone discovery failed');assert.equal(dnsRecords(claim,ipv4)[0].shortName,'_hubpages.oferta');assert.equal(dnsRecords({...claim,hostname:claim.zone},ipv4)[1].shortName,'@')
const resolver={resolveTxt:async()=>[['hubpages-verifi','cation=token-isolado']],resolve4:async()=>[ipv4],resolve6:async()=>{throw Object.assign(Error(),{code:'ENODATA'})},resolveNs:async name=>name==='exemplo.com.br'?['ns470.hostgator.com.br']:[]}
assert.equal((await checkDomainDns(claim,ipv4,resolver)).ready,true)
assert.equal((await checkDomainDns(claim,ipv4,{...resolver,resolve4:async()=>[ipv4,'1.1.1.1']})).ready,false)
assert.equal((await checkDomainDns(claim,ipv4,{...resolver,resolve6:async()=>['2001:db8::1']})).pointing,false)
assert.equal((await checkDomainDns(claim,ipv4,{...resolver,resolveTxt:async()=>[['wrong']]})).ownership,false)
assert.equal((await checkDomainDns(claim,ipv4,{...resolver,resolveTxt:async()=>{throw Object.assign(Error(),{code:'ETIMEOUT'})}})).transient,true)
assert.equal((await domainZone(claim.hostname,resolver)).zone,'exemplo.com.br');assert.equal(dnsProvider(['ns470.hostgator.com.br']),'hostgator')

let database=process.env.HUBPAGES_TEST_DATABASE_URL||'',pool,state={pages:{}}
if(database){const url=new URL(database);assert.equal(url.pathname,'/hubpages_ci');const root=new pg.Pool({connectionString:database}),schema='domain_test_'+randomUUID().replaceAll('-','');try{await root.query('CREATE SCHEMA '+schema)}finally{await root.end()}url.searchParams.set('options','-c search_path='+schema);database=url.href;pool=new pg.Pool({connectionString:database});await pool.query('CREATE TABLE hubpages_state(id integer PRIMARY KEY,payload jsonb NOT NULL)');await pool.query('INSERT INTO hubpages_state VALUES(1,$1)',[state]);await pool.query(await readFile('server/migrations/001-customer-identity.sql','utf8'));await pool.query('INSERT INTO hubpages_accounts(id,name) VALUES($1,$2),($3,$4)',[ownerA,'Conta A',ownerB,'Conta B'])}
const fallback={publicOrigin:origin,read:async()=>pool?(await pool.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload:structuredClone(state),write:async s=>{if(pool)await pool.query('UPDATE hubpages_state SET payload=$1 WHERE id=1',[s]);else state=structuredClone(s)}}
const platform=await createPlatformStore(database,fallback),store=await createDomainStore(database,fallback)
try{
 let page=await platform.create(ownerA,{name:'Domínio de teste',title:'Oferta privada',checkoutUrl:'https://pay.example.test/test',publicUrl:origin+'/domain_fixture',blocks:[]})
 const other=await platform.create(ownerB,{title:'Outra conta',blocks:[]}),second=await platform.create(ownerA,{title:'Outra página',blocks:[]})
 const ready={ownership:true,pointing:true,ready:true,transient:false,ipv4:[ipv4],ipv6:[],checkedAt:new Date().toISOString()}
 let probes=0
 const service=(patch={})=>customDomainService({store,platform,ipv4,findZone:async()=>({zone:'exemplo.com.br',nameservers:['ns470.hostgator.com.br']}),checkDns:async()=>ready,probeTls:async()=>{probes++;return true},...patch})
 let svc=service(),d=await svc.create(ownerA,page.id,{hostname:'oferta.exemplo.com.br',provider:'hostgator'})
 assert.equal(d.verified,false);assert.equal(await svc.certificateAllowed(d.hostname),false)
 await assert.rejects(store.read(ownerB,page.id,d.id),e=>e.status===404)
 await assert.rejects(svc.activate(ownerA,page.id,d.id),e=>e.status===422)
 let bad=service({checkDns:async()=>({...ready,ownership:false,ready:false})});await bad.check(ownerA,page.id,d.id);assert.equal(probes,0,'TLS is never probed before DNS ownership and pointing')
 let waiting=service({probeTls:async()=>false});d=await waiting.check(ownerA,page.id,d.id);assert.equal(d.tls,false);assert.equal(await svc.certificateAllowed(d.hostname),true,'ask can authorize the initial TLS handshake after proof');assert.equal(await svc.binding(d.hostname),null)
 svc=service();d=await svc.check(ownerA,page.id,d.id);await assert.rejects(svc.check(ownerA,page.id,d.id),e=>e.status===429)
 d=await svc.activate(ownerA,page.id,d.id);assert.equal(d.enabled,true);assert.equal(d.live,false,'connecting a draft does not publish it')
 await assert.rejects(svc.publication(await svc.binding(d.hostname)),e=>e.status===404)
 page=await platform.publish(ownerA,page.id,{revision:page.revision,origin})
 const card=(await svc.cards(ownerA,[page]))[0];assert.equal(card.customDomains[0].hostname,d.hostname);assert.ok(!JSON.stringify(card.customDomains).includes('token'));assert.equal((await svc.cards(ownerB,[other]))[0].customDomains.length,0,'owner-specific summaries');
 const publicPage=await svc.publication(await svc.binding(d.hostname));assert.equal(publicPage.url,'https://oferta.exemplo.com.br');assert.equal(publicPage.draft.title,'Oferta privada');assert.equal(publicPage.id,page.publication.id)
 const competing=await svc.create(ownerB,other.id,{hostname:d.hostname});await assert.rejects(svc.check(ownerB,other.id,competing.id),e=>e.status===409)
 const transient=service({checkDns:async()=>({...ready,ready:false,transient:true,ownership:false})});await transient.check(ownerA,page.id,d.id);assert.ok(await svc.binding(d.hostname),'a transient DNS outage retains the previous bounded lease')
 await store.update(ownerA,page.id,d.id,{readyUntil:'2000-01-01T00:00:00Z'});assert.equal(await svc.binding(d.hostname),null);assert.equal(await svc.certificateAllowed(d.hostname),false)
 svc=service();await svc.check(ownerA,page.id,d.id);page=await platform.unpublish(ownerA,page.id,{revision:page.revision});await assert.rejects(svc.publication(await svc.binding(d.hostname)),e=>e.status===404)
 await svc.disconnect(ownerA,page.id,d.id);assert.equal(await svc.binding(d.hostname),null);assert.equal(await svc.certificateAllowed(d.hostname),false)
 assert.deepEqual((await svc.cards(ownerA,[page]))[0].customDomains,[]);
 const oldToken=(await store.read(ownerA,page.id,d.id)).token
 const moved=await svc.create(ownerA,second.id,{hostname:d.hostname});assert.equal(moved.id,d.id);assert.notEqual((await store.read(ownerA,second.id,d.id)).token,oldToken);assert.equal(moved.enabled,false)
 const siteService=service({allowedReserved:['site.sistera.com.br'],findZone:async()=>({zone:'sistera.com.br',nameservers:[]})}),site=await siteService.create(ownerA,second.id,{hostname:'site.sistera.com.br',provider:'hostgator'});assert.equal(site.verified,false);assert.equal(site.dns,null,'an empty DNS configuration must not block the first step');assert.equal(site.records[0].name,'_hubpages.site.sistera.com.br');assert.equal(site.records[1].name,'site.sistera.com.br')
 await siteService.check(ownerA,second.id,site.id);await siteService.activate(ownerA,second.id,site.id)
 for(let i=0;i<15;i++){const child=await svc.create(ownerA,second.id,{hostname:`produto-${i}.sistera.com.br`});assert.equal(child.verified,false);assert.equal(child.enabled,false);assert.equal((await store.read(ownerA,second.id,child.id)).subdomainOf,'sistera.com.br')}
 await assert.rejects(svc.create(ownerA,second.id,{hostname:'app.sistera.com.br'}),e=>e.status===422)
 await assert.rejects(svc.create(ownerB,other.id,{hostname:'de-outra-conta.sistera.com.br'}),e=>e.status===422,'a different account does not inherit the connected domain')
 await svc.create(ownerA,second.id,{hostname:'primeiro.novo-dominio.net'});await assert.rejects(svc.create(ownerA,second.id,{hostname:'segundo.outro-dominio.net'}),e=>e.status===422,'unrelated-domain quota remains in force')
 await siteService.disconnect(ownerA,second.id,site.id);await assert.rejects(service().create(ownerA,second.id,{hostname:'depois.sistera.com.br'}),e=>e.status===422,'a disconnected anchor does not grant new subdomains')
 const limited=service();for(let i=0;i<20;i++)await limited.create(ownerB,other.id,{hostname:d.hostname});await assert.rejects(limited.create(ownerB,other.id,{hostname:d.hostname}),e=>e.status===429,'request rate stays bounded without a total subdomain cap')
 console.log('PASS: custom domain validation, DNS TXT/A/AAAA, owner/page isolation, TLS admission, activation, expiry, unpublish, disconnect and safe reconnection ('+(database?'PostgreSQL':'file')+')')
}finally{await store.close();await platform.close();if(pool)await pool.end()}
