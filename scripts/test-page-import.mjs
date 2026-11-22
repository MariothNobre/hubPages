import assert from 'node:assert/strict'
import {publicImportAddress,importUrl,fetchImportResource} from '../server/import-fetch.mjs'
import {importSalesPage} from '../server/import-page.mjs'
import {safeImportHtml,safeImportCss} from '../server/import-sanitize.mjs'
import {validateDraft,createDraft,publishDraft} from '../server/platform.mjs'
import {activeImportedAssets,activeImportedButtons} from '../shared/imported-palette.mjs'
for(const address of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.0.1','0.0.0.0','::1','::ffff:127.0.0.1','fc00::1','fe80::1','224.0.0.1'])assert.equal(publicImportAddress(address),false,address)
assert.equal(publicImportAddress('1.1.1.1'),true)
for(const url of ['http://example.test','https://admin:secret@example.test','https://example.test:8080','https://localhost/','https://thing.internal'])assert.throws(()=>importUrl(url))
await assert.rejects(fetchImportResource('https://public.example.test/',{resolve:async()=>[{address:'127.0.0.1',family:4}]}),/pública/)
await assert.rejects(fetchImportResource('https://public.example.test/',{resolve:async()=>[{address:'1.1.1.1',family:4},{address:'10.0.0.1',family:4}]}),/pública/)
const dirty='<script>alert(1)</script><img src="https://evil.test/a" onerror="alert(1)"><iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe><a href="javascript:alert(1)">X</a><p style="background:url(https://evil.test/a);color:#333">Seguro</p>'
const clean=safeImportHtml(dirty);assert.ok(!/script|onerror|srcdoc|https:|javascript:/i.test(clean));assert.ok(clean.includes('Seguro'))
const cleanCss=safeImportCss('@import "https://evil.test/a";@font-face{font-family:x;src:url(https://evil.test/font)}p{background:u\\72l(https://evil.test/a);color:red}');assert.ok(!/https:|@import|font-face|url\(/i.test(cleanCss))
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6x2cAAAAASUVORK5CYII=','base64'),requested=[]
const html='<html><head><style>body{color:#153b2b;background:#fff}.hero{background-image:url(/picture.png)}</style><script>oldPixel()</script></head><body><main><div class="outer"><section id="offer"><h1>Meu produto original</h1><img src="/picture.png"><a href="https://pay.hotmart.com/example">Quero comprar</a></section><section><p>Outro texto</p><img src="/picture.png"><a href="#offer">Oferta</a><a href="/outra-pagina">Navegação</a></section></div></main><noscript><img src="https://facebook.com/tr"></noscript></body></html>'
const result=await importSalesPage('https://source.example.test/',{fetchResource:async url=>{requested.push(url);return{status:200,url,headers:{'content-type':url.endsWith('picture.png')?'image/png':'text/html'},content:url.endsWith('picture.png')?png:Buffer.from(html)}}})
assert.equal(result.draft.blocks.length,2);assert.equal(result.draft.importedAssets.length,3,'each current media space has an independent slot')
assert.equal(requested.filter(url=>url.endsWith('/picture.png')).length,1,'one network request per resource, with independent local slots')
assert.ok(requested.every(url=>!url.includes('outra-pagina')&&!url.includes('facebook')))
assert.ok(result.draft.blocks[1].importHtml.includes('href="#offer"'));assert.ok(!result.draft.blocks[1].importHtml.includes('href="/outra-pagina"'))
assert.equal(result.draft.metaPixelId,undefined);assert.equal(result.draft.checkoutUrl,'');assert.equal(result.draft.imported.report.buttons,1)
const draft=validateDraft(result.draft);assert.equal(draft.imported.hubpagesCreated,undefined)
const forged=validateDraft({...draft,imported:{...draft.imported,hubpagesCreated:true}});assert.equal(forged.imported.hubpagesCreated,undefined,'ordinary imports never gain HubPages branding')
const state={};const page=createDraft(state,'test-owner',draft);assert.equal(page.origin,'imported')
assert.throws(()=>publishDraft(state,'test-owner',page.id,page.revision,'https://hubpages.com.br'),/domínio próprio/)
const removed={...draft,blocks:[draft.blocks[1]]};assert.ok(activeImportedAssets(removed).length<draft.importedAssets.length);assert.ok(Object.keys(activeImportedButtons(removed)).every(id=>id.startsWith('nav-')))
console.log('PASS: import network boundaries, CSS/HTML safety, one document, anchor-only navigation, independent current media, origin and branding policy')

const lateCss='<html><head>'+Array.from({length:13},()=>'<style>.base{margin:0}</style>').join('')+'<link rel="stylesheet" href="/late.css"></head><body><header><p>Cabeçalho preservado</p></header><main><section><h1>Oferta</h1></section><section><p>Conteúdo</p></section></main><footer><p>Rodapé original</p></footer></body></html>'
const scaffold=await importSalesPage('https://source.example.test/',{fetchResource:async url=>({url,headers:{'content-type':'text/html'},content:Buffer.from(url.endsWith('late.css')?'.late{color:#abcdef}':lateCss)})})
assert.equal(scaffold.draft.blocks.length,4);assert.ok(scaffold.draft.blocks[0].importHtml.includes('Cabeçalho preservado'));assert.ok(scaffold.draft.blocks[3].importHtml.includes('Rodapé original'));assert.ok(scaffold.draft.imported.css.includes('.late'));assert.ok(scaffold.draft.imported.rootHtml.includes('data-hp-slot="3"'));assert.ok(Object.values(scaffold.draft.imported.palette).includes('#abcdef'))
assert.equal(safeImportHtml('<div data-hp-slot="1"></div>').includes('data-hp-slot'),false)
console.log('PASS: full body scaffold, original header/footer and late stylesheet capture')

// Empty inline styles are valid placeholders, not links to an undefined URL.
const emptyRequests=[]
const emptyStyles=await importSalesPage('https://source.example.test/',{fetchResource:async url=>{emptyRequests.push(url);assert.equal(url,'https://source.example.test/');return{url,headers:{'content-type':'text/html'},content:Buffer.from('<html><head><style></style><style>h1{color:#123456}</style><style> </style></head><body><main><section><h1>Oferta com estilos vazios</h1></section></main></body></html>')}}})
assert.equal(emptyRequests.length,1);assert.ok(emptyStyles.draft.imported.css.includes('h1'));assert.ok(emptyStyles.draft.blocks.some(block=>block.importHtml.includes('Oferta com estilos vazios')))
console.log('PASS: empty inline style placeholders never trigger a request to /undefined')

const astroSource='<html><head><style></style><style>.offer[data-v-5636d6b6]{color:#123456}</style></head><body><div><astro-island component-url="/remote.js" props="secret-state"><main class="page"><section data-v-5636d6b6="" class="offer"><h1 data-astro-cid-abc123="">Oferta Astro preservada</h1></section><section><p>Conteúdo editável</p></section></main></astro-island></div></body></html>'
const astro=await importSalesPage('https://source.example.test/',{fetchResource:async url=>({url,headers:{'content-type':'text/html'},content:Buffer.from(astroSource)})})
assert.ok(astro.draft.imported.rootHtml.includes('data-hp-slot="0"'));assert.ok(astro.draft.imported.rootHtml.includes('display:contents'));assert.ok(!/astro-island|component-url|remote.js|secret-state/.test(astro.draft.imported.rootHtml));assert.ok(astro.draft.blocks[0].importHtml.includes('data-v-5636d6b6'));assert.ok(astro.draft.blocks[0].importHtml.includes('Oferta Astro preservada'));assert.ok(astro.draft.imported.css.includes('[data-v-5636d6b6]'))
console.log('PASS: inert Astro wrappers preserve slots and scoped styles without remote components or props')

assert.ok(astro.draft.blocks[0].importHtml.includes('data-astro-cid-abc123'))
await assert.rejects(importSalesPage('https://source.example.test/',{fetchResource:async url=>({url,headers:{'content-type':'text/html'},content:Buffer.from('<html><body><unknown-shell><main><section><h1>Oferta inacessível</h1></section></main></unknown-shell></body></html>')})}),/estrutura.*aplicativo/)
console.log('PASS: scoped Astro IDs are preserved and an empty sanitized scaffold cannot be reported as a successful import')

const nestedSections='<html><body><header><p>Marca</p></header><main><div><div>'+Array.from({length:20},(_,i)=>'<section><h2>Parte '+i+'</h2><div><p>Conteúdo '+i+'</p></div></section>').join('')+'</div></div></main><footer><p>Rodapé</p></footer></body></html>'
const nested=await importSalesPage('https://source.example.test/',{fetchResource:async url=>({url,headers:{'content-type':'text/html'},content:Buffer.from(nestedSections)})})
assert.equal(nested.draft.blocks.length,22);assert.ok(nested.draft.blocks.some(b=>b.importHtml.includes('Parte 19')));assert.match(nested.draft.imported.rootHtml,/data-hp-slot="21"/)
console.log('PASS: deeply nested semantic sections become independent editable blocks with original header/footer')
