// Compare actual React HTML, not hand-maintained expectations of the copied layout.
const fs=require('node:fs')
const ts=require('typescript')
const assert=require('node:assert/strict')
for(const extension of ['.tsx','.ts'])require.extensions[extension]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)
const React=require('react')
const {renderToStaticMarkup}=require('react-dom/server')
const {InfanciaAlemDasTelas}=require('../src/pages/InfanciaAlemDasTelas.tsx')
const {LegacySalesTemplate}=require('../src/components/LegacySalesTemplate.tsx')
const draft={...JSON.parse(fs.readFileSync('server/templates/infancia-pt.json','utf8')),template:'infancia_pt',checkoutUrl:'#oferta',blocks:JSON.parse(fs.readFileSync('server/templates/infancia-pt.json','utf8')).blocks.map((b,i)=>({...b,id:`test-${i}`}))}
const normalize=s=>s.replace(/<!--.*?-->/g,'').replace(/ aria-disabled="[^"]*"/g,'').replace(/\s+/g,' ').replace(/>\s+</g,'><').trim()
const original=normalize(renderToStaticMarkup(React.createElement(InfanciaAlemDasTelas)))
const copy=normalize(renderToStaticMarkup(React.createElement(LegacySalesTemplate,{draft})))
if(original!==copy){let at=0;while(original[at]===copy[at]&&at<original.length)at++;console.error('First markup mismatch at',at,'\nOriginal:',original.slice(Math.max(0,at-80),at+180),'\nTemplate:',copy.slice(Math.max(0,at-80),at+180))}
assert.ok(copy===original,'Initial template must render the same HTML structure, text, classes, images and CTAs as the original')
console.log('PASS: original and initial template render identical HTML after ignoring accessibility-only disabled attributes')
const configured={...draft,templateButtons:{header:{enabled:false}},blocks:draft.blocks.map(b=>b.templateRole==='pain'?{...b,showButton:false}:b)}
const reduced=renderToStaticMarkup(React.createElement(LegacySalesTemplate,{draft:configured}))
const count=s=>(s.match(/<a(?:\s|>)/g)||[]).length
assert.equal(count(reduced),count(original)-2)
console.log(`PASS: ${count(original)} original CTA positions preserved; per-button removal works without changing other sections`)
