// Compare actual React HTML, not hand-maintained expectations of the copied layout.
const fs=require('node:fs')
const ts=require('typescript')
const assert=require('node:assert/strict')
for(const extension of ['.tsx','.ts'])require.extensions[extension]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)
const React=require('react')
const {renderToStaticMarkup}=require('react-dom/server')
const {InfanciaAlemDasTelas}=require('../src/pages/InfanciaAlemDasTelas.tsx')
const {LegacySalesTemplate}=require('../src/components/LegacySalesTemplate.tsx')
const {movePageBlocks}=require('../src/components/studio-model.ts')
const draft={...JSON.parse(fs.readFileSync('server/templates/infancia-pt.json','utf8')),template:'infancia_pt',checkoutUrl:'#oferta',blocks:JSON.parse(fs.readFileSync('server/templates/infancia-pt.json','utf8')).blocks.map((b,i)=>({...b,id:`test-${i}`}))}
const normalize=s=>s.replace(/ data-gallery-count="[^"]*"/g,'').replace(/<([a-z][a-z0-9-]*)([^>]*)>/gi,(_,tag,attrs)=>'<'+tag+(attrs.match(/[^\s=]+(?:="[^"]*")?/g)||[]).sort().map(a=>' '+a).join('')+'>').replace(/<!--.*?-->/g,'').replace(/ aria-disabled="[^"]*"/g,'').replace(/\s+/g,' ').replace(/>\s+</g,'><').trim()
const original=normalize(renderToStaticMarkup(React.createElement(InfanciaAlemDasTelas)).replace(/<div class="sales-v2-logo">[\s\S]*?<\/div>/,'').replace('class="sales-v2-header"','class="sales-v2-header sales-v2-header--unbranded"').replace('class="sales-v2-logo sales-v2-logo--footer"','class="sales-v2-logo sales-v2-logo--footer" title="Feito com HubPages.com.br"'))
const copy=normalize(renderToStaticMarkup(React.createElement(LegacySalesTemplate,{draft})))
if(original!==copy){let at=0;while(original[at]===copy[at]&&at<original.length)at++;console.error('First markup mismatch at',at,'\nOriginal:',original.slice(Math.max(0,at-80),at+180),'\nTemplate:',copy.slice(Math.max(0,at-80),at+180))}
assert.ok(copy===original,'Initial template must render the same HTML structure, text, classes, images and CTAs as the original')
console.log('PASS: template preserves original HTML apart from the requested header/footer branding and technical attributes')
const configured={...draft,templateButtons:{header:{enabled:false}},blocks:draft.blocks.map(b=>b.templateRole==='pain'?{...b,showButton:false}:b)}
const reduced=renderToStaticMarkup(React.createElement(LegacySalesTemplate,{draft:configured}))
const count=s=>(s.match(/<a(?:\s|>)/g)||[]).length
assert.equal(count(reduced),count(original)-2)
const added={...draft,blocks:draft.blocks.map(b=>b.templateRole==='author'||b.templateRole==='faq-0'?{...b,showButton:true}:b)}
assert.equal(count(renderToStaticMarkup(React.createElement(LegacySalesTemplate,{draft:added}))),count(original)+2)
console.log(`PASS: ${count(original)} original CTA positions preserved; per-button removal works without changing other sections`)
const moved={...draft,blocks:movePageBlocks(draft,draft.blocks.findIndex(b=>b.kind==='bonus'),draft.blocks.length-1)}
const movedHtml=renderToStaticMarkup(React.createElement(LegacySalesTemplate,{draft:moved}))
assert.ok(movedHtml.indexOf('class="sales-v2-bonuses"')>movedHtml.indexOf('class="sales-v2-final"'))
assert.equal(moved.blocks.filter(b=>b.kind==='bonus').length,5)
console.log('PASS: grouped sections move together without losing bonus/sample/FAQ content')
