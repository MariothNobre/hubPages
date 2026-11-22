import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {createPlatformStore} from './platform-store.mjs'
import {templateInput} from './templates.mjs'
import {reviewSignature} from '../shared/studio-wizard.mjs'
const origin=process.env.HUBPAGES_PUBLIC_ORIGIN||process.env.HUBPAGES_DEV_PUBLIC_ORIGIN
if(process.env.HUBPAGES_ENV!=='development'||origin!=='https://dev.hubpages.com.br'||!process.env.DATABASE_URL)throw Error('Provisionamento permitido somente no PostgreSQL exclusivo do DEV HubPages.')
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1})
const fallback={publicOrigin:origin,credentialKey:process.env.HUBPAGES_SESSION_SECRET,read:async()=>(await pool.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload,write:async value=>{await pool.query('UPDATE hubpages_state SET payload=$1 WHERE id=1',[value])}}
const store=await createPlatformStore(process.env.DATABASE_URL,fallback),owner='legacy-owner'
try{
 const exists=await pool.query("SELECT id FROM hubpages_studio_pages WHERE owner_id=$1 AND draft->'imported'->>'demoKey'='sabor-demo-v1'",[owner])
 if(exists.rowCount)console.log('Modelo de teste Sabor já provisionado; conteúdo atual preservado.')
 else{
  const draft=templateInput({template:'sabor_pt',name:'Coma Bem em Minutos — teste de importação'})
  draft.imported.demoKey='sabor-demo-v1'
  // This public checkout belongs to the user-provided source. No purchase is made.
  draft.checkoutUrl=Object.values(draft.imported.sourceLinks||{}).find(value=>value.startsWith('https://pay.hotmart.com/'))||''
  if(!draft.checkoutUrl)throw Error('Checkout da origem ausente; nenhuma página foi criada.')
  const suggested=await store.addressOccupied(origin+'/coma_bem_em_minutos')
  if(!suggested)draft.publicUrl=origin+'/coma_bem_em_minutos'
  let page=await store.create(owner,draft)
  if(!page.draft.publicUrl){const suggestion=await store.suggestion(owner,page.id,'Coma Bem em Minutos');page=await store.save(owner,page.id,{revision:page.revision,draft:{...page.draft,publicUrl:suggestion.url}})}
  const context=await store.review(owner,page.id)
  page=await store.save(owner,page.id,{revision:page.revision,draft:{...page.draft,visitedSteps:[1,2,4,5,6,7,8],reviewedSignature:reviewSignature(page.draft,context.assetVersion)}})
  page=await store.publish(owner,page.id,{revision:page.revision,origin,requireReview:true})
  console.log('Exemplo Sabor publicado somente no DEV: '+page.publication.url)
 }
}finally{await store.close();await pool.end()}
