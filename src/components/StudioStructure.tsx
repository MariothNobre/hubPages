import { defaultOfferMedia,blankBlock,type Draft } from './studio-model'
type Update=(value:Partial<Draft>|((draft:Draft)=>Partial<Draft>))=>void
export function StudioStructure({draft,update,notice,scope,targetId}:{draft:Draft;update:Update;notice:(message:string)=>void;scope?:string;targetId?:string}){
  const count=(key:string)=>key==='bonus'||key==='sample'?draft.blocks.filter(b=>b.kind===key).length:(draft.blocks.find(b=>targetId?b.id===targetId:b.templateRole===key)?.body.split('\n\n').length||0)
  function resize(key:'method'|'manual'|'bonus'|'sample',n:number){
    if(!Number.isInteger(n)||n<0||n>20)return
    const extra=Math.max(0,n-count(key));if((key==='bonus'||key==='sample')&&draft.blocks.length+extra>40){notice('Limite de 40 blocos por página. Reduza outros blocos antes de adicionar cards.');return}
    update(latest=>{
      const blocks=[...latest.blocks]
      if(key==='bonus'||key==='sample'){
        const group=blocks.filter(b=>b.kind===key),last=blocks.map(b=>b.kind).lastIndexOf(key),newBlocks=Array.from({length:Math.max(0,n-group.length)},()=>({...blankBlock(key),templateRole:key+'-'+crypto.randomUUID(),title:key==='bonus'?'Novo bônus':'Nova página',body:'Escreva a descrição deste conteúdo.',sampleSource:key==='sample'?'Meu conteúdo':undefined,sampleKicker:key==='sample'?'Uma ideia para experimentar':undefined,showButton:key==='bonus',inheritLink:true}))
        blocks.splice(last<0?blocks.length:last+1,0,...newBlocks)
      }else{
        const index=blocks.findIndex(b=>targetId?b.id===targetId:b.templateRole===key)
        if(index>=0){const entries=blocks[index].body?blocks[index].body.split('\n\n'):[];while(entries.length<n)entries.push('Novo card — Escreva a descrição deste card.');blocks[index]={...blocks[index],body:entries.join('\n\n')}}
      }
      const target=blocks.find(b=>b.id===targetId);if(target?.sourceRole)return{blocks:blocks.map(b=>b.id===targetId?{...b,sectionCounts:{...b.sectionCounts,[key]:n}}:b)};return {blocks,sectionCounts:{...latest.sectionCounts,[key]:n}}
    })
  }
  const author=draft.blocks.find(b=>targetId&&scope==='author'?b.id===targetId:b.kind==='author')
  const include=(key:string)=>!scope||scope===key||scope==='tasting'&&key==='sample'||scope==='bonuses'&&key==='bonus'
  return <section className="studio-structure" aria-label="Estrutura e visibilidade"><h3>{scope?'Configurações deste bloco':'Cards e recursos da página'}</h3><p>Escolha quantos cards aparecem. Reduzir a quantidade oculta os excedentes e preserva seus textos para reutilizar.</p><div>{([['method','Cards do método'],['manual','Cards do conteúdo'],['bonus','Cards de bônus'],['sample','Páginas da degustação']] as const).filter(([key])=>include(key)).map(([key,label])=><label key={key}>{label}<input type="number" min={0} max={20} value={draft.sectionCounts?.[key]??count(key)} onChange={e=>resize(key,Number(e.target.value))}/></label>)}</div>{(!scope||scope==='offer')&&<label>Mídias da coleção (máximo 6)<input type="number" min={0} max={6} value={(draft.offerGallery??defaultOfferMedia(draft)).length} onChange={e=>{const n=Number(e.target.value);if(!Number.isInteger(n)||n<0||n>6)return;update(latest=>{const defaults=defaultOfferMedia(latest),items=[...(latest.offerGallery??defaults)].slice(0,n);for(const item of defaults)if(items.length<n&&!items.some(i=>i.id===item.id))items.push(item);while(items.length<n)items.push({id:crypto.randomUUID(),imageUrl:'',mediaType:'image',title:'Nova mídia'});return{offerGallery:items}})}}/></label>}{(!scope||['sample','tasting'].includes(scope))&&<label className="direct-checkbox"><input type="checkbox" checked={draft.sampleEnabled!==false} onChange={e=>update({sampleEnabled:e.target.checked})}/>Habilitar degustação na página</label>}{author&&(!scope||scope==='author')&&<label className="direct-checkbox"><input type="checkbox" checked={author.enabled!==false} onChange={e=>update(latest=>({blocks:latest.blocks.map(b=>b.id===author.id?{...b,enabled:e.target.checked}:b)}))}/>Exibir seção do autor</label>}<p>Cada botão tem seu próprio controle “Exibido / Oculto”. Os elementos ocultos continuam disponíveis para editar aqui.</p></section>
}
