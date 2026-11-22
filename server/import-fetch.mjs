import https from 'node:https'
import {lookup} from 'node:dns/promises'
import ipaddr from 'ipaddr.js'
import {PlatformError} from './platform-error.mjs'
export function importUrl(value){let url;try{url=new URL(value)}catch{throw new PlatformError(422,'Informe o endereço HTTPS completo da página de vendas.')}
 if(url.protocol!=='https:'||url.username||url.password||(url.port&&url.port!=='443')||url.hostname.length>253||/^(localhost|.*\.(localhost|local|internal|lan))$/i.test(url.hostname))throw new PlatformError(422,'Use uma página HTTPS pública, sem senha ou porta personalizada.');url.hash='';return url}
export function publicImportAddress(address){try{const parsed=ipaddr.process(address);return parsed.range()==='unicast'}catch{return false}}
export async function fetchImportResource(value,{limit=2*1024*1024,signal,resolve=lookup}={}){
 let url=importUrl(value)
 for(let redirect=0;redirect<4;redirect++){
  if(signal?.aborted)throw new PlatformError(408,'A importação demorou além do limite. Tente novamente.')
  const hostname=url.hostname.replace(/^\[|\]$/g,''),records=ipaddr.isValid(hostname)?[{address:hostname,family:ipaddr.parse(hostname).kind()==='ipv6'?6:4}]:await resolvePublic(hostname,resolve,signal)
  if(!records.length||records.some(record=>!publicImportAddress(record.address)))throw new PlatformError(422,'Este endereço não é uma página pública permitida para importação.')
  const result=await new Promise((done,reject)=>{const req=https.get(url,{signal,headers:{'User-Agent':'HubPages-PageImporter/1.0','Accept-Encoding':'identity'},lookup:(_hostname,options,callback)=>options.all?callback(null,records):callback(null,records[0].address,records[0].family)},response=>{const chunks=[];let bytes=0;response.on('data',chunk=>{bytes+=chunk.length;if(bytes>limit){req.destroy(new PlatformError(422,'Um recurso da página ultrapassa o tamanho permitido.'));return}chunks.push(chunk)});response.on('end',()=>done({status:response.statusCode,headers:response.headers,content:Buffer.concat(chunks)}));response.on('error',reject)});req.setTimeout(12000,()=>req.destroy(new PlatformError(408,'A origem não respondeu a tempo.')));req.on('error',reject)})
  if([301,302,303,307,308].includes(result.status)){if(!result.headers.location)break;url=importUrl(new URL(result.headers.location,url).href);continue}
  if(result.status!==200)throw new PlatformError(422,`A página de origem respondeu ${result.status}. Confira se o endereço está público.`)
  if(result.headers['content-encoding']&&!['identity'].includes(result.headers['content-encoding']))throw new PlatformError(422,'A origem enviou uma compactação não suportada.')
  return{...result,url:url.href}
 }
 throw new PlatformError(422,'A página redirecionou muitas vezes. Informe o endereço final.')
}

async function resolvePublic(hostname,resolve,signal){
 let timer,abort
 const interrupted=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new PlatformError(408,'A origem não respondeu a tempo.')),8000);abort=()=>reject(new PlatformError(408,'A importação foi interrompida.'));signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort()})
 try{return await Promise.race([resolve(hostname,{all:true,verbatim:true}),interrupted])}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort)}
}
