import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import pg from 'pg'
import {createPlatformStore,importMediaKey} from '../server/platform-store.mjs'
import {reviewSignature,pendingChanges} from '../shared/studio-wizard.mjs'
import {templateInput} from '../server/templates.mjs'
const origin=process.env.HUBPAGES_TEST_PRODUCTION==='true'?'https://hubpages.com.br':'https://dev.hubpages.com.br',owner='legacy-owner',slot=randomUUID()
let database=process.env.HUBPAGES_TEST_DATABASE_URL||'',pool,state={pages:{}}
if(database){const url=new URL(database);assert.equal(url.pathname,'/hubpages_ci');const root=new pg.Pool({connectionString:database});const schema='import_test_'+randomUUID().replaceAll('-','');try{await root.query('CREATE SCHEMA '+schema)}finally{await root.end()}url.searchParams.set('options','-c search_path='+schema);database=url.href;pool=new pg.Pool({connectionString:database});await pool.query('CREATE TABLE hubpages_state(id integer PRIMARY KEY,payload jsonb NOT NULL)');await pool.query('INSERT INTO hubpages_state VALUES(1,$1)',[state]);await pool.query(await readFile('server/migrations/001-customer-identity.sql','utf8'))}
const fallback={publicOrigin:origin,credentialKey:'isolated-import-test',read:async()=>pool?(await pool.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload:structuredClone(state),write:async value=>{if(pool)await pool.query('UPDATE hubpages_state SET payload=$1 WHERE id=1',[value]);else state=structuredClone(value)}}
const store=await createPlatformStore(database,fallback)
try{
 const imported={version:1,authorized:true,sourceUrl:'https://example.test/offer',modelName:'Teste',css:'h1{color:var(--hp-c0)}',palette:{c0:'#123456'},rootHtml:'<main><div data-hp-slot="0"></div></main>',report:{}}
 let page=await store.create(owner,{name:'Importação isolada',title:'Oferta',template:'imported',imported,importedAssets:[{id:slot,imageUrl:'',title:'Imagem'}],blocks:[{id:randomUUID(),importHtml:`<section><h1>Oferta</h1><img data-hp-asset="${slot}"></section>`}],[importMediaKey]:[{slot,mime:'image/png',content:Buffer.from('original')}]})
 assert.equal(reviewSignature(page.draft),reviewSignature(JSON.parse(JSON.stringify(page.draft))),'review signature survives PostgreSQL JSON serialization');assert.equal(page.origin,'imported');assert.match(page.draft.importedAssets[0].imageUrl,new RegExp(page.id));assert.equal((await store.getImage(owner,page.id,slot)).content.toString(),'original')
 await assert.rejects(store.getImage('other-owner',page.id,slot),error=>error.status===404)
 page=await store.save(owner,page.id,{revision:page.revision,draft:{...page.draft,checkoutUrl:'https://pay.example.test/test',publicUrl:origin+'/isolated_import',colorTheme:'oceano'}})
 await assert.rejects(store.publish(owner,page.id,{revision:page.revision,origin,requireReview:true}),/Revisão/)
 const review=await store.review(owner,page.id)
 page=await store.save(owner,page.id,{revision:page.revision,draft:{...page.draft,visitedSteps:[7],reviewedSignature:reviewSignature(page.draft,review.assetVersion)}})
 page=await store.publish(owner,page.id,{revision:page.revision,origin,requireReview:true})
 const first=await store.publicResolve(origin+'/isolated_import');assert.equal(first.draft.colorTheme,'oceano');assert.equal((await store.publicImage(first.id,slot)).content.toString(),'original');assert.ok(!JSON.stringify(first.draft).includes('/api/platform/pages/'))
 await store.putImage(owner,page.id,slot,'image/png',Buffer.from('replacement'))
 assert.equal((await store.publicImage(first.id,slot)).content.toString(),'original','live snapshot is preserved during edits');const changed=await store.review(owner,page.id);assert.ok(pendingChanges(page.draft,changed.publishedDraft,changed.changedImageSlots).some(change=>change.id===slot+':imageUrl'),'replacing imported media appears in publication notifications')
 await assert.rejects(store.publish(owner,page.id,{revision:page.revision,origin,requireReview:true}),/Revisão/)
 const copy=await store.duplicate(owner,page.id);assert.equal(copy.origin,'imported');assert.ok(copy.draft.importedAssets[0].imageUrl.includes(copy.id));assert.equal((await store.getImage(owner,copy.id,slot)).content.toString(),'replacement')
 page=await store.read(owner,page.id);const nextReview=await store.review(owner,page.id)
 page=await store.save(owner,page.id,{revision:page.revision,draft:{...page.draft,publicUrl:origin+'/renamed_import',reviewedSignature:''}})
 page=await store.save(owner,page.id,{revision:page.revision,draft:{...page.draft,reviewedSignature:reviewSignature(page.draft,nextReview.assetVersion)}})
 page=await store.publish(owner,page.id,{revision:page.revision,origin,requireReview:true})
 await assert.rejects(store.publicResolve(origin+'/isolated_import'),error=>error.status===404)
 const next=await store.publicResolve(origin+'/renamed_import');assert.equal((await store.publicImage(next.id,slot)).content.toString(),'replacement');await assert.rejects(store.publicImage(first.id,slot),error=>error.status===404)
 page=await store.save(owner,page.id,{revision:page.revision,draft:{...page.draft,importedAssets:[],blocks:[]}})
 await assert.rejects(store.getImage(owner,page.id,slot),error=>error.status===404)
 assert.equal((await store.publicImage(next.id,slot)).content.toString(),'replacement','removing a draft slot preserves the published snapshot')
 await assert.rejects(store.save(owner,copy.id,{revision:copy.revision,draft:{...copy.draft,imported:{...copy.draft.imported,hubpagesCreated:true}}}),/autoria/)
 const authored=await store.create(owner,templateInput({template:'sabor_pt',name:'Sabor autorizado'}));assert.equal(authored.draft.imported.hubpagesCreated,true);assert.equal(authored.draft.imported.showHubPagesMark,true)
 console.log('PASS: imported atomic media, owner isolation, review, publish, replacement, independent duplicate, URL retirement, slot pruning and exclusive branding ('+(database?'PostgreSQL':'file')+')')
}finally{await store.close();await pool?.end()}
