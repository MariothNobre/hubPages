import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { Brand } from './Brand'
import { InlineText } from './InlineText'
import { LegacySalesTemplate } from './LegacySalesTemplate'

import type { Layout, Block, Draft } from './studio-model'
export interface CanvasEditing {
  text: (index:number,field:string,value:string)=>void
  select: (index:number,kind:string)=>void
  image: (index:number,file?:File)=>void
  resize: (index:number,value:Partial<Layout>)=>void
}
function layout(value: Layout = {}): CSSProperties {
  return { width: `${value.width ?? 100}%`, padding: `${value.padding ?? 32}px`, margin: `${value.margin ?? 16}px auto`, gap: `${value.gap ?? 24}px`, fontSize: `${value.fontSize ?? 18}px`, fontFamily: value.font==='serif' ? 'Georgia,serif' : value.font==='rounded' ? 'Verdana,sans-serif' : 'inherit', textAlign: value.align ?? 'left', background: value.background ?? '#ffffff', '--block-columns': value.columns ?? 1, '--heading-size': `${value.headingSize ?? 36}px` } as CSSProperties
}
function Picture({ src, title, style = {} }: { src: string; title: string; style?: Layout }) {
  const [failedSource, setFailedSource] = useState('')
  if (!src) return null
  return failedSource === src ? <p className="canvas-image-empty">Envie uma imagem para este espaço.</p> : <img src={src} alt={title || 'Imagem da seção'} style={{ width: `${style.imageWidth ?? 100}%`, height: style.imageHeight ?? 360, objectFit: style.imageFit ?? 'contain' }} onError={() => setFailedSource(src)} />
}
export function StudioCanvas({ draft, selected, onSelect, onMove, interactive = false, editing }: { draft: Draft; selected?: number; onSelect?: (index: number) => void; onMove?: (from: number, to: number) => void; interactive?: boolean; editing?:CanvasEditing }) {
  const [sample, setSample] = useState<number | null>(null)
  const resizing=useRef<{index:number;x:number;y:number;width:number;height:number;parent:number}|null>(null)
  const samples = draft.blocks.filter((b) => b.kind === 'sample')
  useEffect(() => {
    if (sample === null) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setSample(null); if (e.key === 'ArrowRight') setSample((v) => v === null ? null : (v+1)%samples.length); if (e.key === 'ArrowLeft') setSample((v) => v === null ? null : (v-1+samples.length)%samples.length) }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [sample, samples.length])
  const text=(index:number,field:string,value:string,label:string,as='p',className='',multiline=false,max=5000)=>editing ? <InlineText as={as} value={value} label={label} className={className} multiline={multiline} max={max} onSelect={()=>editing.select(index,field)} onChange={(value)=>editing.text(index,field,value)} /> : <StaticText as={as} value={value} className={className}/>
  const picture=(index:number,src:string,title:string,style?:Layout)=>editing ? <div className="canvas-image-edit" onClick={(e)=>{e.stopPropagation();editing.select(index,'image')}} onDragOver={(e)=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();e.stopPropagation()}}} onDrop={(e)=>{if(e.dataTransfer.files.length){e.preventDefault();e.stopPropagation();editing.image(index,e.dataTransfer.files[0])}}}>{src?<Picture src={src} title={title} style={style}/>:<p className="canvas-image-empty">Escolha uma imagem ou arraste o arquivo aqui.</p>}<button type="button" className="canvas-image-replace" onClick={(e)=>{e.stopPropagation();editing.image(index)}} aria-label={`Trocar imagem ${index<0?'principal':`da seção ${index+1}`}`}>Trocar imagem</button><button type="button" className="canvas-image-resize" aria-label="Redimensionar imagem arrastando" title="Arraste para redimensionar; Layout permite ajuste por teclado" onPointerDown={(e)=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);editing.select(index,'image');resizing.current={index,x:e.clientX,y:e.clientY,width:style?.imageWidth ?? 100,height:style?.imageHeight ?? 360,parent:e.currentTarget.parentElement!.getBoundingClientRect().width}}} onPointerMove={(e)=>{const from=resizing.current;if(!from)return;editing.resize(from.index,{imageWidth:Math.round(Math.min(100,Math.max(10,from.width+(e.clientX-from.x)/from.parent*100))),imageHeight:Math.round(Math.min(800,Math.max(80,from.height+e.clientY-from.y)))})}} onPointerUp={()=>{resizing.current=null}} onPointerCancel={()=>{resizing.current=null}}/></div> : <Picture src={src} title={title} style={style}/>
  const buy = (block?: Block,index=-1,scope='hero') => {
    const config=block?undefined:draft.templateButtons?.[scope]
    if(block?.showButton===false || config?.enabled===false)return null
    const href = block?.inheritLink===false ? block.buttonUrl : block?block.buttonUrl || draft.checkoutUrl:config?.inheritLink===false?config.url:config?.url||draft.checkoutUrl
    const label = block?.buttonLabel || config?.label || draft.ctaLabel || 'Comprar agora'
    const value = block?.style || draft.style
    const style = { width:`${value?.buttonWidth ?? 100}%`,padding:`${value?.buttonPadding ?? 16}px` }
    if(editing)return <div className="canvas-buy canvas-buy-edit" style={style}><InlineText value={label} label={`Editar texto do botão ${block?`da seção ${index+1}`:scope}`} max={100} onSelect={()=>editing.select(index,block?'buttonLabel':`button:${scope}`)} onChange={value=>editing.text(index,block?'buttonLabel':`buttonLabel:${scope}`,value)}/></div>
    return href && interactive ? <a className="canvas-buy" style={style} href={href} target="_blank" rel="noopener noreferrer">{label}</a> : <button className="canvas-buy" style={style} type="button" disabled>{label}</button>
  }
  const drop = (event: DragEvent, index: number) => { if (!onMove || event.dataTransfer.files.length) return; event.preventDefault(); const value=event.dataTransfer.getData('application/x-hubpages-block'); if (/^\d+$/.test(value)) onMove(Number(value),index) }
  if(draft.template==='infancia_pt')return <LegacySalesTemplate draft={draft} editing={editing} onMove={onMove} onSelect={onSelect} selected={selected}/>
  return <div className={`studio-canvas template-${draft.template} ${editing?'is-inline-editing':''}`} style={{ '--draft-color': draft.color } as CSSProperties} lang={draft.locale}>
    {(draft.redLine||editing) && <div className="canvas-redline">{text(-1,'redLine',draft.redLine||'','Editar faixa de destaque','span','',false,300)}</div>}
    <header className="canvas-header"><Brand />{buy(undefined,-1,'header')}</header>
    <section className="canvas-hero" style={layout(draft.style)} onClick={() => onSelect?.(-1)} tabIndex={onSelect ? 0 : undefined} onKeyDown={(e) => { if (e.target===e.currentTarget && e.key==='Enter') onSelect?.(-1) }}>
      <div>{text(-1,'eyebrow',draft.eyebrow||'','Editar chamada acima do título','p','canvas-eyebrow',false,300)}{text(-1,'title',draft.title,'Editar título principal','h1','',false,240)}{text(-1,'description',draft.description,'Editar apresentação','p','',true,3000)}{(draft.originalPrice||editing)&&text(-1,'originalPrice',draft.originalPrice||'','Editar preço anterior','s','',false,80)}{(draft.priceLabel||editing)&&text(-1,'priceLabel',draft.priceLabel||'','Editar preço da oferta','strong','canvas-price',false,80)}{buy()}{samples.length > 0 && <button type="button" onClick={(e) => { e.stopPropagation(); setSample(0) }}>Ver degustação</button>}</div>
      {picture(-1,draft.imageUrl,draft.title,draft.style)}
    </section>
    <div className="canvas-block-grid">{draft.blocks.map((block,index) => <div key={block.id || index} style={{width:`${block.style?.width ?? 100}%`}} className={`canvas-block ${selected===index ? 'is-selected' : ''} animation-${block.style?.animation ?? 'none'}`} data-block-id={block.id} onDragOver={(e) => { if (onMove && !e.dataTransfer.types.includes('Files')) e.preventDefault() }} onDrop={(e) => drop(e,index)}>
      {onSelect && <div className="canvas-block-tools"><button type="button" draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-hubpages-block',String(index)); e.dataTransfer.effectAllowed='move' }} aria-label={`Arrastar seção ${index+1}`}>⠿ Arrastar</button><button type="button" onClick={() => onSelect(index)}>Editar seção {index+1}</button><button type="button" disabled={index===0} onClick={() => onMove?.(index,index-1)} aria-label="Mover seção para cima">↑</button><button type="button" disabled={index===draft.blocks.length-1} onClick={() => onMove?.(index,index+1)} aria-label="Mover seção para baixo">↓</button></div>}
      <section className={`canvas-section kind-${block.kind ?? 'content'}`} style={{...layout(block.style),width:'100%'}} onClick={() => onSelect?.(index)}>
        {block.kind==='divider' ? <hr /> : block.kind==='spacer' ? <div style={{minHeight:block.style?.padding ?? 32}} aria-label="Espaçamento" /> : <>
          {(block.imageUrl||editing&&selected===index)&&picture(index,block.imageUrl,block.title,block.style)}
          <div className="canvas-section-copy">{block.kind==='faq'&&!editing ? <details><summary>{block.title}</summary><p>{block.body}</p></details> : <>{text(index,'title',block.title,`Editar título da seção ${index+1}`,'h2','',false,240)}{text(index,'body',block.body,`Editar texto da seção ${index+1}`,'p','canvas-columns',true)}</>}
          {block.kind==='sample' && <button type="button" onClick={(e) => { e.stopPropagation(); setSample(samples.indexOf(block)) }}>Abrir degustação</button>}
          {block.kind==='offer' && <>{text(index,'originalPrice',draft.originalPrice||'','Editar preço anterior da oferta','s','',false,80)}{text(index,'priceLabel',draft.priceLabel||'','Editar preço da oferta na seção','strong','canvas-price',false,80)}</>}
          {block.kind!=='author' && buy(block,index)}</div>
        </>}
      </section>
    </div>)}</div>
    <footer className="canvas-footer"><Brand />{text(-1,'name',draft.name,'Editar nome no rodapé','p','',false,120)}</footer>
    {sample!==null && samples[sample] && <div className="canvas-modal" role="dialog" aria-modal="true" aria-label="Degustação do conteúdo"><div className="canvas-modal-panel"><header><strong>{samples[sample].title}</strong><button autoFocus type="button" onClick={() => setSample(null)}>Fechar degustação</button></header><p>{sample+1} de {samples.length}</p><Picture src={samples[sample].imageUrl} title={samples[sample].title} style={{imageHeight:650}} /><p>{samples[sample].body}</p><nav><button onClick={() => setSample((sample-1+samples.length)%samples.length)}>Anterior</button><button onClick={() => setSample((sample+1)%samples.length)}>Próxima</button></nav>{buy(samples[sample])}</div></div>}
  </div>
}
function StaticText({as,value,className}:{as:string;value:string;className:string}) {
  if(as==='h1')return <h1 className={className}>{value||'Título da sua página'}</h1>
  if(as==='h2')return <h2 className={className}>{value}</h2>
  if(as==='strong')return <strong className={className}>{value}</strong>
  if(as==='s')return <s className={className}>{value}</s>
  if(as==='span')return <span className={className}>{value}</span>
  return <p className={className}>{value}</p>
}
