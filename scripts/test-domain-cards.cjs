const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict')
require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{StudioPageList}=require('../src/components/StudioPageList.tsx')
const page={id:'fixture',name:'Página teste',editorialStatus:'published',updatedAt:new Date().toISOString(),publication:{url:'https://hubpages.com.br/fixture'},customDomains:[{id:'domain',hostname:'oferta.example.com',url:'https://oferta.example.com'}]}
const render=(p,trash=false,view='cards')=>renderToStaticMarkup(React.createElement(StudioPageList,{pages:[p],trash,view,onDisconnect:async()=>{}}))
for(const view of ['cards','list']){const html=render(page,false,view);assert.ok(html.includes('Domínio próprio vinculado'));assert.ok(html.includes('href="https://oferta.example.com"'));assert.ok(html.includes('Desvincular domínio'));assert.ok(!html.includes(page.publication.url),'hide HubPages URL only in card while connected')}
const disconnected=render({...page,customDomains:[]});assert.ok(disconnected.includes(page.publication.url));assert.ok(!disconnected.includes('Domínio próprio vinculado'))
const draft=render({...page,editorialStatus:'draft'});assert.ok(draft.includes('Publique a página'));assert.ok(!draft.includes('href="https://oferta.example.com"'))
assert.ok(!render(page,true).includes('Desvincular domínio'))
console.log('PASS: cards/list prefer linked domains, safe draft/trash states and HubPages fallback after disconnect')
