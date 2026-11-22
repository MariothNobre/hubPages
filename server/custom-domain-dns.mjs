import {Resolver} from 'node:dns/promises'
import {domainToASCII} from 'node:url'
import {isIP} from 'node:net'
import https from 'node:https'
import {PlatformError} from './platform-error.mjs'

export function domainName(input,{allowedReserved=[]}={}){
  if(typeof input!=='string'||input.length>280)throw new PlatformError(422,'Digite somente o domínio, como oferta.seusite.com.br.')
  let value=input.trim().toLowerCase().replace(/\.$/,'')
  if(value.startsWith('https://'))value=value.slice(8).replace(/\/$/,'')
  if(/[\/\\?:#@%\s]/u.test(value))throw new PlatformError(422,'Digite apenas o domínio, sem caminho, senha, porta ou parâmetros.')
  value=domainToASCII(value)
  if(!value||value.length>243||isIP(value)||!value.includes('.')||value.split('.').some(label=>!(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))||/^\d+$/.test(value.split('.').at(-1))||/(^|\.)(localhost|local|internal|lan|test|invalid|example)$/.test(value)||/(^|\.)(hubpages\.com\.br|sistera\.com\.br|hstgr\.cloud)$/.test(value)&&!allowedReserved.includes(value))throw new PlatformError(422,'Use um domínio próprio registrado, sem caminho, porta ou parâmetros. Os endereços da plataforma são reservados.')
  return value
}
export function dnsResolver(){return new Resolver({timeout:1800,tries:1})}
const absent=new Set(['ENODATA','ENOTFOUND','NXDOMAIN'])
async function answer(resolver,method,name){try{return await resolver[method](name)}catch(error){if(absent.has(error.code))return [];throw error}}
export async function domainZone(hostname,resolver=dnsResolver()){
  const labels=hostname.split('.')
  const candidates=[hostname,...Array.from({length:Math.min(5,labels.length-2)},(_,i)=>labels.slice(-(Math.min(6,labels.length-1)-i)).join('.'))];
  for(const name of [...new Set(candidates)]){try{const ns=await answer(resolver,'resolveNs',name);if(ns.length)return{zone:name,nameservers:ns}}catch{/* The user can still use full DNS record names. */}}
  return{zone:null,nameservers:[]}
}
export function dnsProvider(nameservers=[]){const ns=nameservers.join(' ');return /cloudflare\.com/.test(ns)?'cloudflare':/dns-parking\.com|hostinger/.test(ns)?'hostinger':/hostgator/.test(ns)?'hostgator':/domaincontrol\.com/.test(ns)?'godaddy':/\.dns\.br|registro\.br/.test(ns)?'registrobr':'outro'}
export function dnsRecords(claim,ipv4){
  const zone=claim.zone,prefix=zone===null||zone===undefined?null:claim.hostname===zone?'':claim.hostname.endsWith('.'+zone)?claim.hostname.slice(0,-zone.length-1):claim.hostname
  return[{type:'TXT',name:'_hubpages.'+claim.hostname,shortName:prefix===null?null:'_hubpages'+(prefix?'.'+prefix:''),value:'hubpages-verification='+claim.token,ttl:'Padrão'},
    {type:'A',name:claim.hostname,shortName:prefix===null?null:prefix||'@',value:ipv4,ttl:'Padrão'}]
}
export async function checkDomainDns(claim,ipv4,resolver=dnsResolver()){
  const results=await Promise.allSettled([answer(resolver,'resolveTxt','_hubpages.'+claim.hostname),answer(resolver,'resolve4',claim.hostname),answer(resolver,'resolve6',claim.hostname)])
  const transient=results.some(r=>r.status==='rejected'),[txt,a,aaaa]=results.map(r=>r.status==='fulfilled'?r.value:[])
  const ownership=txt.some(parts=>parts.join('')==='hubpages-verification='+claim.token),pointing=a.length>0&&a.every(ip=>ip===ipv4)&&aaaa.length===0
  return{ownership,pointing,ipv4:a,ipv6:aaaa,transient,ready:!transient&&ownership&&pointing,checkedAt:new Date().toISOString()}
}
// Only a previously verified destination is probed, with DNS pinned to our own IP.
// TLS validation stays enabled; no redirects, custom ports or arbitrary fetches.
export async function probeDomainTls(claim,ipv4){
  return new Promise(resolve=>{
    const request=https.get({hostname:claim.hostname,servername:claim.hostname,path:'/.well-known/hubpages-connection',port:443,timeout:12000,lookup:(_host,options,cb)=>options.all?cb(null,[{address:ipv4,family:4}]):cb(null,ipv4,4)},response=>{
      let body='';response.on('data',chunk=>{body+=chunk;if(body.length>2048){resolve(false);request.destroy()}});response.on('end',()=>{try{const data=JSON.parse(body);resolve(response.statusCode===200&&['hubpages-dev','hubpages-prod'].includes(data.connection)&&data.claim===claim.id&&data.hostname===claim.hostname)}catch{resolve(false)}});response.on('error',()=>resolve(false))
    });request.on('timeout',()=>{resolve(false);request.destroy()});request.on('error',()=>resolve(false))
  })
}
