import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { StudioCanvas } from './StudioCanvas'
import { blankBlock, moveBlock } from './studio-model'
import type { Draft, Layout } from './studio-model'

export function StudioDesigner({ draft, pageId, update, flush, notice }: { draft: Draft; pageId: string; update: (value: Partial<Draft>) => void; flush: () => Promise<boolean>; notice: (value: string) => void }) {
  const [selected,setSelected] = useState(-1)
  const [uploading,setUploading] = useState(false)
  const [imageVersion,setImageVersion] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const block = selected>=0 ? draft.blocks[selected] : undefined
  const style = (block?.style ?? draft.style ?? {})
  const changeBlock = (change: object) => update({blocks:draft.blocks.map((b,i) => i===selected ? {...b,...change} : b)})
  const changeStyle = (change: Partial<Layout>) => block ? changeBlock({style:{...style,...change}}) : update({style:{...style,...change}})
  const text = (label: string, value: string, change: (value: string) => void, multiline=false) => <label>{label}{multiline ? <textarea value={value} onChange={(e) => change(e.target.value)} /> : <input value={value} onChange={(e) => change(e.target.value)} />}</label>
  async function upload(file?: File) {
    if (!file || uploading) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) { notice('Escolha PNG, JPEG ou WebP de até 10 MB para otimização.'); return }
    setUploading(true)
    try {
      if (!await flush()) return
      const bitmap = await createImageBitmap(file)
      if (bitmap.width*bitmap.height>40_000_000) { bitmap.close(); throw new Error('A imagem excede 40 megapixels.') }
      const ratio = Math.min(1,1600/Math.max(bitmap.width,bitmap.height))
      const canvas = document.createElement('canvas'); canvas.width=Math.round(bitmap.width*ratio); canvas.height=Math.round(bitmap.height*ratio)
      canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close()
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Não foi possível preparar a imagem.')),'image/webp',.86))
      if (blob.size>2*1024*1024) throw new Error('A imagem otimizada precisa ter até 2 MB.')
      const slot=block?.id || 'hero'
      const response=await fetch(`/api/platform/pages/${pageId}/images/${slot}`,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'image/webp'},body:blob})
      const result=await response.json(); if(!response.ok) throw new Error(result.message)
      if(block) changeBlock({imageUrl:result.url}); else update({imageUrl:result.url})
      await flush(); setImageVersion((v) => v+1); notice('Imagem atualizada neste espaço. Nenhuma biblioteca pessoal foi criada.')
    } catch(error) { notice(error instanceof Error ? error.message : 'Falha ao enviar imagem.') }
    finally { setUploading(false); if(fileInput.current) fileInput.current.value='' }
  }
  const dropImage = (e: DragEvent) => { e.preventDefault(); void upload(e.dataTransfer.files[0]) }
  const add = (kind: string) => { if(draft.blocks.length>=40) {notice('Limite de 40 blocos por página.');return} update({blocks:[...draft.blocks,blankBlock(kind)]});setSelected(draft.blocks.length) }
  const addRow = (count: number) => { if(draft.blocks.length+count>40) {notice('Limite de 40 blocos por página.');return} update({blocks:[...draft.blocks,...Array.from({length:count},()=>({...blankBlock(),style:{width:Math.floor(100/count)}}))]});setSelected(draft.blocks.length) }
  return <div className="studio-design"><div className="studio-inspector" aria-label="Propriedades do elemento selecionado"><h3>{block ? `Seção ${selected+1}` : 'Cabeçalho e oferta'}</h3><button onClick={() => setSelected(-1)}>Editar cabeçalho</button>
    {block ? <>{text('Título',block.title,(title) => changeBlock({title}))}{text('Texto',block.body,(body) => changeBlock({body}),true)}<label>Tipo de bloco<select value={block.kind || 'content'} onChange={(e) => changeBlock({kind:e.target.value})}>{[['content','Texto e imagem'],['bonus','Produto / bônus'],['sample','Degustação'],['faq','Pergunta expansível'],['author','Autor'],['offer','Oferta'],['button','Botão'],['divider','Linha'],['spacer','Espaço']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>{text('Texto do botão',block.buttonLabel || '',(buttonLabel) => changeBlock({buttonLabel}))}{text('Link do botão (HTTPS)',block.buttonUrl || '',(buttonUrl) => changeBlock({buttonUrl}))}</> : <>{text('Faixa de destaque',draft.redLine || '',(redLine) => update({redLine}))}{text('Chamada acima do título',draft.eyebrow || '',(eyebrow) => update({eyebrow}))}{text('Título principal',draft.title,(title) => update({title}))}{text('Apresentação',draft.description,(description) => update({description}),true)}{text('Preço anterior',draft.originalPrice || '',(originalPrice) => update({originalPrice}))}{text('Preço da oferta',draft.priceLabel || '',(priceLabel) => update({priceLabel}))}{text('Texto dos botões',draft.ctaLabel,(ctaLabel) => update({ctaLabel}))}{text('Link padrão dos botões',draft.checkoutUrl,(checkoutUrl) => update({checkoutUrl}))}{text('Nome e rodapé',draft.name,(name) => update({name}))}<label>Cor de destaque<input type="color" value={draft.color} onChange={(e) => update({color:e.target.value})} /></label></>}
    <div className="studio-image-drop" onDragOver={(e)=>e.preventDefault()} onDrop={dropImage}><strong>Uma imagem por espaço</strong><p>Arraste a imagem aqui ou selecione um arquivo.</p><input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e: ChangeEvent<HTMLInputElement>)=>void upload(e.target.files?.[0])} /><p>{uploading ? 'Otimizando e enviando…' : 'A nova imagem substitui a anterior; sem biblioteca.'}</p></div>
    {text('Endereço da imagem',block?.imageUrl ?? draft.imageUrl,(imageUrl)=>block ? changeBlock({imageUrl}) : update({imageUrl}))}<button onClick={()=>block ? changeBlock({imageUrl:''}) : update({imageUrl:''})}>Remover imagem deste espaço</button>
    <details open><summary>Dimensões e espaçamentos</summary>{([['width','Largura do bloco (%)',20,100,100],['imageWidth','Largura da imagem (%)',10,100,100],['imageHeight','Altura máxima da imagem (px)',80,800,360],['padding','Espaço interno (px)',0,120,32],['margin','Margem entre blocos (px)',0,120,16],['gap','Espaço entre colunas (px)',0,80,24],['fontSize','Tamanho do texto (px)',14,64,18],['headingSize','Tamanho do título (px)',20,80,36],['buttonWidth','Largura do botão (%)',20,100,100],['buttonPadding','Espaço interno do botão (px)',8,40,16],['columns','Colunas de texto',1,3,1]] as const).map(([field,label,min,max,fallback])=><label key={field}>{label}: {style[field] ?? fallback}<input type="range" min={min} max={max} value={style[field] ?? fallback} onChange={(e)=>changeStyle({[field]:Number(e.target.value)})} /></label>)}<label>Fonte<select value={style.font || 'system'} onChange={(e)=>changeStyle({font:e.target.value})}><option value="system">Padrão</option><option value="serif">Serifada</option><option value="rounded">Verdana</option></select></label><label>Alinhamento<select value={style.align || 'left'} onChange={(e)=>changeStyle({align:e.target.value as Layout['align']})}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label><label>Encaixe da imagem<select value={style.imageFit || 'contain'} onChange={(e)=>changeStyle({imageFit:e.target.value as Layout['imageFit']})}><option value="contain">Mostrar inteira</option><option value="cover">Preencher</option></select></label><label>Cor de fundo<input type="color" value={style.background || '#ffffff'} onChange={(e)=>changeStyle({background:e.target.value})} /></label><label>Animação<select value={style.animation || 'none'} onChange={(e)=>changeStyle({animation:e.target.value})}><option value="none">Sem animação</option><option value="fade">Aparecer suavemente</option><option value="rise">Subir suavemente</option></select></label></details>
    {block && <button onClick={()=>{update({blocks:draft.blocks.filter((_,i)=>i!==selected)});setSelected(-1)}}>Remover este bloco</button>}
    <h3>Adicionar recurso</h3><div className="studio-add-blocks">{[['content','Texto e imagem'],['button','Botão'],['divider','Linha'],['spacer','Espaçamento'],['sample','Degustação'],['faq','Pergunta'],['offer','Oferta']].map(([kind,label])=><button key={kind} onClick={()=>add(kind)}>+ {label}</button>)}<button onClick={()=>addRow(2)}>+ Linha com 2 colunas</button><button onClick={()=>addRow(3)}>+ Linha com 3 colunas</button></div>
  </div><div className="studio-design-canvas"><p>Selecione uma seção para editar. Arraste pela alça para mudar a ordem.</p><StudioCanvas key={`${pageId}-${imageVersion}`} draft={draft} selected={selected} onSelect={setSelected} onMove={(from,to)=>{update({blocks:moveBlock(draft.blocks,from,to)});setSelected(to)}} /></div></div>
}
