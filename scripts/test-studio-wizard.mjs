import assert from 'node:assert/strict'
import { pendingChanges,reviewSignature,wizardReadiness } from '../shared/studio-wizard.mjs'
const id='11111111-1111-4111-8111-111111111111',block='22222222-2222-4222-8222-222222222222'
const draft={name:'Minha oferta',title:'Título',checkoutUrl:'https://pay.example.test/buy',publicUrl:'https://dev.hubpages.com.br/minha_oferta',step:1,blocks:[{id:block,title:'Benefícios',body:'Antes',imageUrl:''}],imageUrl:`/api/platform/pages/${id}/images/hero`}
const published={...structuredClone(draft),imageUrl:`/api/public/publications/${block}/images/hero`}
assert.equal(pendingChanges(draft,published).length,0)
assert.equal(pendingChanges({...draft,step:8,addressAuto:true,reviewedSignature:'abc'},published).length,0)
assert.equal(reviewSignature(draft),reviewSignature({...draft,step:8,addressAuto:true,reviewedSignature:'abc'}))
assert.equal(pendingChanges({...draft,title:'Novo título'},published)[0].label,'Título principal')
assert.equal(pendingChanges({...draft,title:'Novo título'},published,['hero']).length,2)
assert.equal(pendingChanges(draft,published,['hero'])[0].label,'Imagem principal')
assert.equal(pendingChanges(draft,published).length,0,'reverting a public field must clear its notification')
assert.equal(pendingChanges({...draft,blocks:[]},published)[0].id,'remove:'+block)
assert.equal(pendingChanges(draft,null).length,1)
assert.notEqual(reviewSignature(draft,'image-v1'),reviewSignature(draft,'image-v2'))
assert.deepEqual(wizardReadiness(draft,'https://dev.hubpages.com.br',false,true,1),[true,true,true,true,true,false,false])
assert.equal(wizardReadiness({...draft,checkoutUrl:'',publicUrl:''},'https://dev.hubpages.com.br',false,false,1)[2],false)
console.log('PASS: meaningful pending changes, navigation ignored, image replacement, reversal, review invalidation and honest progress states')
