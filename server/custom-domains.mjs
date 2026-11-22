import {PlatformError} from './platform-error.mjs'
import {domainName,domainZone,dnsProvider,dnsRecords,checkDomainDns,probeDomainTls} from './custom-domain-dns.mjs'
const valid=d=>d?.verified&&Date.parse(d.readyUntil)>Date.now()
export function customDomainService({store,platform,ipv4,checkDns=checkDomainDns,probeTls=probeDomainTls,findZone=domainZone,allowedReserved=[]}){
 const attempts=new Map(),inFlight=new Set()
 const network=async(ownerId,fn)=>{if(inFlight.has(ownerId)||inFlight.size>=4)throw new PlatformError(429,'Já estamos conferindo uma conexão. Aguarde alguns segundos.');inFlight.add(ownerId);try{return await fn()}finally{inFlight.delete(ownerId)}}
 const view=async d=>{let live=false;try{live=valid(d)&&d.enabled&&d.tls&&Boolean(await platform.publicPage(d.pageId))}catch{/* A draft or unpublished page is never exposed. */}return{id:d.id,hostname:d.hostname,url:'https://'+d.hostname,provider:d.provider,detectedProvider:d.detectedProvider,zone:d.zone,nameservers:d.nameservers,records:dnsRecords(d,ipv4),enabled:d.enabled,verified:valid(d),tls:d.tls,dns:d.dns,live,readyUntil:d.readyUntil}}
 async function check(ownerId,pageId,id,{background=false}={}){
  const d=await store.read(ownerId,pageId,id),key=ownerId+':'+id,now=Date.now()
  for(const [k,t]of attempts)if(now-t>15000)attempts.delete(k)
  if(!background&&attempts.has(key))throw new PlatformError(429,'Estamos conferindo esta conexão. Aguarde alguns segundos e tente novamente.')
  attempts.set(key,now)
  return network(ownerId,async()=>{
  const dns=await checkDns(d,ipv4)
  let next=await store.update(ownerId,pageId,id,{dns,...(dns.transient?{}:{verified:dns.ready,readyUntil:dns.ready?new Date(now+86400000).toISOString():null,...(!dns.ready?{tls:false}:{})})})
  if(dns.ready&&!background){const tls=await probeTls(next,ipv4);next=await store.update(ownerId,pageId,id,{tls})}
  return view(next)
  })
 }
 return{
  async cards(ownerId,pages){const connections=await store.forOwner(ownerId);return pages.map(page=>({...page,customDomains:connections.filter(d=>d.pageId===page.id&&valid(d)&&d.enabled&&d.tls).map(d=>({id:d.id,hostname:d.hostname,url:'https://'+d.hostname}))}))},
  async list(ownerId,pageId){return Promise.all((await store.list(ownerId,pageId)).map(view))},
  async create(ownerId,pageId,input){const hostname=domainName(input.hostname,{allowedReserved});return network(ownerId,async()=>{const zone=await findZone(hostname);return view(await store.create(ownerId,pageId,hostname,{...zone,provider:['hostinger','hostgator','registrobr','godaddy','cloudflare','outro'].includes(input.provider)?input.provider:dnsProvider(zone.nameservers),detectedProvider:dnsProvider(zone.nameservers)}))})},
  check,
  async activate(ownerId,pageId,id){const d=await store.read(ownerId,pageId,id);if(!valid(d)||!d.dns?.ready||!d.tls||!Number.isFinite(Date.parse(d.dns.checkedAt))||Date.now()-Date.parse(d.dns.checkedAt)>600000)throw new PlatformError(422,'Confira o DNS e a conexão segura antes de usar este domínio.');return view(await store.update(ownerId,pageId,id,{enabled:true}))},
  async disconnect(ownerId,pageId,id){return view(await store.update(ownerId,pageId,id,{enabled:false,verified:false,tls:false,readyUntil:null,disconnectedAt:new Date().toISOString()}))},
  async certificateAllowed(hostname){const d=await store.find(hostname);return Boolean(valid(d))},
  async binding(hostname,{proof=false}={}){const d=await store.find(hostname);return valid(d)&&(proof||d.enabled&&d.tls)?d:null},
  async publication(binding){const p=await platform.publicPage(binding.pageId);return{...p,url:'https://'+binding.hostname,draft:{...p.draft,publicUrl:'https://'+binding.hostname}}},
  async renew(){for(const d of await store.renewals()){try{await check(d.ownerId,d.pageId,d.id,{background:true})}catch{/* A transient DNS failure does not extend the previous lease. */}}},
 }
}
