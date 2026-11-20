import { useEffect, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { Brand } from './Brand'

import type { Layout, Block, Draft } from './studio-model'
function layout(value: Layout = {}): CSSProperties {
  return { width: `${value.width ?? 100}%`, padding: `${value.padding ?? 32}px`, margin: `${value.margin ?? 16}px auto`, gap: `${value.gap ?? 24}px`, fontSize: `${value.fontSize ?? 18}px`, fontFamily: value.font==='serif' ? 'Georgia,serif' : value.font==='rounded' ? 'Verdana,sans-serif' : 'inherit', textAlign: value.align ?? 'left', background: value.background ?? '#ffffff', '--block-columns': value.columns ?? 1, '--heading-size': `${value.headingSize ?? 36}px` } as CSSProperties
}
function Picture({ src, title, style = {} }: { src: string; title: string; style?: Layout }) {
  const [failedSource, setFailedSource] = useState('')
  if (!src) return null
  return failedSource === src ? <p className="canvas-image-empty">Envie uma imagem para este espaço.</p> : <img src={src} alt={title || 'Imagem da seção'} style={{ width: `${style.imageWidth ?? 100}%`, height: style.imageHeight ?? 360, objectFit: style.imageFit ?? 'contain' }} onError={() => setFailedSource(src)} />
}
export function StudioCanvas({ draft, selected, onSelect, onMove, interactive = false }: { draft: Draft; selected?: number; onSelect?: (index: number) => void; onMove?: (from: number, to: number) => void; interactive?: boolean }) {
  const [sample, setSample] = useState<number | null>(null)
  const samples = draft.blocks.filter((b) => b.kind === 'sample')
  useEffect(() => {
    if (sample === null) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setSample(null); if (e.key === 'ArrowRight') setSample((v) => v === null ? null : (v+1)%samples.length); if (e.key === 'ArrowLeft') setSample((v) => v === null ? null : (v-1+samples.length)%samples.length) }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key)
  }, [sample, samples.length])
  const buy = (block?: Block) => {
    const href = block?.buttonUrl || draft.checkoutUrl
    const label = block?.buttonLabel || draft.ctaLabel || 'Comprar agora'
    const value = block?.style || draft.style
    const style = { width:`${value?.buttonWidth ?? 100}%`,padding:`${value?.buttonPadding ?? 16}px` }
    return href && interactive ? <a className="canvas-buy" style={style} href={href} target="_blank" rel="noopener noreferrer">{label}</a> : <button className="canvas-buy" style={style} type="button" disabled>{label}</button>
  }
  const drop = (event: DragEvent, index: number) => { if (!onMove || event.dataTransfer.files.length) return; event.preventDefault(); const value=event.dataTransfer.getData('application/x-hubpages-block'); if (/^\d+$/.test(value)) onMove(Number(value),index) }
  return <div className={`studio-canvas template-${draft.template}`} style={{ '--draft-color': draft.color } as CSSProperties} lang={draft.locale}>
    {draft.redLine && <div className="canvas-redline">{draft.redLine}</div>}
    <header className="canvas-header"><Brand />{buy()}</header>
    <section className="canvas-hero" style={layout(draft.style)} onClick={() => onSelect?.(-1)} tabIndex={onSelect ? 0 : undefined} onKeyDown={(e) => { if (e.target===e.currentTarget && e.key==='Enter') onSelect?.(-1) }}>
      <div><p className="canvas-eyebrow">{draft.eyebrow}</p><h1>{draft.title || 'Título da sua página'}</h1><p>{draft.description}</p>{draft.originalPrice && <s>{draft.originalPrice}</s>}{draft.priceLabel && <strong className="canvas-price">{draft.priceLabel}</strong>}{buy()}{samples.length > 0 && <button type="button" onClick={(e) => { e.stopPropagation(); setSample(0) }}>Ver degustação</button>}</div>
      <Picture src={draft.imageUrl} title={draft.title} style={draft.style} />
    </section>
    <div className="canvas-block-grid">{draft.blocks.map((block,index) => <div key={block.id || index} style={{width:`${block.style?.width ?? 100}%`}} className={`canvas-block ${selected===index ? 'is-selected' : ''} animation-${block.style?.animation ?? 'none'}`} data-block-id={block.id} onDragOver={(e) => { if (onMove && !e.dataTransfer.types.includes('Files')) e.preventDefault() }} onDrop={(e) => drop(e,index)}>
      {onSelect && <div className="canvas-block-tools"><button type="button" draggable onDragStart={(e) => { e.dataTransfer.setData('application/x-hubpages-block',String(index)); e.dataTransfer.effectAllowed='move' }} aria-label={`Arrastar seção ${index+1}`}>⠿ Arrastar</button><button type="button" onClick={() => onSelect(index)}>Editar seção {index+1}</button><button type="button" disabled={index===0} onClick={() => onMove?.(index,index-1)} aria-label="Mover seção para cima">↑</button><button type="button" disabled={index===draft.blocks.length-1} onClick={() => onMove?.(index,index+1)} aria-label="Mover seção para baixo">↓</button></div>}
      <section className={`canvas-section kind-${block.kind ?? 'content'}`} style={{...layout(block.style),width:'100%'}} onClick={() => onSelect?.(index)}>
        {block.kind==='divider' ? <hr /> : block.kind==='spacer' ? <div style={{minHeight:block.style?.padding ?? 32}} aria-label="Espaçamento" /> : <>
          <Picture src={block.imageUrl} title={block.title} style={block.style} />
          <div className="canvas-section-copy">{block.kind==='faq' ? <details><summary>{block.title}</summary><p>{block.body}</p></details> : <><h2>{block.title}</h2><p className="canvas-columns">{block.body}</p></>}
          {block.kind==='sample' && <button type="button" onClick={(e) => { e.stopPropagation(); setSample(samples.indexOf(block)) }}>Abrir degustação</button>}
          {block.kind==='offer' && <><s>{draft.originalPrice}</s><strong className="canvas-price">{draft.priceLabel}</strong></>}
          {block.kind!=='author' && buy(block)}</div>
        </>}
      </section>
    </div>)}</div>
    <footer className="canvas-footer"><Brand /><p>{draft.name}</p></footer>
    {sample!==null && samples[sample] && <div className="canvas-modal" role="dialog" aria-modal="true" aria-label="Degustação do conteúdo"><div className="canvas-modal-panel"><header><strong>{samples[sample].title}</strong><button autoFocus type="button" onClick={() => setSample(null)}>Fechar degustação</button></header><p>{sample+1} de {samples.length}</p><Picture src={samples[sample].imageUrl} title={samples[sample].title} style={{imageHeight:650}} /><p>{samples[sample].body}</p><nav><button onClick={() => setSample((sample-1+samples.length)%samples.length)}>Anterior</button><button onClick={() => setSample((sample+1)%samples.length)}>Próxima</button></nav>{buy(samples[sample])}</div></div>}
  </div>
}
