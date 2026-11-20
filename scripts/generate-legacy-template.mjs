// Generate from the approved page; never modify its source or public styles/assets.
import fs from 'node:fs'
import ts from 'typescript'
import { createHash } from 'node:crypto'
const originalBlocks=JSON.parse(fs.readFileSync('server/templates/infancia-pt.json','utf8')).blocks
const source=fs.readFileSync('src/pages/InfanciaAlemDasTelas.tsx','utf8').replace(/\r\n/g,'\n')
const file=ts.createSourceFile('legacy.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const map={pain:'pain',solution:'solution',method:'method',tasting:'tasting',manual:'manual',bonuses:'bonuses',possibilities:'possibilities',offer:'offer',author:'author',faq:'faq',final:'final',hero:'hero',header:'header','mobile-cta':'sticky',preview:'preview'}
function role(node){for(let p=node;p;p=p.parent){if(ts.isJsxElement(p)){const attr=p.openingElement.attributes.properties.find(a=>a.name?.getText(file)==='className');const name=attr?.initializer?.text;const key=name?.split(' ')[0]?.replace('sales-v2-','');if(map[key])return map[key]}}return 'hero'}
function inLoop(node,name){for(let p=node;p;p=p.parent)if(ts.isArrowFunction(p)&&p.parent?.getText(file).startsWith(name+'.map'))return true;return false}
let root
function find(node){if(ts.isJsxElement(node)&&node.openingElement.attributes.properties.some(a=>a.name?.getText(file)==='className'&&a.initializer?.text==='sales-v2'))root=node;ts.forEachChild(node,find)}find(file)
const edits=[]
function walk(node){
  if(ts.isJsxSelfClosingElement(node)&&['MetaPixel','AnalyticsTracker'].includes(node.tagName.getText(file))){edits.push([node.pos,node.end,'']);return}
  if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(file)==='img'){
    const attrs=node.attributes.properties.map(a=>{const key=a.name.getText(file);return `${key}:${ts.isJsxExpression(a.initializer)?a.initializer.expression.getText(file):JSON.stringify(a.initializer.text)}`}).join(',')
    const owner=inLoop(node,'bonuses')?'book.block':inLoop(node,'previewPages')?'page.block':role(node)==='preview'?'previewPages[previewIndex].block':JSON.stringify(role(node))
    edits.push([node.pos,node.end,ts.isArrowFunction(node.parent)?`image(${owner},{${attrs}})`:`{image(${owner},{${attrs}})}`]);return
  }
  if(ts.isJsxText(node)&&node.getText(file).trim()){
    const value=source.slice(node.pos,node.end),key='t'+node.pos
    if(['Hub','Pages'].includes(value.trim()))return
    const originalBlock=originalBlocks.find(b=>b.templateRole===role(node))
    let expression=`lit(${JSON.stringify(key)},${JSON.stringify(value)},${JSON.stringify(role(node))})`
    if(originalBlock?.title===value.trim())expression=`blockField(groupBlock(${JSON.stringify(role(node))}),'title',${JSON.stringify(value)})`
    else if(value.trim()==='29,90')expression=`field('priceLabel',${JSON.stringify(value.match(/^\s*/)[0])}+(content.priceLabel.startsWith('R$')?content.priceLabel.slice(2).trim():content.priceLabel))`
    else if(value.trim()==='R$ 197,00')expression=`field('originalPrice',content.originalPrice)`
    edits.push([node.pos,node.end,`{${expression}}`]);return
  }
  if(ts.isJsxExpression(node)&&node.expression&&!ts.isJsxAttribute(node.parent)){
    const value=node.expression.getText(file),r=role(node)
    let expression
    if(/^content\.(redLine|eyebrow|title|description)$/.test(value))expression=`field(${JSON.stringify(value.split('.')[1])},${value})`
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
jsx=jsx.replace('<a href={content.ctaHref}>{content.ctaLabel}</a>',"{buyButton('','sticky')}")
const parsed=ts.createSourceFile('view.tsx','const view=('+jsx+')',ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
let main
function locate(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(parsed)==='main')main=node;ts.forEachChild(node,locate)}locate(parsed)
const sections=main.children.filter(ts.isJsxElement).map(n=>({key:n.openingElement.attributes.properties.find(a=>a.name?.getText(parsed)==='className').initializer.text.replace('sales-v2-',''),jsx:n.getText(parsed)}))
const start=main.openingElement.end-'const view=('.length,end=main.closingElement.pos-'const view=('.length
jsx=jsx.slice(0,start)+'{sequence.map((key)=><Fragment key={key}>{renderSection(key)}</Fragment>)}'+jsx.slice(end)
const arrays=source.slice(source.indexOf('const bonuses'),source.indexOf('export function')).replace(/const (bonuses|previewPages|methodSteps|manualParts|questions) =/g,'const original_$1 =').replace(/const original_questions = \[[\s\S]*?\n\]/,'')
const helper=fs.readFileSync('scripts/legacy-template-runtime.txt','utf8').replace(/\r\n/g,'\n')
const output=`// Generated from the approved original. Source SHA256: ${createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex')}
import { Fragment, useEffect, useRef, useState, cloneElement } from 'react'
import type { ReactElement, CSSProperties } from 'react'
import { InlineText } from './InlineText'
import type { CanvasEditing } from './StudioCanvas'
import type { Draft, Block } from './studio-model'
import { withLegacyRoles } from './legacy-template-model'
${arrays}
const originalBlocks=${JSON.stringify(originalBlocks)}
export function LegacySalesTemplate({draft:input,editing,onMove,onSelect,selected}:{draft:Draft;editing?:CanvasEditing;onMove?:(from:number,to:number)=>void;onSelect?:(index:number)=>void;selected?:number}) {
${helper}
  const sections:Record<string,()=>ReactElement<{style?:CSSProperties;className?:string}>>={${sections.map(s=>`${JSON.stringify(s.key)}:()=>(${s.jsx})`).join(',\n')}}
  const renderSection=(key:string)=>{const block=key.startsWith('custom:')?draft.blocks.find(b=>b.id===key.slice(7)):groupBlock(key);const node:ReactElement<{style?:CSSProperties;className?:string}>|null=sections[key]?.()||(block?<section className="sales-v2-manual">{blockField(block,'title',block.title)}{blockField(block,'body',block.body)}{image(block,{src:block.imageUrl,alt:block.title})}{buyButton(undefined,block)}</section>:null);if(!node)return null;const index=block?draft.blocks.indexOf(block):-1;const styled=block?.layoutCustomized||key==='hero'&&draft.layoutCustomized?cloneElement(node,{style:customStyle(block),className:node.props.className+' has-layout-customization'}):node;if(!editing||!block||key==='hero'||key==='trust')return styled;return <div className={'legacy-edit-section '+(selected===index?'is-selected':'')} onClick={()=>onSelect?.(index)} onDragOver={e=>{if(!e.dataTransfer.types.includes('Files'))e.preventDefault()}} onDrop={e=>{const value=e.dataTransfer.getData('application/x-hubpages-block');if(/^[0-9]+$/.test(value)){e.preventDefault();onMove?.(Number(value),index)}}}><div className="canvas-block-tools"><button draggable onDragStart={e=>e.dataTransfer.setData('application/x-hubpages-block',String(index))}>⠿ Arrastar seção</button><button onClick={()=>onSelect?.(index)}>Selecionar seção</button><button disabled={index===0} onClick={()=>onMove?.(index,index-1)}>Subir</button><button disabled={index===draft.blocks.length-1} onClick={()=>onMove?.(index,index+1)}>Descer</button></div>{styled}</div>}
  return (${jsx})
}
`
fs.writeFileSync('src/components/LegacySalesTemplate.tsx',output)
