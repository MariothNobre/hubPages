import assert from 'node:assert/strict'
import {randomUUID,randomBytes} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {createGoldAnnual,billingDocument,annualUntil,goldTerms} from '../server/gold-annual.mjs'
assert.equal(billingDocument('249.715.637-92'),'24971563792')
for(const input of ['11111111111','123','24971563793','a24971563792'])assert.throws(()=>billingDocument(input))
assert.equal(annualUntil({status:'RECEIVED',confirmedDate:'2026-11-25'}),'2027-11-25T00:00:00.000Z')
assert.equal(annualUntil({status:'PENDING'}),null)
assert.equal(annualUntil({status:'RECEIVED',confirmedDate:'2026-11-25',chargeback:{status:'REQUESTED'}}),null)
const database=process.env.HUBPAGES_TEST_DATABASE_URL
if(!database){console.log('PASS: Gold billing document validation and deterministic annual periods. PostgreSQL integration runs in CI.');process.exit(0)}
assert.equal(new URL(database).pathname,'/hubpages_ci')
const schema='gold_ci_'+randomBytes(6).toString('hex'),root=new pg.Pool({connectionString:database,max:1})
await root.query(`CREATE SCHEMA ${schema}`)
const target=new URL(database);target.searchParams.set('options','-c search_path='+schema)
const pool=new pg.Pool({connectionString:target.href,max:3})
await pool.query(await readFile(new URL('../server/migrations/001-customer-identity.sql',import.meta.url),'utf8'))
await pool.query(await readFile(new URL('../server/migrations/011-saas-authority.sql',import.meta.url),'utf8'))
async function user(email){const accountId=randomUUID(),id=randomUUID();await pool.query('INSERT INTO hubpages_accounts(id,name) VALUES($1,$2)',[accountId,'Synthetic QA']);await pool.query('INSERT INTO hubpages_users(id,account_id,email,name,password_hash,terms_version) VALUES($1,$2,$3,$4,$5,$6)',[id,accountId,email,'Synthetic QA','unused-test-hash','test']);return {id,accountId,email,name:'Synthetic QA'}}
const identity=u=>({subject:u.id,ownerId:u.accountId,role:'customer'})
const transaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
const audit=(c,actor,action,target='gold')=>c.query("INSERT INTO hubpages_saas_audit(id,actor,action,target,outcome) VALUES($1,$2,$3,$4,'allowed')",[randomUUID(),actor,action,target])
const customers=new Map(),subscriptions=new Map(),payments=new Map();let creates=0,subCreates=0,lostCustomerResponse=true
const api=async()=>async(path,method='GET',body)=>{
 const url=new URL(path,'https://sandbox.example.test'),parts=url.pathname.split('/').filter(Boolean)
 if(parts[0]==='customers'&&method==='GET')return {data:[...customers.values()].filter(c=>c.externalReference===url.searchParams.get('externalReference'))}
 if(path==='/customers'&&method==='POST'){creates++;const value={...body,id:'cus_'+creates};customers.set(value.id,value);if(lostCustomerResponse){lostCustomerResponse=false;throw new Error('Synthetic lost provider response')}return value}
 if(parts[0]==='subscriptions'&&parts.length===1&&method==='GET')return {data:[...subscriptions.values()].filter(s=>s.externalReference===url.searchParams.get('externalReference'))}
 if(path==='/subscriptions'&&method==='POST'){subCreates++;const s={...body,id:'sub_'+subCreates};subscriptions.set(s.id,s);payments.set('pay_'+subCreates,{id:'pay_'+subCreates,customer:s.customer,subscription:s.id,value:s.value,status:'PENDING',dueDate:new Date().toISOString().slice(0,10),invoiceUrl:'https://sandbox.asaas.com/i/qa'+subCreates});return s}
 if(parts[0]==='subscriptions'&&parts[2]==='payments')return {data:[...payments.values()].filter(p=>p.subscription===parts[1])}
 if(parts[0]==='subscriptions'&&parts.length===2){const s=subscriptions.get(parts[1]);if(!s)throw new Error('Deleted subscription');return s}
 if(parts[0]==='payments')return payments.get(parts[1])
 if(parts[0]==='sandbox'&&parts[3]==='confirm'){const p=payments.get(parts[2]);p.status='RECEIVED';p.confirmedDate=new Date().toISOString().slice(0,10);return p}
 throw new Error('Unexpected fake endpoint '+path)
}
try{
 const legacy=await user('old@example.test'),exempt=await user('mjsnobre2@gmail.com')
 const service=await createGoldAnnual({pool,api,transaction,audit})
 assert.equal((await service.access(identity(legacy))).reason,'existing_account')
 assert.equal((await service.access(identity(exempt))).reason,'email_exempt')
 assert.equal((await service.access({subject:'legacy-owner',ownerId:'legacy-owner',role:'super_admin'})).allowed,true)
 const a=await user('new-a@example.test'),b=await user('new-b@example.test'),ia=identity(a),ib=identity(b)
 assert.equal((await service.access({...ia,email:'mjsnobre2@gmail.com'})).allowed,false)
 const payload={document:'24971563792',acceptGoldTerms:true,termsVersion:goldTerms,planVersion:1,amountCents:1,accountId:b.accountId,role:'super_admin'}
 await assert.rejects(service.checkout(a,ia,{...payload,acceptGoldTerms:false}),/aceite/)
 await assert.rejects(service.checkout(a,ia,payload),/lost provider/)
 await service.checkout(a,ia,payload);await service.checkout(a,ia,payload)
 assert.equal(creates,1);assert.equal(subCreates,1);assert.equal(subscriptions.get('sub_1').value,29.9);assert.equal(subscriptions.get('sub_1').cycle,'YEARLY')
 assert.equal((await service.access(ia)).allowed,false)
 await service.price({amountCents:3990,version:1},'admin')
 assert.equal((await service.status(ia)).order.amountCents,2990)
 await assert.rejects(service.price({amountCents:4990,version:1},'admin'),/outra sessão/)
 await assert.rejects(service.checkout(b,ib,payload),/valor do plano mudou/)
 await service.checkout(b,ib,{...payload,planVersion:2})
 assert.equal(subscriptions.get('sub_2').value,39.9)
 assert.equal((await service.access(ib)).allowed,false)
 await service.confirm(a.accountId,'admin')
 const active=await service.access(ia);assert.equal(active.allowed,true)
 assert.equal((await service.access(ib)).allowed,false)
 const paid=payments.get('pay_1');await service.reconcile(paid);assert.equal((await service.access(ia)).validUntil.toISOString(),active.validUntil.toISOString())
 paid.customer='cus_wrong';await service.reconcile(paid);assert.equal((await service.access(ia)).allowed,false)
 paid.customer='cus_1';await service.reconcile(paid);assert.equal((await service.access(ia)).allowed,true)
 paid.status='REFUNDED';const savedSub=subscriptions.get('sub_1');subscriptions.delete('sub_1');await service.reconcile(paid);assert.equal((await service.access(ia)).allowed,false)
 subscriptions.set('sub_1',savedSub);paid.status='RECEIVED';paid.confirmedDate='2000-01-01';await service.reconcile(paid);assert.equal((await service.access(ia)).reason,'expired')
 await service.reconcile(paid);assert.equal(new Date((await service.access(ia)).validUntil).getUTCFullYear(),2001)
 const restarted=await createGoldAnnual({pool,api,transaction,audit});assert.equal((await restarted.access(ib)).allowed,false)
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM hubpages_gold_grants')).rows[0].n,2)
 const columns=(await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='hubpages_gold_orders'",[schema])).rows.map(r=>r.column_name)
 assert.ok(!columns.includes('document'));assert.ok(!columns.includes('cpf'))
 console.log('PASS: PostgreSQL Gold migration, stable exemptions, payment gate, annual pricing snapshots, lost reply recovery, tenant binding, refunds, expiry and restart preservation.')
}finally{await pool.end();await root.query(`DROP SCHEMA ${schema} CASCADE`);await root.end()}
