// Dedicated test domain explicitly supplied by the owner. Never runs on production.
import pg from 'pg'
import {readFile,writeFile} from 'node:fs/promises'
import {createPlatformStore} from './platform-store.mjs'
import {createDomainStore} from './custom-domain-store.mjs'
import {customDomainService} from './custom-domains.mjs'
import {reviewSignature} from '../shared/studio-wizard.mjs'

const origin=process.env.HUBPAGES_DEV_PUBLIC_ORIGIN,hostname=process.env.HUBPAGES_CUSTOM_DOMAIN_TEST_HOST,marker='/data/custom-domain-demo.json'
if(process.env.HUBPAGES_ENV!=='development'||origin!=='https://dev.hubpages.com.br'||process.env.HUBPAGES_CUSTOM_DOMAINS_ENABLED!=='true'||hostname!=='teste.sistera.com.br'||!process.env.DATABASE_URL)throw Error('Domain demo is restricted to the explicitly authorized DEV test host.')
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1})
const fallback={publicOrigin:origin,credentialKey:process.env.HUBPAGES_SESSION_SECRET,read:async()=>(await pool.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload,write:async value=>{await pool.query('UPDATE hubpages_state SET payload=$1 WHERE id=1',[value])}}
const platform=await createPlatformStore(process.env.DATABASE_URL,fallback),store=await createDomainStore(process.env.DATABASE_URL,fallback),service=customDomainService({platform,store,ipv4:process.env.HUBPAGES_CUSTOM_DOMAIN_IPV4})
try{
 let saved;try{saved=JSON.parse(await readFile(marker,'utf8'))}catch(error){if(error.code!=='ENOENT')throw error}
 let row=(await pool.query("SELECT id,extra FROM hubpages_studio_pages WHERE owner_id='legacy-owner' AND draft->'templateTexts'->>'hpDomainDemo'='dev-domain-v1' LIMIT 1")).rows[0]
 if(saved&&!row||row?.extra?.trashedAt){console.log('Domain demo was removed by the owner; not recreated.');process.exitCode=0}
 else{
  let page
  if(!row){
   page=await platform.create('legacy-owner',{template:'essencial',name:'Teste — domínio próprio',title:'Seu domínio está conectado à HubPages',description:'Esta página de teste valida a conexão de domínio próprio no ambiente DEV da HubPages.',redLine:'CONEXÃO DE DOMÍNIO PRÓPRIO · AMBIENTE DEV',ctaLabel:'Conhecer a HubPages',checkoutUrl:origin,templateTexts:{hpDomainDemo:'dev-domain-v1'},blocks:[]})
   const address=await platform.suggestion('legacy-owner',page.id,'verificacao_dominio_proprio')
   page=await platform.save('legacy-owner',page.id,{revision:page.revision,draft:{...page.draft,publicUrl:address.url}})
   const review=await platform.review('legacy-owner',page.id)
   page=await platform.save('legacy-owner',page.id,{revision:page.revision,draft:{...page.draft,visitedSteps:[7],reviewedSignature:reviewSignature(page.draft,review.assetVersion)}})
   page=await platform.publish('legacy-owner',page.id,{revision:page.revision,origin,requireReview:true})
  }else page=await platform.read('legacy-owner',row.id)
  const existing=(await store.forOwner('legacy-owner')).find(d=>d.hostname===hostname)
  if(existing&&existing.pageId!==page.id){console.log('Domain demo moved to another page by the owner; current binding preserved.')}
  else if(existing?.disconnectedAt){console.log('Domain demo disconnected by the owner; connection preserved as disabled.')}
  else{
   const claim=await service.create('legacy-owner',page.id,{hostname,provider:'hostgator'})
   await writeFile(marker,JSON.stringify({pageId:page.id,claimId:claim.id,hostname}),{mode:0o600})
   console.log('DEV domain test DNS: '+JSON.stringify({pageId:page.id,claimId:claim.id,hostname,records:claim.records}))
   try{const status=await service.check('legacy-owner',page.id,claim.id);if(status.verified&&status.tls){const active=await service.activate('legacy-owner',page.id,claim.id);console.log('DEV domain test active: '+active.url)}else console.log('DEV domain test waiting: '+JSON.stringify({ownership:status.dns?.ownership,pointing:status.dns?.pointing,tls:status.tls}))}catch(error){console.log('DEV domain test awaits DNS/TLS: '+error.message)}
  }
 }
}finally{await platform.close();await store.close();await pool.end()}
