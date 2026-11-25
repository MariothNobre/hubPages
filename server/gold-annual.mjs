import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {authorityError} from './saas-authority.mjs'
export const goldTerms='gold-sandbox-2026-11-25'
export const reservedGoldEmail=email=>typeof email==='string'&&email.trim().toLowerCase()==='mjsnobre2@gmail.com'
const idValid=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value)
export function billingDocument(value){
 if(typeof value!=='string'||value.length>30)throw authorityError(422,'Informe um CPF ou CNPJ de teste válido.')
 const digits=value.replace(/[.\-/\s]/g,'')
 if(!/^\d{11}$|^\d{14}$/.test(digits)||/^(\d)\1+$/.test(digits))throw authorityError(422,'Informe um CPF ou CNPJ de teste válido.')
 const check=(part,weights)=>{const mod=[...part].reduce((sum,d,i)=>sum+Number(d)*weights[i],0)%11;return mod<2?0:11-mod}
 const base=digits.length===11?9:12,weights=digits.length===11?[10,9,8,7,6,5,4,3,2]:[5,4,3,2,9,8,7,6,5,4,3,2]
 const first=check(digits.slice(0,base),weights),second=check(digits.slice(0,base+1),digits.length===11?[11,10,9,8,7,6,5,4,3,2]:[6,...weights])
 if(Number(digits[base])!==first||Number(digits[base+1])!==second)throw authorityError(422,'Informe um CPF ou CNPJ de teste válido.')
 return digits
}
export function annualUntil(payment){
 if(!['CONFIRMED','RECEIVED'].includes(payment.status)||payment.deleted||payment.chargeback&&['REQUESTED','IN_DISPUTE','DISPUTE_LOST','DONE'].includes(payment.chargeback.status)||payment.refunds?.some(r=>Number(r.value)>0&&!['CANCELLED','FAILED','DENIED'].includes(r.status)))return null
 const date=payment.confirmedDate||payment.paymentDate||payment.clientPaymentDate
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2})?$/.test(date))throw authorityError(502,'O Sandbox ainda não informou a data de confirmação do pagamento.')
 const paid=new Date(date.slice(0,10)+'T00:00:00.000Z');if(!Number.isFinite(paid.getTime())||paid.toISOString().slice(0,10)!==date.slice(0,10))throw authorityError(502,'Data de pagamento inválida no Sandbox.')
 paid.setUTCFullYear(paid.getUTCFullYear()+1);return paid.toISOString()
}
const safeInvoice=value=>{try{const url=new URL(value);return url.origin==='https://sandbox.asaas.com'?url.href:null}catch{return null}}
export async function createGoldAnnual({pool,api,transaction,audit}){
 const c=await pool.connect()
 try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(702075,13)');if(!(await c.query('SELECT version FROM hubpages_schema_migrations WHERE version=13')).rowCount)await c.query(await readFile(new URL('./migrations/013-gold-annual.sql',import.meta.url),'utf8'));await c.query('COMMIT')}
 catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
 const plan=async()=>{const row=(await pool.query('SELECT amount_cents,version FROM hubpages_gold_plan WHERE id=1')).rows[0];return {name:'Gold',amountCents:row.amount_cents,version:row.version,currency:'BRL',cycle:'YEARLY',environment:'sandbox'}}
 const orderFor=async account=>(await pool.query('SELECT * FROM hubpages_gold_orders WHERE account_id=$1',[account])).rows[0]
 const access=async identity=>{
  if(!identity)throw authorityError(401,'Entre na sua conta para continuar.')
  if(identity.role==='super_admin')return {allowed:true,reason:'super_admin',state:'exempt',validUntil:null}
  const grant=(await pool.query('SELECT reason FROM hubpages_gold_grants WHERE account_id=$1',[identity.ownerId])).rows[0]
  if(grant)return {allowed:true,reason:grant.reason,state:'exempt',validUntil:null}
  const paid=(await pool.query("SELECT max(valid_until) AS until FROM hubpages_gold_payments WHERE account_id=$1 AND state IN ('CONFIRMED','RECEIVED')",[identity.ownerId])).rows[0].until
  const allowed=Boolean(paid&&new Date(paid)>new Date())
  return {allowed,reason:allowed?'paid':paid?'expired':'payment_required',state:allowed?'active':paid?'expired':'pending',validUntil:paid||null}
 }
 const status=async identity=>{
  const result=await access(identity),order=identity.role==='super_admin'?null:await orderFor(identity.ownerId)
  return {enabled:true,termsVersion:goldTerms,plan:await plan(),access:result,order:order?{amountCents:order.amount_cents,planVersion:order.plan_version,phase:order.phase,invoiceUrl:order.invoice_url,paymentStatus:order.payment_status}:null}
 }
 const price=async(body,actor)=>transaction(async c=>{
  if(!Number.isSafeInteger(body.amountCents)||body.amountCents<1||body.amountCents>100000000||!Number.isSafeInteger(body.version))throw authorityError(422,'Informe um valor anual válido para o Plano Gold.')
  const changed=await c.query('UPDATE hubpages_gold_plan SET amount_cents=$1,version=version+1,updated_at=now() WHERE id=1 AND version=$2 RETURNING version',[body.amountCents,body.version])
  if(!changed.rowCount)throw authorityError(409,'O preço foi atualizado em outra sessão. Atualize os dados antes de salvar.')
  await audit(c,actor,'gold.price.updated','gold:'+body.amountCents)
 })
 const reconcile=async(payment,knownSubscription)=>{
  if(!idValid(payment.id))return false
  const order=(await pool.query('SELECT * FROM hubpages_gold_orders WHERE account_id=COALESCE((SELECT account_id FROM hubpages_gold_payments WHERE id=$2),(SELECT account_id FROM hubpages_gold_orders WHERE subscription_id=$1))',[payment.subscription,payment.id])).rows[0]
  if(!order)return false
  let matches=payment.subscription===order.subscription_id&&payment.customer===order.customer_id&&Math.round(Number(payment.value)*100)===order.amount_cents&&typeof payment.status==='string'
  let until=matches?annualUntil(payment):null
  // A refund/chargeback must revoke its known period even if the subscription
  // has since been removed. Only a positive grant requires full contract lookup.
  if(until&&matches){const call=await api(),subscription=knownSubscription||await call('/subscriptions/'+order.subscription_id);matches=subscription.id===order.subscription_id&&subscription.customer===order.customer_id&&subscription.externalReference===String(order.reference)&&subscription.cycle==='YEARLY'&&Math.round(Number(subscription.value)*100)===order.amount_cents}
  if(!matches)until=null
  const state=matches?payment.status.slice(0,80):'MISMATCH'
  await transaction(async c=>{
   const old=(await c.query('SELECT state,valid_until FROM hubpages_gold_payments WHERE id=$1',[payment.id])).rows[0]
   await c.query('INSERT INTO hubpages_gold_payments(id,account_id,amount_cents,state,valid_until) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET state=$4,valid_until=$5,updated_at=now() WHERE hubpages_gold_payments.account_id=$2',[payment.id,order.account_id,order.amount_cents,state,until])
   await c.query('UPDATE hubpages_gold_orders SET payment_status=$2,updated_at=now() WHERE account_id=$1',[order.account_id,state])
   if(!old||old.state!==state||String(old.valid_until||'')!==String(until?new Date(until):''))await audit(c,'asaas-sandbox',matches?'gold.payment.reconciled':'gold.payment.rejected',order.account_id)
  })
  return true
 }
 const sync=async identity=>{
  if(identity.role==='super_admin')return status(identity)
  const row=await orderFor(identity.ownerId);if(!row?.subscription_id)return status(identity)
  const call=await api(),subscription=await call('/subscriptions/'+row.subscription_id)
  const payments=await call('/subscriptions/'+row.subscription_id+'/payments?limit=100')
  for(const payment of payments.data||[])await reconcile(payment,subscription)
  const candidate=(payments.data||[]).filter(p=>p.subscription===row.subscription_id&&p.customer===row.customer_id).sort((a,b)=>String(b.dueDate).localeCompare(String(a.dueDate)))[0]
  if(candidate)await pool.query('UPDATE hubpages_gold_orders SET invoice_url=$2,payment_status=$3 WHERE account_id=$1',[row.account_id,safeInvoice(candidate.invoiceUrl),candidate.status])
  return status(identity)
 }
 const checkout=async(customer,identity,body)=>{
  if((await access(identity)).allowed)return status(identity)
  if(!customer||customer.accountId!==identity.ownerId)throw authorityError(403,'Entre na conta que deseja ativar.')
  if(body.acceptGoldTerms!==true||body.termsVersion!==goldTerms)throw authorityError(422,'Confira e aceite as condições do Plano Gold antes de continuar.')
  const document=billingDocument(body.document)
  let row=await orderFor(identity.ownerId)
  if(!row){
   await transaction(async c=>{
    const latest=(await c.query('SELECT amount_cents,version FROM hubpages_gold_plan WHERE id=1 FOR UPDATE')).rows[0]
    if(body.planVersion!==latest.version)throw authorityError(409,'O valor do plano mudou. Atualize a tela e confira antes de continuar.')
    await c.query('INSERT INTO hubpages_gold_orders(account_id,payer_id,reference,amount_cents,plan_version,terms_version) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(account_id) DO NOTHING',[identity.ownerId,customer.id,randomUUID(),latest.amount_cents,latest.version,goldTerms])
    await audit(c,identity.subject,'gold.checkout.accepted',identity.ownerId)
   });row=await orderFor(identity.ownerId)
  }
  const call=await api(),reference=String(row.reference)
  const post=async(path,payload,from,pending)=>{
   const claimed=await pool.query('UPDATE hubpages_gold_orders SET phase=$2,updated_at=now() WHERE account_id=$1 AND phase=$3 RETURNING account_id',[identity.ownerId,pending,from])
   if(!claimed.rowCount)throw authorityError(409,'A preparação anterior ainda está em conferência. Atualize antes de tentar novamente.')
   try{return await call(path,'POST',payload)}catch(e){if([400,422].includes(e.providerStatus))await pool.query('UPDATE hubpages_gold_orders SET phase=$2 WHERE account_id=$1 AND phase=$3',[identity.ownerId,from,pending]);throw e}
  }
  if(!row.customer_id){
   const found=(await call('/customers?externalReference='+reference)).data||[]
   if(found.length>1)throw authorityError(409,'Há uma divergência no cadastro de cobrança. Procure a administração.')
   const payer=found[0]||await post('/customers',{name:customer.name,email:customer.email,cpfCnpj:document,externalReference:reference,notificationDisabled:true},'new','customer_requested')
   if(!idValid(payer.id)||payer.externalReference!==reference)throw authorityError(502,'Cadastro de cobrança retornou uma referência divergente.')
   await pool.query("UPDATE hubpages_gold_orders SET customer_id=$2,phase='customer_ready' WHERE account_id=$1 AND customer_id IS NULL",[identity.ownerId,payer.id])
   row=await orderFor(identity.ownerId)
  }
  if(!row.subscription_id){
   const found=(await call('/subscriptions?externalReference='+reference)).data||[]
   if(found.length>1)throw authorityError(409,'Há uma divergência na assinatura. Procure a administração.')
   const nextDueDate=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
   const subscription=found[0]||await post('/subscriptions',{customer:row.customer_id,billingType:'UNDEFINED',value:row.amount_cents/100,nextDueDate,cycle:'YEARLY',externalReference:reference,description:'HubPages — Plano Gold anual (Sandbox)'},'customer_ready','subscription_requested')
   if(!idValid(subscription.id)||subscription.customer!==row.customer_id||subscription.externalReference!==reference||subscription.cycle!=='YEARLY'||Math.round(Number(subscription.value)*100)!==row.amount_cents)throw authorityError(502,'A assinatura retornou dados divergentes.')
   await pool.query("UPDATE hubpages_gold_orders SET subscription_id=$2,phase='ready' WHERE account_id=$1 AND subscription_id IS NULL",[identity.ownerId,subscription.id])
  }
  return sync(identity)
 }
 const adminStatus=async()=>({plan:await plan(),accounts:(await pool.query(`SELECT a.id AS "accountId",u.name,u.email,CASE WHEN r.role='super_admin' THEN 'super_admin' ELSE g.reason END AS exemption,o.phase,o.amount_cents AS "amountCents",o.payment_status AS "paymentStatus",max(p.valid_until) AS "validUntil" FROM hubpages_accounts a JOIN hubpages_users u ON u.account_id=a.id LEFT JOIN hubpages_saas_roles r ON r.subject=u.id::text LEFT JOIN hubpages_gold_grants g ON g.account_id=a.id LEFT JOIN hubpages_gold_orders o ON o.account_id=a.id LEFT JOIN hubpages_gold_payments p ON p.account_id=a.id GROUP BY a.id,u.id,r.role,g.reason,o.phase,o.amount_cents,o.payment_status ORDER BY a.created_at DESC LIMIT 100`)).rows})
 const confirm=async(accountId,actor)=>{
  if(typeof accountId!=='string'||!/^[a-f0-9-]{36}$/.test(accountId))throw authorityError(422,'Conta inválida.')
  const row=await orderFor(accountId);if(!row?.subscription_id)throw authorityError(409,'Essa conta ainda não preparou o pagamento Gold.')
  const call=await api(),payments=(await call('/subscriptions/'+row.subscription_id+'/payments?limit=100')).data||[]
  const payment=payments.filter(p=>p.subscription===row.subscription_id&&p.customer===row.customer_id&&Math.round(Number(p.value)*100)===row.amount_cents).sort((a,b)=>String(b.dueDate).localeCompare(String(a.dueDate)))[0]
  if(!payment||!idValid(payment.id))throw authorityError(409,'A cobrança Gold ainda não está disponível.')
  if(!['CONFIRMED','RECEIVED'].includes(payment.status))await call('/sandbox/payment/'+payment.id+'/confirm','POST',{})
  await reconcile(await call('/payments/'+payment.id))
  await transaction(c=>audit(c,actor,'gold.sandbox.confirmed',accountId))
 }
 return {plan,access,status,price,checkout,sync,reconcile,adminStatus,confirm,termsVersion:goldTerms}
}
