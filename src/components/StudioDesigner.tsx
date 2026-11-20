import { useRef, useState } from 'react'
import type { Draft, Layout } from './studio-model'
import { StudioCanvas } from './StudioCanvas'
import { blankBlock, movePageBlocks } from './studio-model'

type Update = (value: Partial<Draft> | ((draft: Draft) => Partial<Draft>)) => void
export function StudioDesigner({ draft, pageId, update, flush, notice }: { draft: Draft; pageId: string; update: Update; flush: () => Promise<boolean>; notice: (value: string) => void }) {
  const [selected,setSelected]=useState(-1)
  const [kind,setKind]=useState('section')
  const [panel,setPanel]=useState<'layout'|'link'|'add'|null>(null)
  const [uploading,setUploading]=useState(false)
  const [imageVersion,setImageVersion]=useState(0)
  const fileInput=useRef<HTMLInputElement>(null)
  const imageTarget=useRef(-1)
  const block=selected>=0 ? draft.blocks[selected] : undefined
  const style=block?.style ?? draft.style ?? {}
  const buttonScope=kind.startsWith('button:')?kind.slice(7):'hero'
  const buttonConfig=draft.templateButtons?.[buttonScope]
  const buttonEnabled=block?block.showButton!==false:buttonConfig?.enabled!==false
  const changeButton=(change:object)=>block?changeBlock(change):update(latest=>({templateButtons:{...latest.templateButtons,[buttonScope]:{...latest.templateButtons?.[buttonScope],...change}}}))
  const changeBlock=(change: object)=>{const id=block?.id;update((latest)=>({blocks:latest.blocks.map((b)=>b.id===id?{...b,...change}:b)}))}
  const changeStyle=(change:Partial<Layout>)=>{const id=block?.id;update((latest)=>id?{blocks:latest.blocks.map((b)=>b.id===id?{...b,layoutCustomized:true,layoutOverrides:[...new Set([...(b.layoutOverrides||[]),...Object.keys(change)])],style:{...b.style,...change}}:b)}:{layoutCustomized:true,layoutOverrides:[...new Set([...(latest.layoutOverrides||[]),...Object.keys(change)])],style:{...latest.style,...change}})}
  const chooseImage=(index:number,file?:File)=>{setSelected(index);setKind('image');if(file){void upload(index,file)}else{imageTarget.current=index;fileInput.current?.click()}}
  const editText=(index:number,field:string,value:string)=>{if(field.startsWith('templateText:')){update(latest=>({templateTexts:{...latest.templateTexts,[field.slice(13)]:value}}));return}if(field.startsWith('buttonLabel:')){const scope=field.slice(12);update(latest=>({templateButtons:{...latest.templateButtons,[scope]:{...latest.templateButtons?.[scope],label:value}}}));return}if(field.startsWith('bodyLine:')||field.startsWith('listPart:')){const b=draft.blocks[index];if(!b)return;update(latest=>({blocks:latest.blocks.map(item=>{if(item.id!==b.id)return item;const parts=item.body.split(field.startsWith('bodyLine:')?'\n':'\n\n');const position=Number(field.split(':')[1]);if(field.startsWith('bodyLine:'))parts[position]=value;else{const pair=(parts[position]||'').split(' — ');pair[Number(field.split(':')[2])]=value;parts[position]=pair.join(' — ')}return {...item,body:parts.join(field.startsWith('bodyLine:')?'\n':'\n\n')}})}));return}const id=draft.blocks[index]?.id;update((latest)=>index<0 || ['originalPrice','priceLabel'].includes(field) ? {[field]:value} : {blocks:latest.blocks.map((b)=>b.id===id?{...b,[field]:value}:b)})}
  const add=(type:string,count=1)=>{if(draft.blocks.length+count>40){notice('Limite de 40 blocos por página.');return}const blocks=Array.from({length:count},()=>({...blankBlock(type),style:count>1?{width:Math.floor(100/count)}:{}}));update((latest)=>({blocks:[...latest.blocks,...blocks]}));setSelected(draft.blocks.length);setPanel(null)}
  async function upload(index: number, file?: File) {
    if (!file || uploading) return
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) { notice('Escolha PNG, JPEG ou WebP de até 10 MB para otimização.'); return }
    setUploading(true)
    const slot=draft.blocks[index]?.id || 'hero'
    try {
      if (!await flush()) return
      const bitmap = await createImageBitmap(file)
      if (bitmap.width*bitmap.height>40_000_000) { bitmap.close(); throw new Error('A imagem excede 40 megapixels.') }
      const ratio = Math.min(1,1600/Math.max(bitmap.width,bitmap.height))
      const canvas = document.createElement('canvas'); canvas.width=Math.round(bitmap.width*ratio); canvas.height=Math.round(bitmap.height*ratio)
      canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height); bitmap.close()
      const blob = await new Promise<Blob>((resolve,reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Não foi possível preparar a imagem.')),'image/webp',.86))
      if (blob.size>2*1024*1024) throw new Error('A imagem otimizada precisa ter até 2 MB.')
      const response=await fetch(`/api/platform/pages/${pageId}/images/${slot}`,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'image/webp'},body:blob})
      const result=await response.json(); if(!response.ok) throw new Error(result.message)
      update((latest)=>slot==='hero' ? {imageUrl:result.url} : {blocks:latest.blocks.map((b)=>b.id===slot ? {...b,imageUrl:result.url} : b)})
      await flush(); setImageVersion((v) => v+1); notice('Imagem atualizada neste espaço. Nenhuma biblioteca pessoal foi criada.')
    } catch(error) { notice(error instanceof Error ? error.message : 'Falha ao enviar imagem.') }
    finally { setUploading(false); if(fileInput.current) fileInput.current.value='' }
  }
  return <div className="studio-direct-editor">
    <div className="direct-toolbar" role="toolbar" aria-label="Ferramentas de edição na página">
      <strong>{selected<0?'Cabeçalho':`Seção ${selected+1}`} · {kind==='image'?'Imagem':kind==='buttonLabel'||kind==='ctaLabel'?'Botão':'Edição direta'}</strong>
      <button type="button" aria-expanded={panel==='add'} onClick={()=>setPanel(panel==='add'?null:'add')}>+ Adicionar</button>
      <button type="button" aria-expanded={panel==='layout'} onClick={()=>setPanel(panel==='layout'?null:'layout')}>Layout e estilo</button>
      <button type="button" aria-expanded={panel==='link'} onClick={()=>setPanel(panel==='link'?null:'link')}>Link do botão</button>
      <button type="button" onClick={()=>changeButton(block?{showButton:!buttonEnabled}:{enabled:!buttonEnabled})}>{buttonEnabled?'Remover botão de venda':'Adicionar botão de venda'}</button><button type="button" disabled={uploading} onClick={()=>chooseImage(selected)}>{uploading?'Enviando imagem…':'Trocar imagem'}</button>
      {block && <button type="button" onClick={()=>{update((latest)=>({blocks:latest.blocks.filter((b)=>b.id!==block.id)}));setSelected(-1);setPanel(null)}}>Remover bloco</button>}
      {panel && <div className="direct-popover" role="region" aria-label={panel==='layout'?'Layout do elemento':panel==='link'?'Destino do botão':'Adicionar recurso'}><button type="button" className="direct-popover-close" onClick={()=>setPanel(null)}>Fechar</button>
        {panel==='layout' && <>    <div className="direct-layout-controls"><h3>Dimensões e espaçamentos</h3>{([['width','Largura do bloco (%)',20,100,100],['imageWidth','Largura da imagem (%)',10,100,100],['imageHeight','Altura máxima da imagem (px)',80,800,360],['padding','Espaço interno (px)',0,120,32],['margin','Margem entre blocos (px)',0,120,16],['gap','Espaço entre colunas (px)',0,80,24],['fontSize','Tamanho do texto (px)',14,64,18],['headingSize','Tamanho do título (px)',20,80,36],['buttonWidth','Largura do botão (%)',20,100,100],['buttonPadding','Espaço interno do botão (px)',8,40,16],['columns','Colunas de texto',1,3,1]] as const).map(([field,label,min,max,fallback])=><label key={field}>{label}: {style[field] ?? fallback}<input type="range" min={min} max={max} value={style[field] ?? fallback} onChange={(e)=>changeStyle({[field]:Number(e.target.value)})} /></label>)}<label>Fonte<select value={style.font || 'system'} onChange={(e)=>changeStyle({font:e.target.value})}><option value="system">Padrão</option><option value="serif">Serifada</option><option value="rounded">Verdana</option></select></label><label>Alinhamento<select value={style.align || 'left'} onChange={(e)=>changeStyle({align:e.target.value as Layout['align']})}><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label><label>Encaixe da imagem<select value={style.imageFit || 'contain'} onChange={(e)=>changeStyle({imageFit:e.target.value as Layout['imageFit']})}><option value="contain">Mostrar inteira</option><option value="cover">Preencher</option></select></label><label>Cor de fundo<input type="color" value={style.background || '#ffffff'} onChange={(e)=>changeStyle({background:e.target.value})} /></label><label>Animação<select value={style.animation || 'none'} onChange={(e)=>changeStyle({animation:e.target.value})}><option value="none">Sem animação</option><option value="fade">Aparecer suavemente</option><option value="rise">Subir suavemente</option></select></label></div>
<label>Cor de destaque da página<input type="color" value={draft.color} onChange={(e)=>update(latest=>({color:e.target.value,layoutOverrides:[...new Set([...(latest.layoutOverrides||[]),'color'])]}))}/></label>{block&&<label>Tipo de bloco<select value={block.kind||'content'} onChange={(e)=>changeBlock({kind:e.target.value})}>{[['content','Texto e imagem'],['bonus','Produto / bônus'],['sample','Degustação'],['faq','Pergunta expansível'],['author','Autor'],['offer','Oferta'],['button','Botão'],['divider','Linha'],['spacer','Espaço']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}<button onClick={()=>block?changeBlock({imageUrl:''}):update({imageUrl:''})}>Remover imagem deste espaço</button></>}
        {panel==='link' && <><h3>{block?'Destino do botão desta seção':'Destino padrão dos botões'}</h3><label>Link HTTPS<input type="url" value={block?block.buttonUrl||'':buttonConfig?.url||''} onChange={(e)=>changeButton(block?{buttonUrl:e.target.value,inheritLink:false}:{url:e.target.value,inheritLink:false})}/></label><label className="direct-checkbox"><input type="checkbox" checked={block?block.inheritLink!==false:buttonConfig?.inheritLink!==false} onChange={e=>changeButton({inheritLink:e.target.checked})}/>Usar checkout padrão da página</label><button onClick={()=>changeButton(block?{buttonUrl:'',inheritLink:false}:{url:'',inheritLink:false})}>Remover link</button><label>Checkout padrão<input type="url" value={draft.checkoutUrl} onChange={e=>update({checkoutUrl:e.target.value})}/></label></>}
        {panel==='add' && <><h3>Adicionar à página</h3><div className="studio-add-blocks">{[['content','Texto e imagem'],['button','Botão'],['divider','Linha'],['spacer','Espaçamento'],['sample','Degustação'],['faq','Pergunta'],['offer','Oferta']].map(([type,label])=><button key={type} onClick={()=>add(type)}>+ {label}</button>)}<button onClick={()=>add('content',2)}>+ Linha com 2 colunas</button><button onClick={()=>add('content',3)}>+ Linha com 3 colunas</button></div></>}
      </div>}
    </div>
    <input className="direct-image-input" ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Enviar imagem para o elemento selecionado" onChange={(e)=>void upload(imageTarget.current,e.target.files?.[0])}/>
    <p className="direct-editor-hint">Clique no texto e escreva diretamente. Selecione uma imagem ou botão para ajustar. As alterações são salvas automaticamente.</p>
    <StudioCanvas key={`${pageId}-${imageVersion}`} draft={draft} selected={selected} onSelect={(index)=>{setSelected(index);setKind('section')}} onMove={(from,to)=>{const moved=draft.blocks[from]?.id;const blocks=movePageBlocks(draft,from,to);update({blocks});setSelected(blocks.findIndex(b=>b.id===moved))}} editing={{text:editText,select:(index,element)=>{setSelected(index);setKind(element)},image:chooseImage,resize:(index,value)=>{const id=draft.blocks[index]?.id;update((latest)=>index<0?{layoutCustomized:true,layoutOverrides:[...new Set([...(latest.layoutOverrides||[]),...Object.keys(value)])],style:{...latest.style,...value}}:{blocks:latest.blocks.map((b)=>b.id===id?{...b,layoutCustomized:true,layoutOverrides:[...new Set([...(b.layoutOverrides||[]),...Object.keys(value)])],style:{...b.style,...value}}:b)})}}}/>
  </div>
}
