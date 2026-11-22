import type {Block,Draft} from './studio-model'
const marker='data-hp-node'
export function importedDocument(html:string,scope:string){const doc=new DOMParser().parseFromString(html,'text/html');let n=0;const used=new Set(Array.from(doc.body.querySelectorAll('[data-hp-node]'),node=>node.getAttribute(marker))),prefix='n-'+scope.replace(/[^a-zA-Z0-9-]/g,'').slice(0,40)+'-';for(const node of doc.body.querySelectorAll('*'))if(!node.hasAttribute(marker)){while(used.has(prefix+n))n++;const id=prefix+n++;node.setAttribute(marker,id);used.add(id)}return doc}
export function importedTarget(doc:Document,id:string){return doc.body.querySelector(`[${marker}="${id}"]`) as HTMLElement|null}
export function editImportedObject(block:Block,id:string,action:(node:HTMLElement,doc:Document)=>void){const doc=importedDocument(block.importHtml||'',block.id),node=importedTarget(doc,id);if(node)action(node,doc);return{...block,importHtml:doc.body.innerHTML}}
export function objectTitle(node:Element){return (node.textContent?.trim().replace(/\s+/g,' ').slice(0,70)||node.getAttribute('alt')||(node.classList.contains('grid-shape')?'Forma de fundo':['IMG','VIDEO','IFRAME'].includes(node.tagName)?'Imagem / vídeo':'Caixa / grupo'))}
export function objectChildren(node:Element){return Array.from(node.children).filter(n=>!n.hasAttribute('data-hp-text')&&!['BR','HR','PATH','SOURCE'].includes(n.tagName)) as HTMLElement[]}
export function clearObjectBackground(node:HTMLElement){node.setAttribute('data-hp-no-background','true');for(const name of ['background','background-color','background-image','box-shadow','border-color'])node.style.setProperty(name,name==='box-shadow'?'none':'transparent','important');if(!node.textContent?.trim()){node.style.setProperty('--shape-color','transparent','important');for(const svg of node.querySelectorAll('svg'))(svg as SVGElement).style.setProperty('fill','none','important')}if(['svg','path','rect'].includes(node.tagName.toLowerCase()))node.style.setProperty('fill','none','important')}
export function objectStyle(node:HTMLElement,values:Record<string,string>){for(const [key,value]of Object.entries(values))node.style.setProperty(key,value,'important')}
export function splitImportedBlocks(draft:Draft){if(!draft.imported)return{};const blocks:Block[]=[],replacements:string[]=[];for(const block of draft.blocks.filter(b=>b.importHtml)){const doc=importedDocument(block.importHtml||'',block.id),sections=Array.from(doc.body.querySelectorAll('section')).filter(n=>!n.parentElement?.closest('section'));if(sections.length>=2&&blocks.length+sections.length+draft.blocks.length-draft.blocks.indexOf(block)-1<=40){for(const section of sections){const at=blocks.length;blocks.push({...structuredClone(block),id:crypto.randomUUID(),title:objectTitle(section),importHtml:section.outerHTML});const slot=doc.createElement('div');slot.setAttribute('data-hp-slot',String(at));section.replaceWith(slot)}replacements.push(doc.body.innerHTML)}else{replacements.push(`<div data-hp-slot="${blocks.length}"></div>`);blocks.push(block)}}if(blocks.length===draft.blocks.filter(b=>b.importHtml).length)return{};const layout=new DOMParser().parseFromString(draft.imported.rootHtml||replacements.map((_,i)=>`<div data-hp-slot="${i}"></div>`).join(''),'text/html');for(const slot of Array.from(layout.body.querySelectorAll('[data-hp-slot]'))){const fragment=new DOMParser().parseFromString(replacements[Number(slot.getAttribute('data-hp-slot'))]||'','text/html');slot.replaceWith(...Array.from(fragment.body.childNodes))}return{blocks:[...blocks,...draft.blocks.filter(b=>!b.importHtml)],imported:{...draft.imported,rootHtml:layout.body.innerHTML,report:{...draft.imported.report,sections:blocks.length}}}}

// Keep scaffold slots in the same containers when blocks are inserted or removed.
export function reconcileImportedLayout(draft:Draft,blocks:Block[]):Partial<Draft>{
 if(!draft.imported?.rootHtml)return{}
 const old=draft.blocks.filter(b=>b.importHtml),next=blocks.filter(b=>b.importHtml)
 if(old.length===next.length&&old.every(b=>next.some(n=>n.id===b.id)))return{}
 const doc=new DOMParser().parseFromString(draft.imported.rootHtml,'text/html'),slots=new Map<string,Element>()
 for(const slot of Array.from(doc.body.querySelectorAll('[data-hp-slot]'))){const block=old[Number(slot.getAttribute('data-hp-slot'))];if(block)slots.set(block.id,slot)}
 for(const block of old)if(!next.some(n=>n.id===block.id)){slots.get(block.id)?.remove();slots.delete(block.id)}
 for(let i=0;i<next.length;i++)if(!slots.has(next[i].id)){const slot=doc.createElement('div');slot.setAttribute('data-hp-slot','0');const before=next.slice(i+1).map(b=>slots.get(b.id)).find(Boolean),after=next.slice(0,i).reverse().map(b=>slots.get(b.id)).find(Boolean);if(after)after.after(slot);else if(before)before.before(slot);else(doc.body.querySelector('main')||doc.body).append(slot);slots.set(next[i].id,slot)}
 Array.from(doc.body.querySelectorAll('[data-hp-slot]')).forEach((slot,i)=>slot.setAttribute('data-hp-slot',String(i)))
 return{imported:{...draft.imported,rootHtml:doc.body.innerHTML,report:{...draft.imported.report,sections:next.length}}}
}

