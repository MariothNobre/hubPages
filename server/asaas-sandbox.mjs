import {createCipheriv,createDecipheriv,createHash,randomBytes,timingSafeEqual,randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {authorityError} from './saas-authority.mjs'

export const sandboxBase='https://api-sandbox.asaas.com/v3'
export const webhookEvents=['PAYMENT_CREATED','PAYMENT_UPDATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED','PAYMENT_OVERDUE','PAYMENT_DELETED','PAYMENT_REFUNDED','PAYMENT_PARTIALLY_REFUNDED','PAYMENT_CHARGEBACK_REQUESTED','SUBSCRIPTION_CREATED','SUBSCRIPTION_UPDATED','SUBSCRIPTION_INACTIVATED','SUBSCRIPTION_DELETED']
const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value)
export function secretVault(secret){
 if(typeof secret!=='string'||secret.length<24)throw new Error('Sandbox requires session encryption key')
 const key=createHash('sha256').update('hubpages/asaas/sandbox/v1\0'+secret).digest()
 return {
  seal(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('asaas-sandbox'));const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(b=>b.toString('base64url')).join('.')},
  open(value){const [iv,tag,data]=value.split('.').map(s=>Buffer.from(s,'base64url'));const cipher=createDecipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('asaas-sandbox'));cipher.setAuthTag(tag);return Buffer.concat([cipher.update(data),cipher.final()]).toString('utf8')},
 }
}
export function sandboxClient(key,transport=fetch){
 return async(path,method='GET',body)=>{
  if(!/^\/(myAccount\/status|webhooks(?:\/[\w-]+)?|customers(?:\/[\w-]+)?|subscriptions(?:\/[\w-]+\/payments)?|payments\/[\w-]+|sandbox\/payment\/[\w-]+\/confirm)(?:\?[\w%=&-]+)?$/.test(path))throw authorityError(422,'Operação Sandbox não permitida.')
  let response
  try{response=await transport(sandboxBase+path,{method,redirect:'error',signal:AbortSignal.timeout(15000),headers:{access_token:key,'User-Agent':'HubPages-Sandbox/1.0',Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})}
  catch{throw authorityError(502,'O Sandbox não respondeu. Confira o estado antes de repetir a operação.')}
  if(!response.ok){await response.body?.cancel();throw Object.assign(authorityError(response.status===401||response.status===403?422:502,response.status===401||response.status===403?'Chave Sandbox inválida ou sem permissão.':'O Asaas Sandbox recusou a operação. Consulte os logs na conta Sandbox.'),{providerStatus:response.status})}
  const reader=response.body.getReader();let size=0;const chunks=[]
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>512*1024)throw new Error('large');chunks.push(Buffer.from(value))}return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
  catch{await reader.cancel().catch(()=>{});throw authorityError(502,'Resposta inválida do Sandbox.')}
 }
}
export async function createAsaasSandbox({connectionString,secret,origin,transport=fetch}){
 const vault=secretVault(secret),pool=new pg.Pool({connectionString,max:2,connectionTimeoutMillis:5000})
 const db=await pool.connect()
 try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(702075,12)');if(!(await db.query('SELECT version FROM hubpages_schema_migrations WHERE version=12')).rowCount)await db.query(await readFile(new URL('./migrations/012-asaas-sandbox.sql',import.meta.url),'utf8'));await db.query('COMMIT')}
 catch(error){await db.query('ROLLBACK');db.release();await pool.end();throw error}
 db.release()
 const config=async()=> (await pool.query('SELECT * FROM hubpages_asaas_config WHERE id=1')).rows[0]
 const api=async()=>{const row=await config();if(!row)throw authorityError(409,'Configure a chave Sandbox primeiro.');return sandboxClient(vault.open(row.key_cipher),transport)}
 const transaction=async(work)=>{const c=await pool.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(702075,63)');const result=await work(c);await c.query('COMMIT');return result}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
 const audit=(c,actor,action)=>c.query('INSERT INTO hubpages_saas_audit(id,actor,action,target,outcome) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,action,'asaas-sandbox','allowed'])
 const webhookUrl=origin+'/api/saas/asaas/webhook'
 const status=async()=>{
  const row=await config()
  const events=(await pool.query('SELECT id,event_type AS "eventType",received_at AS "receivedAt",processed_at AS "processedAt",attempts,result,provider_status AS "providerStatus",last_error AS "lastError" FROM hubpages_asaas_events ORDER BY received_at DESC LIMIT 30')).rows
  const lab=(await pool.query('SELECT phase,payment_status AS "paymentStatus",invoice_url AS "invoiceUrl" FROM hubpages_asaas_lab WHERE id=1')).rows[0]||null
  return {environment:'sandbox',commercialEnabled:false,configured:Boolean(row),checkedAt:row?.checked_at||null,webhookConfigured:Boolean(row?.webhook_id),webhookUrl,email:row?.email||'',events,lab}
 }
 const save=async(body,actor)=>{
  const old=await config(),key=typeof body.key==='string'?body.key.trim():''
  if(key&&(!/^\$aact_hmlg_[\w$=-]{20,1000}$/.test(key)))throw authorityError(422,'Informe uma chave do Asaas Sandbox (iniciada por $aact_hmlg_).')
  if(key&&old?.webhook_id&&key!==vault.open(old.key_cipher))throw authorityError(409,'Há um webhook vinculado. A troca de conta exige uma migração assistida para preservar os eventos.')
  if(!key&&!old)throw authorityError(422,'Informe sua chave do Sandbox.')
  if(typeof body.email!=='string'||body.email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))throw authorityError(422,'Informe o e-mail de aviso do webhook.')
  await sandboxClient(key||vault.open(old.key_cipher),transport)('/myAccount/status')
  await transaction(async c=>{
   await c.query(`INSERT INTO hubpages_asaas_config(id,key_cipher,webhook_cipher,email,checked_at) VALUES(1,$1,$2,$3,now()) ON CONFLICT(id) DO UPDATE SET key_cipher=$1,email=$3,checked_at=now(),updated_at=now()`,[key?vault.seal(key):old.key_cipher,old?.webhook_cipher||vault.seal(randomBytes(32).toString('hex')),body.email])
   await audit(c,actor,'asaas.config.saved')
  })
  return status()
 }
 const verify=async()=>{const call=await api();await call('/myAccount/status');await pool.query('UPDATE hubpages_asaas_config SET checked_at=now() WHERE id=1');return status()}
 const provision=async(actor)=>transaction(async c=>{
  const row=(await c.query('SELECT * FROM hubpages_asaas_config WHERE id=1')).rows[0];if(!row)throw authorityError(409,'Configure a chave primeiro.')
  const call=sandboxClient(vault.open(row.key_cipher),transport)
  // Recover an uncertain POST by looking up our exact URL. Never touch unrelated hooks.
  const list=await call('/webhooks?limit=100'),matching=(list.data||[]).filter(h=>h.url===webhookUrl)
  if(matching.length>1)throw authorityError(409,'Há webhooks duplicados para este DEV. Revise na conta Asaas.')
  const existing=matching[0]
  if(existing&&existing.name!=='HubPages DEV Sandbox')throw authorityError(409,'Já há outro webhook para esta URL. Revise na conta Asaas.')
  const payload={name:'HubPages DEV Sandbox',url:webhookUrl,email:row.email,enabled:true,interrupted:false,authToken:vault.open(row.webhook_cipher),sendType:'SEQUENTIALLY',events:webhookEvents}
  const hook=await call(existing?'/webhooks/'+existing.id:'/webhooks',existing?'PUT':'POST',payload)
  if(!validId(hook.id))throw authorityError(502,'Webhook retornou um identificador inválido.')
  await c.query('UPDATE hubpages_asaas_config SET webhook_id=$1 WHERE id=1',[hook.id]);await audit(c,actor,'asaas.webhook.configured')
  return {configured:true}
 })
 const authenticate=async(token)=>{const row=await config();if(!row||typeof token!=='string'||token.length>256)return false;const a=Buffer.from(token),b=Buffer.from(vault.open(row.webhook_cipher));return a.length===b.length&&timingSafeEqual(a,b)}
 const receive=async(body)=>{
  if(!body||!validId(body.id)||!webhookEvents.includes(body.event))throw authorityError(422,'Evento Sandbox inválido.')
  const resource=body.event.startsWith('PAYMENT_')?body.payment?.id:body.subscription?.id
  if(!validId(resource))throw authorityError(422,'Referência Sandbox inválida.')
  await pool.query('INSERT INTO hubpages_asaas_events(id,event_type,resource_id) VALUES($1,$2,$3) ON CONFLICT(id) DO NOTHING',[body.id,body.event,resource])
  return {received:true}
 }
 let processing=false
 const drain=async()=>{
  if(processing)return;processing=true
  try{
   const pending=(await pool.query('SELECT * FROM hubpages_asaas_events WHERE processed_at IS NULL AND retry_at<=now() ORDER BY received_at LIMIT 10')).rows
   for(const event of pending){try{
    if(!event.event_type.startsWith('PAYMENT_')){await pool.query("UPDATE hubpages_asaas_events SET processed_at=now(),result='ignored' WHERE id=$1",[event.id]);continue}
    const call=await api(),payment=await call('/payments/'+event.resource_id)
    if(payment.id!==event.resource_id||typeof payment.status!=='string')throw authorityError(502,'Referência divergente no Sandbox.')
    await transaction(async c=>{
     // Only the synthetic laboratory is mapped; no customer entitlement is granted by a callback.
     const lab=(await c.query('SELECT * FROM hubpages_asaas_lab WHERE id=1')).rows[0]
     const mapped=lab&&payment.subscription===lab.subscription_id&&payment.customer===lab.customer_id&&Number(payment.value)===5
     if(mapped)await c.query('UPDATE hubpages_asaas_lab SET payment_id=$1,payment_status=$2,updated_at=now() WHERE id=1',[payment.id,payment.status])
     await c.query("UPDATE hubpages_asaas_events SET processed_at=now(),attempts=attempts+1,result=$2,provider_status=$3,last_error=NULL WHERE id=$1",[event.id,mapped?'reconciled':'ignored',payment.status.slice(0,80)])
    })
   }catch{await pool.query("UPDATE hubpages_asaas_events SET attempts=attempts+1,result='retry',last_error='Falha temporária na conciliação Sandbox',retry_at=now()+least(3600,power(2,least(attempts,10))*15)*interval '1 second' WHERE id=$1",[event.id])}}
  }finally{processing=false}
 }
 const lab=async(actor)=>{
  // A persistent attempt marker is committed BEFORE each remote POST. If its outcome
  // is uncertain, recovery only queries by reference; it never blindly retries POST.
  const call=await api(),reference='hubpages-dev-sandbox-lab-v1'
  // Public example from Asaas documentation; synthetic Sandbox customer only.
  const testDocument='24971563792'
  const createStep=async(path,payload,rejectedPhase)=>{try{return await call(path,'POST',payload)}catch(error){
   // A definitive validation rejection created no resource. Network/5xx/429
   // outcomes keep their uncertain marker and must only be recovered via GET.
   if([400,422].includes(error.providerStatus))await pool.query('UPDATE hubpages_asaas_lab SET phase=$1 WHERE id=1',[rejectedPhase])
   throw error
  }}
  await pool.query('INSERT INTO hubpages_asaas_lab(id) VALUES(1) ON CONFLICT DO NOTHING')
  let row=(await pool.query('SELECT * FROM hubpages_asaas_lab WHERE id=1')).rows[0]
  if(!row.customer_id){
   const found=(await call('/customers?externalReference='+reference)).data||[]
   if(found.length>1)throw authorityError(409,'Clientes de teste duplicados. Revise no Asaas Sandbox.')
   let customer=found[0]
   if(!customer){
    if(row.phase!=='new')throw authorityError(409,'Tentativa anterior em conciliação. Confira os logs do Sandbox antes de repetir.')
    await pool.query("UPDATE hubpages_asaas_lab SET phase='customer_requested' WHERE id=1")
    customer=await createStep('/customers',{name:'HubPages DEV — Cliente fictício',cpfCnpj:testDocument,externalReference:reference,notificationDisabled:true},'new')
   }
   if(!validId(customer.id))throw authorityError(502,'Cliente de teste inválido.')
   await pool.query("UPDATE hubpages_asaas_lab SET customer_id=$1,phase='customer_ready' WHERE id=1",[customer.id])
  }
  row=(await pool.query('SELECT * FROM hubpages_asaas_lab WHERE id=1')).rows[0]
  if(!row.subscription_id){
   const found=(await call('/subscriptions?externalReference='+reference)).data||[]
   if(found.length>1)throw authorityError(409,'Assinaturas de teste duplicadas. Revise no Sandbox.')
   let subscription=found[0]
   if(!subscription){
    if(row.phase!=='customer_ready')throw authorityError(409,'Assinatura anterior em conciliação. Confira os logs do Sandbox.')
    await pool.query("UPDATE hubpages_asaas_lab SET phase='subscription_requested' WHERE id=1")
    const nextDueDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
    subscription=await createStep('/subscriptions',{customer:row.customer_id,billingType:'UNDEFINED',value:5,nextDueDate,cycle:'MONTHLY',maxPayments:1,externalReference:reference,description:'HubPages DEV — simulação técnica, sem dinheiro real'},'customer_ready')
   }
   if(!validId(subscription.id)||subscription.customer!==row.customer_id||Number(subscription.value)!==5)throw authorityError(502,'Assinatura de teste divergente.')
   await transaction(async c=>{await c.query("UPDATE hubpages_asaas_lab SET subscription_id=$1,phase='subscription_ready' WHERE id=1",[subscription.id]);await audit(c,actor,'asaas.lab.created')})
  }
  row=(await pool.query('SELECT * FROM hubpages_asaas_lab WHERE id=1')).rows[0]
  const payment=(await call('/subscriptions/'+row.subscription_id+'/payments?limit=10')).data?.[0]
  if(!payment)throw authorityError(409,'A assinatura foi criada. Aguarde o Asaas gerar a cobrança e atualize o teste.')
  if(!validId(payment.id)||payment.customer!==row.customer_id||payment.subscription!==row.subscription_id||Number(payment.value)!==5)throw authorityError(502,'Cobrança de teste divergente.')
  let invoiceUrl=null
  try{const link=new URL(payment.invoiceUrl);if(link.origin==='https://sandbox.asaas.com')invoiceUrl=link.href}catch{/* No untrusted provider URL is exposed. */}
  await pool.query("UPDATE hubpages_asaas_lab SET payment_id=$1,payment_status=$2,invoice_url=$3,phase='ready',updated_at=now() WHERE id=1",[payment.id,payment.status,invoiceUrl])
 }
 const confirm=async(actor)=>{
  const row=(await pool.query('SELECT * FROM hubpages_asaas_lab WHERE id=1')).rows[0]
  if(!row?.payment_id)throw authorityError(409,'Prepare o teste primeiro.')
  const call=await api(),payment=await call('/payments/'+row.payment_id)
  if(payment.customer!==row.customer_id||payment.subscription!==row.subscription_id||Number(payment.value)!==5)throw authorityError(409,'A cobrança não pertence ao laboratório.')
  if(!['CONFIRMED','RECEIVED'].includes(payment.status))await call('/sandbox/payment/'+row.payment_id+'/confirm','POST',{})
  // Do not trust the POST reply. Persist an internal reconciliation job and GET
  // the provider's latest payment; genuine webhook deliveries remain separate.
  await pool.query("INSERT INTO hubpages_asaas_events(id,event_type,resource_id) VALUES($1,'PAYMENT_UPDATED',$2) ON CONFLICT DO NOTHING",['lab_reconcile_'+randomUUID(),row.payment_id])
  await transaction(c=>audit(c,actor,'asaas.lab.confirmed'))
  await drain()
 }
 return {status,save,verify,provision,authenticate,receive,drain,lab,confirm,close:()=>pool.end()}

}
