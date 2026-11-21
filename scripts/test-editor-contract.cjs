const fs=require('node:fs'),ts=require('typescript'),assert=require('node:assert/strict')
for(const extension of ['.tsx','.ts'])require.extensions[extension]=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file)
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const {LegacySalesTemplate}=require('../src/components/LegacySalesTemplate.tsx'),{LegacySalesTemplateEs}=require('../src/components/LegacySalesTemplateEs.tsx')
const editing={text(){},select(){},image(){},resize(){},button(){}}
for(const [locale,Component]of [['pt',LegacySalesTemplate],['es',LegacySalesTemplateEs]]){
  const draft=JSON.parse(fs.readFileSync(`server/templates/infancia-${locale}.json`,'utf8'));draft.template=locale==='pt'?'infancia_pt':'infancia_es';draft.checkoutUrl='https://pay.example.test/buy';draft.blocks=draft.blocks.map((b,i)=>({...b,id:`test-${i}`}))
  const render=(value,editor=false)=>renderToStaticMarkup(React.createElement(Component,{draft:value,...(editor?{editing}:{})}))
  const pain=draft.blocks.find(b=>b.templateRole==='pain'),copy={...structuredClone(pain),id:'copy-section',templateRole:'',sourceRole:'pain'};const copied=render({...draft,blocks:[...draft.blocks,copy]});assert.equal((copied.match(/class="sales-v2-pain"/g)||[]).length,2,'duplicated native section preserves original structure');const independent=render({...draft,blocks:[...draft.blocks,{...copy,title:'Título da cópia'}]});assert.ok(independent.includes('Título da cópia'));assert.ok(independent.includes(pain.title),'copy edits preserve the source');const ids=[...copied.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'duplicated sections use distinct HTML ids')
  const initial=render(draft),editable=render(draft,true)
  assert.ok(!/<a\b[^>]*href=/.test(editable),'editing must never contain a navigable checkout link')
  assert.equal((editable.match(/aria-label="Editar preço da oferta"/g)||[]).length,4,'all four price positions must be editable')
  assert.ok(initial.includes('title="Feito com HubPages.com.br"'));assert.ok(!initial.includes('class="sales-v2-logo"'))
  assert.ok(!initial.includes('editor-action-toggle'))
  const countSection=(html,key)=>{const section=html.slice(html.indexOf(`class="sales-v2-${key}"`)).split('</section>')[0];return(section.match(/<article/g)||[]).length}
  const changed={...draft,sectionCounts:{method:3,manual:2,bonus:2,sample:4},blocks:draft.blocks.map(b=>b.kind==='author'?{...b,enabled:false}:b)}
  const output=render(changed);assert.equal(countSection(output,'method'),3);assert.equal(countSection(output,'manual'),2);assert.equal(countSection(output,'bonuses'),2);assert.ok(!output.includes('class="sales-v2-author"'))
  assert.ok(render(changed,true).includes('class="sales-v2-author"'),'hidden author remains editable')
  const hidden=render({...draft,sampleEnabled:false});assert.ok(!hidden.includes('class="sales-v2-tasting"'));assert.ok(!hidden.includes('class="sales-v2-preview-button'))
  const individual=render({...draft,templateButtons:{sampleSolution:{enabled:false}}});assert.ok(!individual.includes('sales-v2-preview-button--dark'));assert.ok(individual.includes('sales-v2-preview-button--large'))
  const gallery=render({...draft,offerGallery:Array.from({length:6},(_,i)=>({id:'gallery-'+i,title:'Media '+i,imageUrl:`https://example.test/${i}.png`,mediaType:i===2?'video':'image'}))});assert.ok(gallery.includes('data-gallery-count="6"'));assert.ok(gallery.includes('<video'));assert.ok(gallery.includes('autoPlay=""'));assert.ok(gallery.includes('loop=""'));assert.ok(!gallery.includes('muted=""'))
}
;(async()=>{
  const {validateDraft}=await import('../server/platform.mjs'),{pendingChanges}=await import('../shared/studio-wizard.mjs')
  assert.throws(()=>validateDraft({blocks:[{sourceRole:'custom:cycle'}]}),/Origem/)
  assert.throws(()=>validateDraft({sectionCounts:{bonus:21}}),/Quantidade/)
  assert.throws(()=>validateDraft({offerGallery:Array.from({length:7},()=>({id:crypto.randomUUID(),imageUrl:''}))}),/até 6/)
  const input={name:'Teste',title:'Título',blocks:[],sectionCounts:{sample:3},sampleEnabled:false,mediaType:'video',offerGallery:[{id:crypto.randomUUID(),imageUrl:'https://example.test/cover.png'}]}
  const valid=validateDraft(input);assert.equal(valid.sampleEnabled,false);assert.equal(valid.mediaType,'video');assert.deepEqual(valid.sectionCounts,{sample:3});assert.equal(valid.offerGallery.length,1)
  assert.equal(pendingChanges({...input,sectionCounts:{}},{...input,sectionCounts:undefined}).length,0,'default shape upgrades must not create fake pending changes')
  console.log('PASS: PT/ES template editing boundary, four editable prices, independent buttons, cards, optional author/sample, branding, six-media gallery and schema persistence')
})().catch(error=>{console.error(error);process.exitCode=1})