// Source grids often have fixed row heights. Fit text containers and large backgrounds
// using visible geometry, without removing decorative shapes or source content.
export function fitImportedBoxes(block:Block,rendered:Element):Block{
 const doc=importedDocument(block.importHtml||'',block.id),boxes=Array.from(rendered.querySelectorAll('.text-box')) as HTMLElement[]
 const measured=boxes.map(element=>({element,rect:element.getBoundingClientRect(),height:Math.ceil(Math.max(element.scrollHeight,...Array.from(element.children).map(child=>child.getBoundingClientRect().bottom-element.getBoundingClientRect().top)))}))
 for(const {element,height}of measured){const id=element.getAttribute(marker),target=id?importedTarget(doc,id):null;if(!target)continue;objectStyle(target,{height:'auto','min-height':height+'px','max-height':'none',overflow:'visible','overflow-wrap':'anywhere','box-sizing':'border-box'});const parent=target.closest('.layout-element') as HTMLElement|null;if(parent)objectStyle(parent,{height:'auto','min-height':height+'px',overflow:'visible'})}
 const backgrounds=Array.from(rendered.querySelectorAll('.grid-shape')).filter(element=>element.getBoundingClientRect().width>=Math.min(rendered.getBoundingClientRect().width*.4,320))
 for(const element of backgrounds){const area=element.closest('.block-layout')||rendered,rect=element.getBoundingClientRect(),within=measured.filter(b=>area.contains(b.element)&&b.rect.right>rect.left&&b.rect.left<rect.right&&b.rect.top<=rect.bottom+8&&b.rect.bottom>=rect.top-8);if(!within.length)continue;const target=importedTarget(doc,element.getAttribute(marker)||'');if(!target)continue;const top=Math.min(rect.top,...within.map(b=>b.rect.top-12)),bottom=Math.max(rect.bottom,...within.map(b=>b.rect.top+b.height+16)),dy=top-rect.top;objectStyle(target,{height:Math.ceil(bottom-top)+'px','max-height':'none',...(dy<0?{'--hp-move-y':((parseFloat(target.style.getPropertyValue('--hp-move-y'))||0)+dy)+'px',translate:'var(--hp-move-x,0px) var(--hp-move-y,0px)'}:{})});const root=doc.body.firstElementChild as HTMLElement|null,liveRoot=rendered.querySelector('[data-hp-node]');if(root&&liveRoot&&bottom>liveRoot.getBoundingClientRect().bottom)objectStyle(root,{'min-height':Math.ceil(bottom-liveRoot.getBoundingClientRect().top+16)+'px',height:'auto',overflow:'visible'})}
 return{...block,importHtml:doc.body.innerHTML}
}

export function removeImportedBackdrop(block:Block,nodeId:string,rendered:Element):Block{
 const doc=importedDocument(block.importHtml||'',block.id),selected=importedTarget(doc,nodeId),live=rendered.querySelector(`[data-hp-node="${nodeId}"]`);if(!selected||!live)return block
 if(selected.classList.contains('grid-shape')){selected.remove();return{...block,importHtml:doc.body.innerHTML}}
 const rect=live.getBoundingClientRect(),candidates=Array.from(rendered.querySelectorAll('.grid-shape')).map(element=>{const area=element.getBoundingClientRect(),overlap=Math.max(0,Math.min(rect.right,area.right)-Math.max(rect.left,area.left))*Math.max(0,Math.min(rect.bottom,area.bottom)-Math.max(rect.top,area.top));return{element,overlap,area:area.width*area.height}}).filter(item=>item.overlap>0).sort((a,b)=>a.area-b.area)
 const background=candidates[0]?.element,target=background?importedTarget(doc,background.getAttribute(marker)||''):null
 if(target)target.remove();else clearObjectBackground(selected)
 return{...block,importHtml:doc.body.innerHTML}
}

export function placeImportedClone(target:Element,clone:Element){
 if(!(clone instanceof HTMLElement))return
 for(const key of ['--grid-row','--m-grid-row','grid-row']){const value=(target as HTMLElement).style?.getPropertyValue(key),match=value?.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);if(!match)continue;let last=Number(match[2]);for(const sibling of Array.from(target.parentElement?.children||[])){const row=(sibling as HTMLElement).style?.getPropertyValue(key).match(/\/\s*(\d+)\s*$/);if(row)last=Math.max(last,Number(row[1]))}clone.style.setProperty(key,last+'/'+(last+Math.max(1,Number(match[2])-Number(match[1]))),'important')}
}
