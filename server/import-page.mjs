import {parse,parseFragment,serialize,serializeOuter} from 'parse5'
import {randomUUID} from 'node:crypto'
import * as css from 'css-tree'
import {fetchImportResource,importUrl} from './import-fetch.mjs'
import {safeImportHtml,safeImportCss} from './import-sanitize.mjs'
import {detectMedia} from './media.mjs'
import {PlatformError} from './platform-error.mjs'
const attr=(node,key)=>node.attrs?.find(a=>a.name===key)?.value||''
const set=(node,name,value)=>{node.attrs=(node.attrs||[]).filter(a=>a.name!==name);node.attrs.push({name,value})}
const text=node=>node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join(' ')
function find(node,predicate){if(predicate(node))return node;for(const child of node.childNodes||[]){const result=find(child,predicate);if(result)return result}}
const walk=(node,fn)=>{fn(node);for(const child of node.childNodes||[])walk(child,fn)}
export async function importSalesPage(source,{fetchResource=fetchImportResource,signal=AbortSignal.timeout(65000)}={}){
 const url=importUrl(source).href,fetcher=(value,limit)=>fetchResource(value,{limit,signal}),page=await fetcher(url,2*1024*1024)
 if(!String(page.headers['content-type']).includes('text/html'))throw new PlatformError(422,'O endereço deve apontar para uma página HTML pública.')
 const tree=parse(page.content.toString('utf8')),body=find(tree,n=>n.tagName==='body'),main=find(body,n=>n.tagName==='main')||body
 if(!main)throw new PlatformError(422,'Não foi possível identificar o conteúdo da página.')
 let contentRoot=main;const innerShells=[];for(let depth=0;depth<7;depth++){const elements=(contentRoot.childNodes||[]).filter(n=>n.tagName&&!['script','style','link'].includes(n.tagName));if(elements.length!==1||!['div','article','section'].includes(elements[0].tagName))break;contentRoot=elements[0];innerShells.push({tag:contentRoot.tagName,className:attr(contentRoot,'class'),id:attr(contentRoot,'id'),style:attr(contentRoot,'style')})}
 const title=(text(find(main,n=>n.tagName==='h1')||find(tree,n=>n.tagName==='title')||{childNodes:[]}).replace(/\s+/g,' ').trim()||new URL(page.url).hostname).slice(0,240)
 const modelName=(title.replace(/[¿?¡!]/g,'').split(/[.!|]/)[0].trim().slice(0,65)||'Minha vitrine'),media=[],assets=[],cache=new Map(),buttons={},sourceLinks={},report={sections:0,images:0,buttons:0,removedScripts:0,removedNavigation:0,missingMedia:0}
 walk(tree,n=>{if(n.tagName==='script')report.removedScripts++})
 let total=page.content.length
 const asset=async raw=>{let target;try{target=new URL(raw,page.url).href;if(!target.startsWith('https://'))return ''}catch{return ''}if(assets.length>=70)throw new PlatformError(422,'A página excede 70 mídias. Importe uma página mais enxuta.')
  let stored=cache.get(target)
  if(stored===undefined){try{const result=await fetcher(target,8*1024*1024),mime=detectMedia(result.content);if(!mime)throw Error('unsupported');stored={mime,content:result.content};cache.set(target,stored)}catch{cache.set(target,null);stored=null}}
  if(!stored){report.missingMedia++;return ''}
  total+=stored.content.length;if(total>45*1024*1024)throw new PlatformError(422,'A página excede 45 MB de recursos.')
  const id=randomUUID();assets.push({id,imageUrl:'',mediaType:stored.mime.startsWith('video/')?'video':'image',title:(stored.mime.startsWith('video/')?'Vídeo':'Imagem')+' '+(assets.length+1)});media.push({slot:id,mime:stored.mime,content:stored.content});report.images++;return id
 }
 const inlineStyle=async raw=>{let value=raw;for(const match of [...raw.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)]){const id=await asset(match[1]);value=value.replace(match[0],id?`var(--hp-asset-${id})`:'none')}return safeImportCss(value,true)}
 const sheets=[];walk(tree,node=>{if(node.tagName==='style')sheets.push({inline:text(node)});if(node.tagName==='link'&&attr(node,'rel')==='stylesheet')sheets.push({url:attr(node,'href')})})
 let sheetCount=0
 async function sheet(raw,base){let ast;try{ast=css.parse(raw)}catch{return ''}const imports=[];css.walk(ast,{visit:'Atrule',enter(node,item,list){if(node.name==='import'){const child=node.prelude?.children?.first;if(child?.type==='String'||child?.type==='Url')imports.push(child.value);list.remove(item)}else if(node.name==='font-face')list.remove(item)}})
 let prefix='';for(const child of imports.slice(0,4)){if(sheetCount++>8)break;try{const target=new URL(child,base).href,result=await fetcher(target,450000);prefix+=await sheet(result.content.toString('utf8'),target)}catch{/* Optional style import is skipped. */}}
 const urls=[];css.walk(ast,{visit:'Url',enter(node,item,list){urls.push({node,item,list})}});for(const {node,item,list}of urls){const id=await asset(new URL(node.value,base).href);const replacement=css.parse(id?`var(--hp-asset-${id})`:'none',{context:'value'}).children;list.replace(item,replacement)}return prefix+css.generate(ast)}
 if(sheets.length>40)throw new PlatformError(422,'Esta página possui mais de 40 folhas de estilo. Use um endereço de oferta mais enxuto.')
 let styles='';for(const source of sheets){try{if(Object.hasOwn(source,'inline'))styles+=await sheet(source.inline,page.url);else{sheetCount++;const result=await fetcher(new URL(source.url,page.url).href,450000);styles+=await sheet(result.content.toString('utf8'),new URL(source.url,page.url).href)}}catch(error){if(error instanceof PlatformError&&/45 MB|70 mídias/.test(error.message))throw error;throw new PlatformError(422,'Não foi possível copiar os estilos visuais da página. Confira o endereço e tente novamente.')}}
 const transform=async node=>{if(node.tagName)node.attrs=(node.attrs||[]).filter(a=>!a.name.startsWith('data-hp-'));if(['script','noscript','style','link','template','object','embed','base','meta'].includes(node.tagName)){if(node.tagName==='script')report.removedScripts++;return null}
  if(['form','input','select','textarea','option'].includes(node.tagName)){const placeholder=attr(node,'placeholder');node.tagName=node.tagName==='form'?'div':'span';node.nodeName=node.tagName;if(placeholder&&!node.childNodes?.length)node.childNodes=[{nodeName:'#text',value:placeholder}]}
  if(node.nodeName==='#text'){if(!node.value.trim())return node;let preserve=false;for(let parent=node.parentNode;parent;parent=parent.parentNode)if(['pre','code'].includes(parent.tagName))preserve=true;if(!preserve)node.value=node.value.replace(/[ \t\r\n]+/g,' ');return{nodeName:'span',tagName:'span',namespaceURI:'http://www.w3.org/1999/xhtml',attrs:[{name:'data-hp-text',value:'t-'+randomUUID()},...(preserve?[{name:'data-hp-pre',value:'pre'}]:[])],childNodes:[node]}}
  if(node.tagName==='img'||node.tagName==='video'||node.tagName==='iframe'){
   const src=attr(node,'data-src')||attr(node,'src')||(node.tagName==='video'?attr(find(node,n=>n.tagName==='source')||{},'src'):'')
   if(/facebook\.com\/tr|google-analytics|doubleclick|pixel|tracking/i.test(src)||Number(attr(node,'width'))===1&&Number(attr(node,'height'))===1)return null
   if(node.tagName==='iframe'){let embed='';try{const u=new URL(src,page.url);if(/^(www\.)?(youtube\.com|youtube-nocookie\.com)$/.test(u.hostname)&&/^\/embed\/[\w-]+$/.test(u.pathname))embed='https://www.youtube-nocookie.com'+u.pathname;if(u.hostname==='player.vimeo.com'&&/^\/video\/\d+$/.test(u.pathname))embed=u.origin+u.pathname}catch{/* Unsupported widget. */}if(embed){const id=randomUUID();assets.push({id,imageUrl:'',mediaType:'image',title:'Vídeo incorporado',embedUrl:embed});set(node,'data-hp-asset',id)}else{report.missingMedia++;return null}}
   else{const id=await asset(src);set(node,'data-hp-asset',id||randomUUID());if(id&&node.tagName==='video'){const current=assets.find(a=>a.id===id);current.videoOptions=Object.fromEntries(['autoplay','loop','muted','controls'].map(key=>[key,(node.attrs||[]).some(a=>a.name===key)]))}if(!id)assets.push({id:attr(node,'data-hp-asset'),imageUrl:'',mediaType:'image',title:attr(node,'alt')||'Substitua esta mídia'});node.childNodes=[]}
  }
  if(node.tagName==='a'||node.tagName==='button'){
   const href=attr(node,'href'),isAnchor=href.startsWith('#')||(()=>{try{const a=new URL(href,page.url),b=new URL(page.url);return a.origin===b.origin&&a.pathname===b.pathname&&!!a.hash}catch{return false}})()
   if(isAnchor){const hash=new URL(href,page.url).hash,id='nav-'+randomUUID();set(node,'href',hash);set(node,'data-hp-button',id);buttons[id]={enabled:true,label:text(node).replace(/\s+/g,' ').trim().slice(0,100),anchor:hash,url:'',inheritLink:false,useSourceLabel:true}}
   else if(/hotmart|kiwify|checkout|buy|compr|pay\.|monetizze|eduzz|button|\bbtn\b|\bcta\b/i.test(href+' '+attr(node,'class'))||/quiero|quero|compr|obter|garant|oferta|adquir|buy|order|empez|começar/i.test(text(node))){const id='buy-'+randomUUID();set(node,'data-hp-button',id);buttons[id]={enabled:true,label:text(node).replace(/\s+/g,' ').trim().slice(0,100)||'Quero comprar',url:'',inheritLink:true,useSourceLabel:true};try{const original=new URL(href,page.url);if(['http:','https:'].includes(original.protocol)&&!original.username&&!original.password&&original.href.length<=2000)sourceLinks[id]=original.href}catch{/* Script-only actions get a new checkout in the Studio. */}report.buttons++}
   else{node.tagName='span';node.nodeName='span';report.removedNavigation++}
  }
  const inline=attr(node,'style');if(inline)set(node,'style',await inlineStyle(inline))
  const children=[];for(const child of node.childNodes||[]){const next=await transform(child);if(next)children.push(next)}node.childNodes=children;return node
 }
 const blocks=[],excluded=new Set(['script','noscript','style','link','template','base','meta'])
 const addBlock=async sources=>{const nodes=[];for(const source of sources){const node=await transform(source);if(node)nodes.push(node)}const fragment={nodeName:'#document-fragment',childNodes:nodes};const html=safeImportHtml(serialize(fragment));if(!html.trim())return null;const first=nodes.find(n=>n.tagName),heading=first&&find(first,n=>/^h[1-6]$/.test(n.tagName));blocks.push({id:randomUUID(),kind:'content',title:text(heading||fragment).replace(/\s+/g,' ').trim().slice(0,120)||`Seção ${blocks.length+1}`,body:'',imageUrl:'',showButton:false,importHtml:html,style:{}});return{nodeName:'div',tagName:'div',namespaceURI:'http://www.w3.org/1999/xhtml',attrs:[{name:'data-hp-slot',value:String(blocks.length-1)}],childNodes:[]}}
 const path=new Set();for(let current=contentRoot;current&&current!==body;current=current.parentNode)path.add(current)
 const contentElements=(contentRoot.childNodes||[]).filter(n=>n.tagName&&!excluded.has(n.tagName)),group=Math.max(1,Math.ceil(contentElements.length/30))
 async function scaffold(node){if(node.tagName&&excluded.has(node.tagName))return null;if(node.nodeName==='#text')return node.value.trim()?await addBlock([node]):node
  if(node===contentRoot){const children=[];for(let i=0;i<contentElements.length;i+=group){const placeholder=await addBlock(contentElements.slice(i,i+group));if(placeholder)children.push(placeholder)}node.childNodes=children}
  else if(path.has(node)||node===body){const children=[];for(const child of node.childNodes||[]){const next=await scaffold(child);if(next)children.push(next)}node.childNodes=children}
  else return addBlock([node])
  if(node.tagName){node.attrs=(node.attrs||[]).filter(a=>!a.name.startsWith('data-hp-'));const value=attr(node,'style');if(value)set(node,'style',await inlineStyle(value))}return node
 }
 await scaffold(body)
 if(!blocks.length||blocks.length>40)throw new PlatformError(422,'Não foi possível organizar esta página em até 40 seções editáveis. Use o endereço direto da página de vendas.')
 let rootHtml=safeImportHtml(serialize(body),{layout:true})
 if(!rootHtml.includes('data-hp-slot='))throw new PlatformError(422,'A estrutura desta página depende de um aplicativo da origem. Não foi possível preservar o conteúdo editável.')
 const palette={},colors=new Map()
 const token=hex=>{hex=hex.toLowerCase();if(hex.length===4)hex='#'+hex.slice(1).split('').map(x=>x+x).join('');if(!colors.has(hex)&&colors.size<200){const id='c'+colors.size;colors.set(hex,id);palette[id]=hex}return colors.has(hex)?`var(--hp-${colors.get(hex)})`:hex}
 function colorize(value,inline=false){let ast;try{ast=css.parse(value,{context:inline?'declarationList':'stylesheet'})}catch{return value}
  css.walk(ast,{visit:'Declaration',enter(node){if(node.value.type==='Raw')try{node.value=css.parse(node.value.value,{context:'value'})}catch{/* Leave unusual custom properties intact. */}}})
  css.walk(ast,{enter(node,item,list){if(node.type==='Hash'&&/^(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(node.value)&&list){list.replace(item,css.parse(token('#'+node.value),{context:'value'}).children);return css.walk.skip}if(node.type==='Function'&&/^rgba?$/i.test(node.name)&&list){const match=css.generate(node).match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([.\d]+))?\s*\)$/i);if(match){const hex='#'+match.slice(1,4).map(v=>Math.min(255,Number(v)).toString(16).padStart(2,'0')).join(''),alpha=match[4]===undefined?1:Math.min(1,Number(match[4])),mapped=token(hex);list.replace(item,css.parse(alpha<1?`color-mix(in srgb,${mapped} ${alpha*100}%,transparent)`:mapped,{context:'value'}).children);return css.walk.skip}}if(node.type==='PseudoClassSelector'&&node.name==='root')node.name='host';if(node.type==='TypeSelector'&&['html','body'].includes(node.name)){node.type='ClassSelector';node.name='hp-import-body'}}})
  return css.generate(ast).replace(/\.hp-import-body\s+\.hp-import-body/g,'.hp-import-body')
 }
 styles=colorize(safeImportCss(styles))
 {const fragment=parseFragment(rootHtml);walk(fragment,node=>{const value=attr(node,'style');if(value)set(node,'style',colorize(value,true))});rootHtml=serialize(fragment)}
 for(const block of blocks){const fragment=parseFragment(block.importHtml);walk(fragment,node=>{const value=attr(node,'style');if(value)set(node,'style',colorize(value,true))});block.importHtml=serialize(fragment)}
 const bodyStyle=colorize(await inlineStyle(attr(body,'style')),true),shellStyle=colorize(await inlineStyle(attr(main,'style')),true);for(const shell of innerShells)shell.style=colorize(await inlineStyle(shell.style),true)
 report.sections=blocks.length
 const publicSource=new URL(page.url);publicSource.search='';
 return{draft:{name:modelName,title,description:'',locale:'pt-BR',template:'imported',color:'#15534f',step:2,addressAuto:true,visitedSteps:[1],checkoutUrl:'',publicUrl:'',imageUrl:assets.find(a=>a.mediaType==='image')?.imageUrl||'',blocks,templateButtons:buttons,importedAssets:assets,imported:{version:1,rootHtml,sourceUrl:publicSource.href,authorized:true,modelName,css:styles,bodyClass:attr(body,'class'),bodyStyle,shellStyle,shellClass:attr(main,'class'),shellId:attr(main,'id'),innerShells,sourceLinks,palette,report}},media}
}
