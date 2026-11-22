import pg from 'pg'
import {randomUUID,randomBytes} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {PlatformError} from './platform-error.mjs'

export async function createDomainStore(connectionString,fallback){
 const pool=connectionString?new pg.Pool({connectionString,max:2,connectionTimeoutMillis:4000}):null
 let chain=Promise.resolve()
 if(pool){const client=await pool.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(702074,10)');if(!(await client.query('SELECT version FROM hubpages_schema_migrations WHERE version=10')).rowCount)await client.query(await readFile(new URL('./migrations/010-custom-domains-dev.sql',import.meta.url),'utf8'));await client.query('COMMIT')}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}}
 const operation=async(fn,write=false)=>{
  if(pool){const c=await pool.connect();try{await c.query('BEGIN');if(write)await c.query('SELECT pg_advisory_xact_lock(702076,1)');const result=await fn({all:async()=> (await c.query('SELECT document FROM hubpages_studio_domains')).rows.map(r=>r.document),put:async d=>{await c.query('INSERT INTO hubpages_studio_domains(id,owner_id,page_id,hostname,document) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET page_id=$3,document=$5',[d.id,d.ownerId,d.pageId,d.hostname,d])}});await c.query('COMMIT');return result}catch(error){await c.query('ROLLBACK');if(error.code==='23505')throw new PlatformError(409,'Este domínio já está conectado a outra página.');throw error}finally{c.release()}}
  const run=chain.then(async()=>{const s=await fallback.read();s.customDomains??=[];const result=await fn({all:async()=>s.customDomains,put:async d=>{const i=s.customDomains.findIndex(v=>v.id===d.id);if(i<0)s.customDomains.push(d);else s.customDomains[i]=d}});if(write)await fallback.write(s);return structuredClone(result)});chain=run.catch(()=>{});return run
 }
 const owned=(rows,ownerId,pageId,id)=>{const d=rows.find(v=>v.id===id&&v.ownerId===ownerId&&v.pageId===pageId);if(!d)throw new PlatformError(404,'Conexão de domínio não encontrada.');return d}
 return{
  list:(ownerId,pageId)=>operation(async db=>(await db.all()).filter(d=>d.ownerId===ownerId&&d.pageId===pageId)),
  create:(ownerId,pageId,hostname,info)=>operation(async db=>{const rows=await db.all(),existing=rows.find(d=>d.ownerId===ownerId&&d.hostname===hostname);if(existing&&!existing.disconnectedAt){if(existing.pageId!==pageId)throw new PlatformError(409,'Este domínio já está ligado a outra página sua. Desconecte-o nela antes de continuar.');return existing}if(rows.filter(d=>d.ownerId===ownerId&&!d.disconnectedAt).length>=10||rows.filter(d=>d.pageId===pageId&&!d.disconnectedAt).length>=3)throw new PlatformError(422,'Você pode conectar até 3 endereços por página e 10 por conta.');const d={id:existing?.id||randomUUID(),ownerId,pageId,hostname,token:randomBytes(24).toString('hex'),...info,verified:false,enabled:false,tls:false,dns:null,createdAt:new Date().toISOString(),readyUntil:null};await db.put(d);return d},true),
  read:(ownerId,pageId,id)=>operation(async db=>owned(await db.all(),ownerId,pageId,id)),
  update:(ownerId,pageId,id,patch)=>operation(async db=>{const rows=await db.all(),d=owned(rows,ownerId,pageId,id),next={...d,...patch};if(next.verified&&rows.some(other=>other.id!==id&&other.hostname===d.hostname&&other.verified))throw new PlatformError(409,'Este domínio já está conectado a outra conta. Desconecte a conexão anterior ou procure o suporte.');await db.put(next);return next},true),
  async find(hostname){if(pool){const r=await pool.query("SELECT d.document FROM hubpages_studio_domains d JOIN hubpages_studio_pages p ON p.id=d.page_id WHERE d.hostname=$1 AND d.document->>'verified'='true' AND COALESCE(p.extra->>'trashedAt','')=''",[hostname]);return r.rows[0]?.document||null}const s=await fallback.read(),d=s.customDomains?.find(d=>d.hostname===hostname&&d.verified),page=s.platform?.pages?.[d?.pageId];return page&&!page.trashedAt?d:null},
  renewals:async()=>pool?(await pool.query("SELECT document FROM hubpages_studio_domains WHERE document->>'verified'='true' ORDER BY document->'dns'->>'checkedAt' ASC NULLS FIRST LIMIT 100")).rows.map(r=>r.document):operation(async db=>(await db.all()).filter(d=>d.verified).sort((a,b)=>Date.parse(a.dns?.checkedAt||a.createdAt)-Date.parse(b.dns?.checkedAt||b.createdAt)).slice(0,100)),
  close:()=>pool?.end(),
 }
}
