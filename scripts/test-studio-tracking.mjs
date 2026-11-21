import assert from 'node:assert/strict'
import { sealToken,openToken,trackingChange,trackingView,forwardStudioMeta } from '../server/studio-tracking.mjs'
const secret='synthetic-local-key',token='synthetic-test-token'
const encrypted=sealToken(token,secret)
assert.notEqual(encrypted,token);assert.equal(openToken(encrypted,secret),token)
assert.throws(()=>openToken(encrypted,'wrong-key'))
const config=trackingChange({metaTestEventCode:'TEST123'},{token_ciphertext:encrypted},secret)
assert.equal(config.token_ciphertext,encrypted)
assert.deepEqual(trackingView(config),{metaConversionsApiConfigured:true,metaTestEventCode:'TEST123'})
assert.equal(trackingChange({clearMetaConversionsApiToken:true},config,secret).token_ciphertext,'')
const publicationId='11111111-1111-4111-8111-111111111111',eventId='22222222-2222-4222-8222-222222222222'
const context={enabled:true,pixelId:'123456789',accessToken:token,testEventCode:'TEST123',url:'https://dev.hubpages.com.br/oferta'}
const seen=new Set(),statuses=[]
const store={metaContext:async()=>context,claimMeta:async(id,event)=>{if(seen.has(event))return false;seen.add(event);return true},finishMeta:async(id,event,status)=>statuses.push(status)}
let calls=0
const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://graph.facebook.com/v27.0/123456789/events');assert.equal(options.headers.Authorization,'Bearer '+token);const payload=JSON.parse(options.body);assert.equal(payload.data[0].event_id,eventId);assert.equal(payload.data[0].event_name,'PageView');assert.equal(payload.test_event_code,'TEST123');return{ok:true}}
const args={store,body:{publicationId,eventId,eventSourceUrl:context.url+'?utm_source=test'},origin:'https://dev.hubpages.com.br',userAgent:'Local synthetic test',fetcher}
assert.deepEqual(await forwardStudioMeta(args),{accepted:true})
assert.equal((await forwardStudioMeta(args)).duplicate,true);assert.equal(calls,1)
await assert.rejects(forwardStudioMeta({...args,body:{...args.body,eventSourceUrl:'https://dev.hubpages.com.br/outra'}}),/não pertence/)
context.enabled=false
assert.deepEqual(await forwardStudioMeta(args),{accepted:false})
assert.deepEqual(statuses,['sent'])
console.log('PASS: encrypted private credentials, preservation/removal, page-scoped source, mocked CAPI payload and deduplication; no external Meta request')
