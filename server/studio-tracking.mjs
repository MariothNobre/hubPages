import { createCipheriv,createDecipheriv,createHash,randomBytes } from 'node:crypto'
import { PlatformError } from './platform-error.mjs'
export function sealToken(token,secret) {
  if(!token)return ''
  if(!secret)throw new PlatformError(503,'Armazenamento seguro de credenciais indisponível.')
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',createHash('sha256').update(secret).digest(),iv)
  const data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()])
  return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),data.toString('base64url')].join('.')
}
export function openToken(value,secret) {
  if(!value)return ''
  const [version,iv,tag,data]=value.split('.')
  if(version!=='v1'||!secret)throw new Error('Credencial indisponível.')
  const decipher=createDecipheriv('aes-256-gcm',createHash('sha256').update(secret).digest(),Buffer.from(iv,'base64url'))
  decipher.setAuthTag(Buffer.from(tag,'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8')
}
export function trackingChange(input,current,secret) {
  const token=input.metaConversionsApiToken??'',code=input.metaTestEventCode??''
  if(typeof token!=='string'||token.length>4096||typeof code!=='string'||!/^[A-Za-z0-9_-]{0,100}$/.test(code))throw new PlatformError(422,'Token ou código de teste inválido.')
  return {token_ciphertext:input.clearMetaConversionsApiToken?'':token.trim()?sealToken(token.trim(),secret):current?.token_ciphertext||'',test_event_code:code}
}
export function trackingView(row) {return {metaConversionsApiConfigured:Boolean(row?.token_ciphertext),metaTestEventCode:row?.test_event_code||''}}
export async function forwardStudioMeta({store,body,origin,userAgent,fetcher=fetch}) {
  if(!body||typeof body.eventId!=='string'||!/^[a-f0-9-]{20,64}$/i.test(body.eventId)||typeof body.publicationId!=='string'||!/^[a-f0-9-]{36}$/.test(body.publicationId))throw new PlatformError(422,'Evento inválido.')
  let source;try{source=new URL(body.eventSourceUrl)}catch{throw new PlatformError(422,'Origem inválida.')}
  const context=await store.metaContext(body.publicationId)
  if(!context||source.origin!==origin)throw new PlatformError(403,'Página indisponível para este evento.')
  const canonical=new URL(context.url)
  if(source.origin!==canonical.origin||source.pathname.replace(/\/$/,'')!==canonical.pathname.replace(/\/$/,''))throw new PlatformError(403,'O evento não pertence a esta página.')
  if(!context.enabled||!/^\d{5,30}$/.test(context.pixelId)||!context.accessToken)return {accepted:false}
  if(!await store.claimMeta(body.publicationId,body.eventId))return {accepted:false,duplicate:true}
  const userData={client_user_agent:String(userAgent||'').slice(0,1000)}
  for(const key of ['fbp','fbc'])if(typeof body[key]==='string'&&/^fb\.1\.\d+\.[A-Za-z0-9_-]+$/.test(body[key]))userData[key]=body[key]
  const payload={data:[{event_name:'PageView',event_time:Math.floor(Date.now()/1000),event_id:body.eventId,event_source_url:source.toString(),action_source:'website',user_data:userData}]}
  if(context.testEventCode)payload.test_event_code=context.testEventCode
  try {
    const result=await fetcher(`https://graph.facebook.com/v27.0/${context.pixelId}/events`,{method:'POST',headers:{Authorization:`Bearer ${context.accessToken}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)})
    await store.finishMeta(body.publicationId,body.eventId,result.ok?'sent':'failed')
    if(!result.ok)throw new PlatformError(502,'A Meta não aceitou o evento. Confira as credenciais e o código de teste.')
    return {accepted:true}
  }catch(error){await store.finishMeta(body.publicationId,body.eventId,'failed');if(error instanceof PlatformError)throw error;throw new PlatformError(502,'Não foi possível enviar o evento à Meta.')}
}
