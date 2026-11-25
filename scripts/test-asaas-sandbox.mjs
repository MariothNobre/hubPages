import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {sandboxBase,sandboxClient,secretVault,createAsaasSandbox} from '../server/asaas-sandbox.mjs'
const key='$aact_hmlg_'+ 'sandbox_fake_key_only_'.repeat(3),secret='sandbox-local-encryption-key-only'
const vault=secretVault(secret),cipher=vault.seal(key)
assert.notEqual(vault.seal(key),cipher);assert.equal(vault.open(cipher),key);assert.ok(!cipher.includes(key))
assert.throws(()=>secretVault(secret+'other').open(cipher));assert.throws(()=>vault.open(cipher+'x'))
let called=0
const client=sandboxClient(key,async(url,options)=>{called++;assert.equal(url,sandboxBase+'/myAccount/status');assert.equal(options.redirect,'error');assert.equal(options.headers.access_token,key);return Response.json({general:'APPROVED'})})
await client('/myAccount/status');assert.equal(called,1)
for(const path of ['https://api.asaas.com/v3/customers','//evil.test','/transfers','/payments/../../transfers'])await assert.rejects(client(path),/não permitida/)
const refusal=sandboxClient(key,async()=>Response.json({errors:[{description:key}]},{status:401}))
await assert.rejects(refusal('/myAccount/status'),e=>!e.message.includes(key)&&e.status===422)
await assert.rejects(sandboxClient(key,async()=>new Response('x'.repeat(524289)))('/myAccount/status'),/Resposta inválida/)
const database=process.env.HUBPAGES_TEST_DATABASE_URL
if(!database){console.log('PASS: Sandbox fixed network, secret isolation, bounded responses and safe errors. PostgreSQL tests run in CI.');process.exit(0)}
assert.equal(new URL(database).pathname,'/hubpages_ci')
const schema='asaas_ci_'+randomBytes(6).toString('hex'),root=new pg.Pool({connectionString:database,max:1})
await root.query(`CREATE SCHEMA ${schema}`)
const target=new URL(database);target.searchParams.set('options','-c search_path='+schema)
const db=new pg.Pool({connectionString:target.href,max:1})
await db.query('CREATE TABLE hubpages_schema_migrations(version integer PRIMARY KEY)')
await db.query(await readFile(new URL('../server/migrations/011-saas-authority.sql',import.meta.url),'utf8'))
let hook=null,customer=null,subscription=null,payment=null,customerPosts=0,subPosts=0,confirmPosts=0
const transport=async(url,o)=>{
 assert.ok(url.startsWith(sandboxBase+'/'));assert.equal(o.headers.access_token,key);assert.equal(o.redirect,'error')
 const path=url.slice(sandboxBase.length),body=o.body?JSON.parse(o.body):undefined
 if(path==='/myAccount/status')return Response.json({general:'APPROVED'})
 if(path.startsWith('/webhooks?'))return Response.json({data:hook?[hook]:[]})
 if(path==='/webhooks'&&o.method==='POST'){hook={...body,id:'wh_1'};return Response.json(hook)}
 if(path==='/webhooks/wh_1'&&o.method==='PUT'){hook={...body,id:'wh_1'};return Response.json(hook)}
 if(path.startsWith('/customers?'))return Response.json({data:customer?[customer]:[]})
 if(path==='/customers'&&o.method==='POST'){customerPosts++;customer={...body,id:'cus_1'};return Response.json(customer)}
 if(path.startsWith('/subscriptions?'))return Response.json({data:subscription?[subscription]:[]})
 if(path==='/subscriptions'&&o.method==='POST'){subPosts++;subscription={...body,id:'sub_1'};payment={id:'pay_1',customer:'cus_1',subscription:'sub_1',value:5,status:'PENDING',invoiceUrl:'https://sandbox.asaas.com/i/test'};return Response.json(subscription)}
 if(path.startsWith('/subscriptions/sub_1/payments'))return Response.json({data:[payment]})
 if(path==='/payments/pay_1')return Response.json(payment)
 if(path==='/sandbox/payment/pay_1/confirm'&&o.method==='POST'){confirmPosts++;payment.status='RECEIVED';return Response.json(payment)}
 throw new Error('Unexpected test endpoint '+path)
}
let service
try{
 service=await createAsaasSandbox({connectionString:target.href,secret,origin:'https://dev.hubpages.com.br',transport})
 assert.equal((await service.status()).configured,false);assert.equal(await service.authenticate('wrong'),false)
 await assert.rejects(service.save({key:'$aact_prod_no',email:'test@example.test'},'admin'),/Sandbox/)
 await service.save({key,email:'test@example.test'},'admin')
 const stored=(await db.query('SELECT * FROM hubpages_asaas_config')).rows[0]
 assert.ok(!JSON.stringify(stored).includes(key));assert.equal(vault.open(stored.key_cipher),key)
 assert.equal((await service.status()).commercialEnabled,false)
 await service.provision('admin');await service.provision('admin');assert.equal(hook.url,'https://dev.hubpages.com.br/api/saas/asaas/webhook')
 assert.equal(await service.authenticate(hook.authToken),true);assert.equal(await service.authenticate(hook.authToken+'x'),false)
 const publicState=JSON.stringify(await service.status());assert.ok(!publicState.includes(key));assert.ok(!publicState.includes(hook.authToken))
 await service.lab('admin');await service.lab('admin');assert.equal(customerPosts,1);assert.equal(subPosts,1);assert.equal(subscription.maxPayments,1);assert.equal(subscription.value,5)
 await service.confirm('admin');await service.confirm('admin');assert.equal(confirmPosts,1);assert.equal((await service.status()).lab.paymentStatus,'RECEIVED')
 const event={id:'evt_duplicate',event:'PAYMENT_RECEIVED',payment:{id:'pay_1',value:999,status:'RECEIVED'}}
 await Promise.all([service.receive(event),service.receive(event)]);assert.equal((await db.query('SELECT count(*)::int AS n FROM hubpages_asaas_events WHERE id=$1',[event.id])).rows[0].n,1)
 payment.status='REFUNDED';await service.drain();assert.equal((await service.status()).lab.paymentStatus,'REFUNDED')
 // Replaying a stale RECEIVED message can never restore a refund: GET is authoritative.
 await service.receive({...event,id:'evt_stale'});await service.drain();assert.equal((await service.status()).lab.paymentStatus,'REFUNDED')
 payment.customer='cus_other';payment.status='RECEIVED';await service.receive({...event,id:'evt_wrong_customer'});await service.drain();assert.equal((await service.status()).lab.paymentStatus,'REFUNDED')
 await assert.rejects(service.receive({...event,id:'bad id'}),/inválido/)
 const audits=JSON.stringify((await db.query('SELECT * FROM hubpages_saas_audit')).rows);assert.ok(!audits.includes(key));assert.ok(!audits.includes(hook.authToken))
 await service.close();service=null
 service=await createAsaasSandbox({connectionString:target.href,secret,origin:'https://dev.hubpages.com.br',transport});assert.equal((await service.status()).webhookConfigured,true);assert.equal((await service.status()).lab.paymentStatus,'REFUNDED')
 console.log('PASS: PostgreSQL encrypted configuration, migration restart, authenticated duplicate events, latest-state reconciliation, refund replay, tenant mismatch and synthetic subscription idempotency.')
}finally{await service?.close();await db.end();await root.query(`DROP SCHEMA ${schema} CASCADE`);await root.end()}
