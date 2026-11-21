import assert from 'node:assert/strict'
import {templateThemes,templateTheme,themeVariables} from '../shared/template-themes.mjs'
import {validateDraft} from '../server/platform.mjs'
import {pendingChanges,reviewSignature} from '../shared/studio-wizard.mjs'
import {templateInput} from '../server/templates.mjs'
assert.equal(templateThemes.length,6)
assert.equal(new Set(templateThemes.map(t=>t.id)).size,6)
const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722}
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
for(const theme of templateThemes){
  const draft=validateDraft(templateInput({name:'Minha oferta',template:'infancia_pt',colorTheme:theme.id}))
  assert.equal(draft.colorTheme,theme.id)
  assert.equal(themeVariables(theme.id)['--theme-accent'],theme.accent)
  if(theme.id!=='original'){
    for(const color of [theme.primary,theme.dark,theme.accent])assert.ok(contrast(color,'#ffffff')>=4.5,theme.id+' button contrast')
    assert.ok(contrast(theme.ink,theme.paper)>=7,theme.id+' body contrast')
    assert.ok(contrast(theme.dark,theme.gold)>=4.5,theme.id+' secondary button contrast')
  }
}
assert.equal(templateTheme('unknown').id,'original')
assert.throws(()=>validateDraft({colorTheme:'unknown'}),/Tema/)
const old=validateDraft(templateInput({template:'infancia_pt'})),original={...old,colorTheme:'original'},changed={...old,colorTheme:'oceano'}
assert.ok(!('colorTheme'in old),'old drafts keep their original shape')
assert.equal(pendingChanges(original,old).length,0)
assert.ok(pendingChanges(changed,old).some(change=>change.id==='colorTheme'))
assert.notEqual(reviewSignature(changed),reviewSignature(old))
assert.equal(validateDraft(old).title,old.title)
console.log('PASS: six Aurora palettes, strict IDs, accessible color pairs, existing draft compatibility, publication changes and review invalidation')
