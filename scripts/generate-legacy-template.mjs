// Generate from the approved page; never modify its source or public styles/assets.
import fs from 'node:fs'
import ts from 'typescript'
import { createHash } from 'node:crypto'
const spanish=process.argv.includes('--es')
const originalBlocks=JSON.parse(fs.readFileSync(spanish?'server/templates/infancia-es.json':'server/templates/infancia-pt.json','utf8')).blocks
const source=fs.readFileSync(spanish?'src/pages/InfanciaAlemDasTelasEs.tsx':'src/pages/InfanciaAlemDasTelas.tsx','utf8').replace(/\r\n/g,'\n')
const file=ts.createSourceFile('legacy.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const map={pain:'pain',solution:'solution',method:'method',tasting:'tasting',manual:'manual',bonuses:'bonuses',possibilities:'possibilities',offer:'offer',author:'author',faq:'faq',final:'final',hero:'hero',header:'header','mobile-cta':'sticky',preview:'preview'}
function role(node){for(let p=node;p;p=p.parent){if(ts.isJsxElement(p)){const attr=p.openingElement.attributes.properties.find(a=>a.name?.getText(file)==='className');const name=attr?.initializer?.text;const key=name?.split(' ')[0]?.replace('sales-v2-','');if(map[key])return map[key]}}return 'hero'}
function inLoop(node,name){for(let p=node;p;p=p.parent)if(ts.isArrowFunction(p)&&p.parent?.getText(file).startsWith(name+'.map'))return true;return false}
let root
function find(node){if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(a=>a.name?.getText(file)==='className'&&a.initializer?.text?.split(' ')[0]==='sales-v2'))root=node;ts.forEachChild(node,find)}find(file)
const edits=[]
function walk(node){
  if(ts.isJsxSelfClosingElement(node)&&['MetaPixel','AnalyticsTracker'].includes(node.tagName.getText(file))){edits.push([node.pos,node.end,'']);return}
  if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(file)==='img'){
    const attrs=node.attributes.properties.map(a=>{const key=a.name.getText(file);return `${key}:${ts.isJsxExpression(a.initializer)?a.initializer.expression.getText(file):JSON.stringify(a.initializer.text)}`}).join(',')
    const owner=inLoop(node,'bonuses')?'book.block':inLoop(node,'previewPages')?'page.block':role(node)==='preview'?'previewPages[previewIndex].block':JSON.stringify(role(node))
    edits.push([node.pos,node.end,ts.isArrowFunction(node.parent)?`image(${owner},{${attrs}},${inLoop(node,'previewPages')})`:`{image(${owner},{${attrs}},${inLoop(node,'previewPages')})}`]);return
  }
  if(ts.isJsxText(node)&&node.getText(file).trim()){
    const value=source.slice(node.pos,node.end),key='t'+node.pos
    if(['Hub','Pages','+','×','‹','›','▻','→','✦'].includes(value.trim()))return
    const originalBlock=originalBlocks.find(b=>b.templateRole===role(node))
    let expression=`lit(${JSON.stringify(key)},${JSON.stringify(value)},${JSON.stringify(role(node))})`
    if(originalBlock?.title===value.trim())expression=`blockField(groupBlock(${JSON.stringify(role(node))}),'title',${JSON.stringify(value)})`
    else if(value.trim()==='29,90')expression=`field('priceLabel',${JSON.stringify(value.match(/^\s*/)[0])}+(content.priceLabel.startsWith('R$')?content.priceLabel.slice(2).trim():content.priceLabel))`
    else if(spanish&&value.trim()==='6.90')expression=`field('priceLabel',${JSON.stringify(value.match(/^\s*/)[0])}+content.priceLabel.replace(/^US\\$/,'').trim())`
    else if(spanish&&value.trim()==='US$ 6.90')expression=`field('priceLabel',content.priceLabel)`
    else if(value.trim()==='R$ 29,90')expression=`field('priceLabel',content.priceLabel)`
    else if(value.trim()==='R$ 197,00')expression=`field('originalPrice',content.originalPrice)`
    edits.push([node.pos,node.end,`{${expression}}`]);return
  }
  if(ts.isJsxExpression(node)&&node.expression&&!ts.isJsxAttribute(node.parent)){
    const value=node.expression.getText(file),r=role(node)
    let expression
    if(/^content\.(redLine|eyebrow|title|description)$/.test(value))expression=`field(${JSON.stringify(value.split('.')[1])},${value})`
    if(r==='preview'&&!inLoop(node,'previewPages')&&/^(?:page|previewPages\[previewIndex\])\.(source|label|teaser|body|kicker)$/.test(value))expression='sampleField(previewPages[previewIndex],'+JSON.stringify(value.split('.').at(-1))+','+value+')'
    if(/^book\.(title|description|detail)$/.test(value))expression=`bookField(book,${JSON.stringify(value.split('.')[1])})`
    if(r==='method'&&['title','description'].includes(value))expression=`listField('method',index,${value==='title'?0:1},${value})`
    if(r==='manual'&&['title','description'].includes(value))expression=`listField('manual',Number(number)-1,${value==='title'?0:1},${value})`
    if(r==='faq'&&['question','answer'].includes(value))expression=`blockField(questions[index].block,${JSON.stringify(value==='question'?'title':'body')},${value})`
    if(expression){edits.push([node.pos,node.end,`{${expression}}`]);return}
  }
  if(ts.isCallExpression(node)&&node.expression.getText(file)==='buyButton'){
    const target=inLoop(node,'bonuses')?'book.block':JSON.stringify(role(node))
    edits.push([node.pos,node.end,`buyButton(${node.arguments[0]?.getText(file)||'undefined'},${target})`]);return
  }
  ts.forEachChild(node,walk)
}walk(root)
let jsx=source.slice(root.getStart(file),root.end)
for(const[start,end,value]of edits.sort((a,b)=>b[0]-a[0]))jsx=jsx.slice(0,start-root.getStart(file))+value+jsx.slice(end-root.getStart(file))
const rootClass=spanish?'sales-v2 sales-v2--es':'sales-v2'
jsx=jsx.replace('<div className="'+rootClass+'">',()=>'<div className="'+rootClass+'" style={draft.layoutOverrides?.includes("color")?{"--sales-teal":draft.color,"--sales-teal-dark":draft.color} as CSSProperties:undefined}>')
jsx=jsx.replace('<a href={content.ctaHref}>{content.ctaLabel}</a>',"{buyButton('','sticky')}")
jsx=jsx.replace(/<div className="sales-v2-logo">[\s\S]*?<\/div>/,'').replace('className="sales-v2-header"','className="sales-v2-header sales-v2-header--unbranded"').replace('className="sales-v2-logo sales-v2-logo--footer"','className="sales-v2-logo sales-v2-logo--footer" title="Feito com HubPages.com.br"')
const actionsFile=ts.createSourceFile('actions.tsx','const view=('+jsx+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),actionEdits=[]
function actions(node){
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(actionsFile)==='div'&&node.openingElement.attributes.properties.some(a=>a.name?.getText(actionsFile)==='className'&&a.initializer?.text==='sales-v2-offer__books')){
    const label=node.openingElement.attributes.properties.find(a=>a.name?.getText(actionsFile)==='aria-label')?.initializer?.text||'Galeria da coleção'
    actionEdits.push([node.getStart(actionsFile)-12,node.end-12,'<StudioMediaGallery draft={draft} editing={editing} label='+JSON.stringify(label)+'/>']);return
  }
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(actionsFile)==='button'){
    const cls=node.openingElement.attributes.properties.find(a=>a.name?.getText(actionsFile)==='className')?.initializer?.text
    if(cls&&(cls.startsWith('sales-v2-preview-button')||cls.startsWith('sales-v2-tasting__book'))){
      let section='hero';for(let p=node.parent;p;p=p.parent)if(ts.isJsxElement(p)){const name=p.openingElement.attributes.properties.find(a=>a.name?.getText(actionsFile)==='className')?.initializer?.text;if(['sales-v2-hero','sales-v2-solution','sales-v2-tasting'].includes(name)){section=name.slice(9);break}}
      const scope=cls.startsWith('sales-v2-tasting__book')?'sampleStack':'sample'+section[0].toUpperCase()+section.slice(1),aria=node.openingElement.attributes.properties.find(a=>a.name?.getText(actionsFile)==='aria-label')?.initializer?.text
      const children=actionsFile.text.slice(node.openingElement.end,node.closingElement.pos)
      actionEdits.push([node.getStart(actionsFile)-12,node.end-12,'{sampleButton('+JSON.stringify(scope)+','+JSON.stringify(cls)+',<>'+children+'</>,'+(aria?JSON.stringify(aria):'undefined')+')}']);return
    }
  }
  ts.forEachChild(node,actions)
}actions(actionsFile)
for(const[start,end,value]of actionEdits.sort((a,b)=>b[0]-a[0]))jsx=jsx.slice(0,start)+value+jsx.slice(end)
jsx=jsx.replaceAll('previewOpen &&','previewOpen && previewPages.length>0 && previewIndex<previewPages.length &&')
const parsed=ts.createSourceFile('view.tsx','const view=('+jsx+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
let main
function locate(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(parsed)==='main')main=node;ts.forEachChild(node,locate)}locate(parsed)
const sections=main.children.filter(ts.isJsxElement).map(n=>({key:n.openingElement.attributes.properties.find(a=>a.name?.getText(parsed)==='className').initializer.text.replace('sales-v2-',''),jsx:n.getText(parsed)}))
for(const section of sections){if(section.key==='faq')section.jsx=section.jsx.replace('{blockField(questions[index].block,"body",answer)}</p>',()=>'{blockField(questions[index].block,"body",answer)}</p>{questions[index].block.showButton===true&&buyButton(undefined,questions[index].block)}');if(section.key==='author')section.jsx=section.jsx.replace('</section>',()=>"{groupBlock('author')?.showButton===true&&buyButton(undefined,groupBlock('author'))}</section>")}
const start=main.openingElement.end-'const view=('.length,end=main.closingElement.pos-'const view=('.length
jsx=jsx.slice(0,start)+'{sequence.map((key)=><Fragment key={key}>{renderSection(key)}</Fragment>)}'+jsx.slice(end)
const arrays=source.slice(source.indexOf('const bonuses'),source.indexOf('export function')).replace(/const (bonuses|previewPages|methodSteps|manualParts|questions) =/g,'const original_$1 =').replace(/const original_questions = \[[\s\S]*?\n\]/,'')
let helper=fs.readFileSync('scripts/legacy-template-runtime.txt','utf8').replace(/\r\n/g,'\n')
if(!spanish)helper=helper.replace('original_previewPages[i%original_previewPages.length].kicker',"(original_previewPages[i%original_previewPages.length] as {kicker?:string}).kicker??''")
if(spanish)helper=helper.replace('teaser:block.body,','teaser:block.body,body:block.body,').replaceAll(' · incluso',' · incluido').replace("{scope!=='sticky'&&<> <span aria-hidden=\"true\">→</span></>}",'').replace('teaser:block.body,block','teaser:block.body,body:block.body,block').replace('className?:string;key?:string}', 'className?:string;key?:string;style?:CSSProperties}').replace('style:Object.keys(imageStyle).length?imageStyle:undefined','style:Object.keys(imageStyle).length?{...attrs.style,...imageStyle}:attrs.style')+'\n  const page=previewPages[previewIndex]\n'
const output=`// Generated from the approved original. Source SHA256: ${createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex')}
import { Fragment, useEffect, useRef, useState, cloneElement } from 'react'
import type { ReactElement, ReactNode, CSSProperties } from 'react'
import {ColorText} from './TextColors'
import { InlineText } from './InlineText'
import { CanvasMedia } from './CanvasMedia'
import { StudioMediaGallery } from './StudioMediaGallery'
import { EditorAction } from './EditorAction'
import { StudioStructure } from './StudioStructure'
import {BlockHeightControl} from './BlockHeightControl'
import {blockHeightStyle} from './block-height'
import type { CanvasEditing } from './StudioCanvas'
import type { Draft, Block } from './studio-model'
import { withLegacyRoles } from './legacy-template-model'
${spanish?"const mainCover='/assets/es/books/infancia-mas-alla-de-las-pantallas.png'\n":''}${arrays}
const originalBlocks=${JSON.stringify(originalBlocks)}
export function ${spanish?'LegacySalesTemplateEs':'LegacySalesTemplate'}({draft:input,editing,onMove,onSelect,selected,onlySection}:{onlySection?:string;draft:Draft;editing?:CanvasEditing;onMove?:(from:number,to:number)=>void;onSelect?:(index:number)=>void;selected?:number}) {
${helper}
  const sections:Record<string,()=>ReactElement<{style?:CSSProperties;className?:string;id?:string;children?:ReactNode}>>={${sections.map(s=>`${JSON.stringify(s.key)}:()=>(${s.jsx})`).join(',\n')}}
  const renderSection=(key:string):ReactNode=>{const copy=draft.blocks.find(b=>key==='custom:'+b.id&&b.sourceRole);if(copy){const role=copy.sourceRole!,original=draft.blocks.findIndex(b=>b.templateRole===role),subBlocks=draft.blocks.filter(b=>b.id!==copy.id);if(original>=0)subBlocks[original]={...copy,templateRole:role,sourceRole:undefined};else subBlocks.push({...copy,templateRole:role,sourceRole:undefined});const subDraft={...draft,blocks:subBlocks,templateTexts:{...draft.templateTexts,...copy.textOverrides},sectionCounts:{...draft.sectionCounts,...copy.sectionCounts}};const map=(index:number)=>index<0?index:draft.blocks.findIndex(b=>b.id===subBlocks[index]?.id);const adapter=editing?{...editing,select:(i:number,k:string)=>editing.select(map(i),k),text:(i:number,k:string,v:string)=>editing.text(k.startsWith('templateText:')?draft.blocks.indexOf(copy):map(i),k.startsWith('templateText:')?'blockText:'+k.slice(13):k,v),image:(i:number,f?:File,slot?:string)=>editing.image(map(i),f,slot),resize:(i:number,v:Parameters<CanvasEditing['resize']>[1])=>editing.resize(map(i),v),button:(i:number,scope:string,v:boolean)=>editing.button(map(i),scope,v),configure:editing.configure?(i:number)=>editing.configure?.(map(i)):undefined,duplicate:editing.duplicate?(i:number)=>editing.duplicate?.(map(i)):undefined}:undefined;return <${spanish?'LegacySalesTemplateEs':'LegacySalesTemplate'} draft={subDraft} onlySection={role} editing={adapter} selected={subBlocks.findIndex(b=>b.id===draft.blocks[selected??-1]?.id)} onSelect={i=>onSelect?.(map(i))} onMove={(from,to)=>onMove?.(map(from),map(to))}/>;}const block=key.startsWith('custom:')?draft.blocks.find(b=>b.id===key.slice(7)):groupBlock(key);if(!editing&&(block?.enabled===false||key==='tasting'&&(draft.sampleEnabled===false||!previewPages.length)||key==='bonuses'&&!bonuses.length||key==='method'&&!methodSteps.length||key==='manual'&&!manualParts.length))return null;const node:ReactElement<{style?:CSSProperties;className?:string;id?:string;children?:ReactNode}>|null=sections[key]?.()||(block?<section className="sales-v2-manual">{blockField(block,'title',block.title)}{blockField(block,'body',block.body)}{image(block,{src:block.imageUrl,alt:block.title})}{buyButton(undefined,block)}</section>:null);if(!node)return null;const scoped=onlySection?cloneElement(node,{id:(node.props.id||key)+'-'+block?.id}):node;const index=block?draft.blocks.indexOf(block):-1;const styled=block?.layoutCustomized||key==='hero'&&draft.layoutCustomized?cloneElement(scoped,{style:customStyle(block),className:node.props.className+' has-layout-customization'}):scoped;const height=block?.style?.height||(key==='hero'?draft.style?.height:undefined);const sized=(height||editing&&(block||key==='hero'))?cloneElement(styled,{style:{...styled.props.style,...blockHeightStyle(height),...(editing?{position:'relative'}:{})}},styled.props.children,editing&&(block||key==='hero')?<BlockHeightControl value={height} onChange={height=>editing.resize(index,{height})}/>:null):styled;if(!editing||!block||key==='hero'||key==='trust')return sized;return <div className={'legacy-edit-section '+(selected===index?'is-selected':'')} onClick={()=>onSelect?.(index)} onDragOver={e=>{if(!e.dataTransfer.types.includes('Files'))e.preventDefault()}} onDrop={e=>{const value=e.dataTransfer.getData('application/x-hubpages-block');if(/^[0-9]+$/.test(value)){e.preventDefault();onMove?.(Number(value),index)}}}><div className="canvas-block-tools"><button draggable onDragStart={e=>e.dataTransfer.setData('application/x-hubpages-block',String(index))}>⠿ Arrastar seção</button><button onClick={()=>onSelect?.(index)}>Selecionar seção</button>{editing.duplicate&&<button onClick={()=>editing.duplicate?.(index)}>Duplicar bloco</button>}{editing.configure&&<button onClick={()=>editing.configure?.(index)}>Layout do bloco</button>}{editing.update&&['method','manual','bonuses','tasting','offer','author'].includes(key)&&<details className="block-settings"><summary>Configurar bloco</summary><StudioStructure draft={draft} scope={key} targetId={block.id} update={editing.update} notice={editing.notice||(()=>{})}/></details>}<button disabled={neighbor(key,-1)<0} onClick={()=>onMove?.(index,neighbor(key,-1))}>Subir</button><button disabled={neighbor(key,1)<0} onClick={()=>onMove?.(index,neighbor(key,1))}>Descer</button></div>{sized}</div>}
  if(onlySection)return <>{renderSection(onlySection)}</>
  return (${jsx})
}
`
fs.writeFileSync(spanish?'src/components/LegacySalesTemplateEs.tsx':'src/components/LegacySalesTemplate.tsx',output.replace(/[ \t]+$/gm,''))
