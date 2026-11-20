import { StudioMediaGallery } from './StudioMediaGallery'
import { CanvasMedia } from './CanvasMedia'
import { EditorAction } from './EditorAction'
import { StudioAttribution } from './StudioAttribution'
import { Suspense,lazy,useEffect,useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { InlineText } from './InlineText'

import type { Layout, Block, Draft } from './studio-model'
const LegacySalesTemplate=lazy(()=>import('./LegacySalesTemplate').then(m=>({default:m.LegacySalesTemplate})))
const LegacySalesTemplateEs=lazy(()=>import('./LegacySalesTemplateEs').then(m=>({default:m.LegacySalesTemplateEs})))
export interface CanvasEditing {
  mediaVersion?:number
  button:(index:number,scope:string,enabled:boolean)=>void
  text: (index:number,field:string,value:string)=>void
  select: (index:number,kind:string)=>void
  image: (index:number,file?:File,slot?:string)=>void
  resize: (index:number,value:Partial<Layout>)=>void
}
function layout(value: Layout = {}): CSSProperties {
  return { width: `${value.width ?? 100}%`, padding: `${value.padding ?? 32}px`, margin: `${value.margin ?? 16}px auto`, gap: `${value.gap ?? 24}px`, fontSize: `${value.fontSize ?? 18}px`, fontFamily: value.font==='serif' ? 'Georgia,serif' : value.font==='rounded' ? 'Verdana,sans-serif' : 'inherit', textAlign: value.align ?? 'left', background: value.background ?? '#ffffff', '--block-columns': value.columns ?? 1, '--heading-size': `${value.headingSize ?? 36}px` } as CSSProperties
}
export function StudioCanvas({ draft, selected, onSelect, onMove, interactive = false, editing }: { draft: Draft; selected?: number; onSelect?: (index: number) => void; onMove?: (from: number, to: number) => void; interactive?: boolean; editing?:CanvasEditing }) {
  const [sample, setSample] = useState<number | null>(null)
  const samples = draft.blocks.filter((b) => b.kind === 'sample'&&(editing||b.enabled!==false)).slice(0,draft.sectionCounts?.sample)
  useEffect(() => {
    if (sample === null) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setSample(null); if (e.key === 'ArrowRight') setSample((v) => v === null ? null : (v+1)%samples.length); if (e.key === 'ArrowLeft') setSample((v) => v === null ? null : (v-1+samples.length)%samples.length) }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [sample, samples.length])
  const text=(index:number,field:string,value:string,label:string,as='p',className='',multiline=false,max=5000)=>editing ? <InlineText as={as} value={value} label={label} className={className} multiline={multiline} max={max} onSelect={()=>editing.select(index,field)} onChange={(value)=>editing.text(index,field,value)} /> : <StaticText as={as} value={value} className={className}/>
  const picture=(index:number,src:string,title:string,style?:Layout)=> <CanvasMedia index={index} src={src} title={title} type={index<0?draft.mediaType:draft.blocks[index]?.mediaType} editing={editing} attributes={{style:{width:String(style?.imageWidth??100)+'%',height:style?.imageHeight??360,objectFit:style?.imageFit??'contain'}}}/>
  const buy = (block?: Block,index=-1,scope='hero') => {
    const config=block?undefined:draft.templateButtons?.[scope]
    const enabled=block?block.showButton!==false:config?.enabled!==false
    if(!editing&&!enabled)return null
    const href = block?.inheritLink===false ? block.buttonUrl : block?block.buttonUrl || draft.checkoutUrl:config?.inheritLink===false?config.url:config?.url||draft.checkoutUrl
    const label = block?.buttonLabel || config?.label || draft.ctaLabel || 'Comprar agora'
    const value = block?.style || draft.style
    const style = { width:`${value?.buttonWidth ?? 100}%`,padding:`${value?.buttonPadding ?? 16}px` }
    if(editing)return <EditorAction editing={editing} index={index} scope={block?'block':scope} enabled={enabled} className="canvas-buy canvas-buy-edit" style={style} label={<InlineText value={label} label={`Editar texto do botão ${block?`da seção ${index+1}`:scope}`} max={100} onSelect={()=>editing.select(index,block?'buttonLabel':`button:${scope}`)} onChange={value=>editing.text(index,block?'buttonLabel':`buttonLabel:${scope}`,value)}/>}/>
    return href && interactive ? <a className="canvas-buy" style={style} href={href} target="_blank" rel="noopener noreferrer">{label}</a> : <button className="canvas-buy" style={style} type="button" disabled>{label}</button>
  }
  const drop = (event: DragEvent, index: number) => { if (!onMove || event.dataTransfer.files.length) return; event.preventDefault(); const value=event.dataTransfer.getData('application/x-hubpages-block'); if (/^\d+$/.test(value)) onMove(Number(value),index) }
  if(draft.template==='infancia_es')return <Suspense fallback={<p role="status">Carregando modelo…</p>}><LegacySalesTemplateEs draft={draft} editing={editing} onMove={onMove} onSelect={onSelect} selected={selected}/></Suspense>
  if(draft.template==='infancia_pt')return <Suspense fallback={<p role="status">Carregando modelo…</p>}><LegacySalesTemplate draft={draft} editing={editing} onMove={onMove} onSelect={onSelect} selected={selected}/></Suspense>
  return <div className={`studio-canvas template-${draft.template} ${editing?'is-inline-editing':''}`} style={{ '--draft-color': draft.color } as CSSProperties} lang={draft.locale}>
    {(draft.redLine||editing) && <div className="canvas-redline">{text(-1,'redLine',draft.redLine||'','Editar faixa de destaque','span','',false,300)}</div>}
    <header className="canvas-header">{buy(undefined,-1,'header')}</header>
    <section className="canvas-hero" style={layout(draft.style)} onClick={() => onSelect?.(-1)} tabIndex={onSelect ? 0 : undefined} onKeyDown={(e) => { if (e.target===e.currentTarget && e.key==='Enter') onSelect?.(-1) }}>
      <div>{text(-1,'eyebrow',draft.eyebrow||'','Editar chamada acima do título','p','canvas-eyebrow',false,300)}{text(-1,'title',draft.title,'Editar título principal','h1','',false,240)}{text(-1,'description',draft.description,'Editar apresentação','p','',true,3000)}{(draft.originalPrice||editing)&&text(-1,'originalPrice',draft.originalPrice||'','Editar preço anterior','s','',false,80)}{(draft.priceLabel||editing)&&text(-1,'priceLabel',draft.priceLabel||'','Editar preço da oferta','strong','canvas-price',false,80)}{buy()}{samples.length>0&&<EditorAction editing={editing} scope="sampleHero" enabled={draft.sampleEnabled!==false&&draft.templateButtons?.sampleHero?.enabled!==false} className="sales-v2-preview-button" label="Ver degustação" onActivate={()=>setSample(0)}/>}</div>
      {picture(-1,draft.imageUrl,draft.title,draft.style)}
    </section>
    <div className="canvas-block-grid">{draft.blocks.map((block,index) => !editing&&block.enabled===false?null:<div key={block.id || index} style={{width:`${block.style?.width ?? 100}%`}} className={`canvas-block ${selected===index ? 'is-selected' : ''} animation-${block.style?.animation ?? 'none'}`} data-block-id={block.id} onDragOver={(e) => { if (onMove && !e.dataTransfer.types.includes('Files')) e.preventDefault() }} onDrop={(e) => drop(e,index)}>
      {onSelect && <div className="canvas-block-tools"><button type="button" draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-hubpages-block',String(index)); e.dataTransfer.effectAllowed='move' }} aria-label={`Arrastar seção ${index+1}`}>⠿ Arrastar</button><button type="button" onClick={() => onSelect(index)}>Editar seção {index+1}</button><button type="button" disabled={index===0} onClick={() => onMove?.(index,index-1)} aria-label="Mover seção para cima">↑</button><button type="button" disabled={index===draft.blocks.length-1} onClick={() => onMove?.(index,index+1)} aria-label="Mover seção para baixo">↓</button></div>}
      <section className={`canvas-section kind-${block.kind ?? 'content'}`} style={{...layout(block.style),width:'100%'}} onClick={() => onSelect?.(index)}>
        {block.kind==='divider' ? <hr /> : block.kind==='spacer' ? <div style={{minHeight:block.style?.padding ?? 32}} aria-label="Espaçamento" /> : <>
          {block.kind==='offer'?<StudioMediaGallery draft={draft} editing={editing} label="Galeria da coleção"/>:(block.imageUrl||editing&&selected===index)&&picture(index,block.imageUrl,block.title,block.style)}
          <div className="canvas-section-copy">{block.kind==='faq'&&!editing ? <details><summary>{block.title}</summary><p>{block.body}</p></details> : <>{text(index,'title',block.title,`Editar título da seção ${index+1}`,'h2','',false,240)}{text(index,'body',block.body,`Editar texto da seção ${index+1}`,'p','canvas-columns',true)}</>}
          {block.kind==='sample'&&<EditorAction editing={editing} index={-1} scope={'sample:'+block.id} enabled={draft.sampleEnabled!==false&&draft.templateButtons?.['sample:'+block.id]?.enabled!==false} label="Abrir degustação" className="sales-v2-preview-button" onActivate={()=>setSample(samples.indexOf(block))}/>}
          {block.kind==='offer' && <>{text(index,'originalPrice',draft.originalPrice||'','Editar preço anterior da oferta','s','',false,80)}{text(index,'priceLabel',draft.priceLabel||'','Editar preço da oferta na seção','strong','canvas-price',false,80)}</>}
          {block.kind!=='author' && buy(block,index)}</div>
        </>}
      </section>
    </div>)}</div>
    <footer className="canvas-footer"><StudioAttribution/>{text(-1,'name',draft.name,'Editar nome no rodapé','p','',false,120)}</footer>
    {sample!==null && samples[sample] && <div className="canvas-modal" role="dialog" aria-modal="true" aria-label="Degustação do conteúdo"><div className="canvas-modal-panel"><header><div>{text(draft.blocks.indexOf(samples[sample]),'sampleSource',samples[sample].sampleSource??'Conteúdo','Editar origem da página de degustação','p')}{text(draft.blocks.indexOf(samples[sample]),'title',samples[sample].title,'Editar título da página de degustação','h2')}</div><button autoFocus type="button" onClick={() => setSample(null)}>Fechar degustação</button></header><p>{sample+1} de {samples.length}</p>{picture(draft.blocks.indexOf(samples[sample]),samples[sample].imageUrl,samples[sample].title,{imageHeight:650})}{text(draft.blocks.indexOf(samples[sample]),'body',samples[sample].body,'Editar descrição da página de degustação','p','',true)}<nav><button onClick={() => setSample((sample-1+samples.length)%samples.length)}>Anterior</button><button onClick={() => setSample((sample+1)%samples.length)}>Próxima</button></nav>{buy(samples[sample])}</div></div>}
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
