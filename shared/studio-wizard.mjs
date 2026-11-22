const canonicalText=value=>{const text=value.trim();if(/^https:\/\//.test(text))try{return new URL(text).toString()}catch{/* Still being edited. */}return text}
const clean=value=>value===undefined||value===null?'':typeof value==='string'?canonicalText(value).replace(/\/api\/(?:platform\/pages|public\/publications)\/[a-f0-9-]{36}\/images\//g,'@image/'):Array.isArray(value)?value.map(clean):typeof value==='object'?Object.fromEntries(Object.keys(value).filter(key=>value[key]!==undefined).sort().map(key=>[key,clean(value[key])])):value
const equal=(a,b)=>JSON.stringify(clean(a))===JSON.stringify(clean(b))
const snippet=value=>typeof value==='string'?value.replace(/\s+/g,' ').slice(0,130):''
export function pendingChanges(draft,published,changedImageSlots=[]) {
  if(!published)return [{id:'initial',label:'Primeira publicação',detail:'Leve o conteúdo deste rascunho para o seu link pela primeira vez.'}]
  const changes=[]
  const add=(id,label,before,after,detail)=>{if(!equal(before,after))changes.push({id,label,detail:detail|| (snippet(after)?`Agora: ${snippet(after)}`:'Configuração atualizada.')})}
  const fields={textColors:'Cores dos textos',name:'Nome da página e rodapé',title:'Título principal',description:'Apresentação',redLine:'Faixa de destaque',eyebrow:'Chamada inicial',originalPrice:'Preço anterior',priceLabel:'Preço da oferta',ctaLabel:'Texto padrão dos botões',checkoutUrl:'Link padrão de compra',publicUrl:'Endereço da página',imageUrl:'Imagem principal',color:'Cor de destaque',colorTheme:'Tema de cores',locale:'Idioma',template:'Modelo',offerGallery:'Mídias da galeria da oferta',mediaType:'Tipo da mídia principal',sectionCounts:'Quantidade de cards',sampleEnabled:'Degustação habilitada',imported:'Estrutura e aparência importadas',importedAssets:'Mídias importadas'}
  const defaults={textColors:{},colorTheme:'original',mediaType:'image',sampleEnabled:true,sectionCounts:{}}
  for(const [key,label]of Object.entries(fields))add(key,label,published[key]??defaults[key],draft[key]??defaults[key])
  add('layout','Layout da página',[published.style||{},published.layoutOverrides||[],!!published.layoutCustomized],[draft.style||{},draft.layoutOverrides||[],!!draft.layoutCustomized])
  add('pixel','Meta Pixel',[published.metaPixelId||'',!!published.metaPixelEnabled],[draft.metaPixelId||'',!!draft.metaPixelEnabled],'ID ou ativação do Pixel alterado para esta página.')
  for(const key of new Set([...Object.keys(published.templateTexts||{}),...Object.keys(draft.templateTexts||{})]))add('text:'+key,'Texto da página',published.templateTexts?.[key],draft.templateTexts?.[key])
  for(const key of new Set([...Object.keys(published.templateButtons||{}),...Object.keys(draft.templateButtons||{})]))add('button:'+key,`Botão: ${{header:'cabeçalho',hero:'apresentação',faq:'perguntas frequentes',sticky:'barra fixa',preview:'degustação'}[key]||key}`,published.templateButtons?.[key]||{},draft.templateButtons?.[key]||{})
  const before=new Map((published.blocks||[]).map(block=>[block.id,block])),after=new Map((draft.blocks||[]).map(block=>[block.id,block]))
  if(!equal([...before.keys()].filter(id=>after.has(id)),[...after.keys()].filter(id=>before.has(id))))changes.push({id:'order',label:'Ordem das seções',detail:'As seções foram reorganizadas na página.'})
  for(const block of draft.blocks||[]) {
    const old=before.get(block.id),name=snippet(block.title)||'Seção sem título'
    if(!old){changes.push({id:'add:'+block.id,label:`Nova seção: ${name}`,detail:'Uma seção foi adicionada ao conteúdo.'});continue}
    for(const [key,label]of Object.entries({title:'Título',body:'Texto',imageUrl:'Imagem',kind:'Tipo de seção',enabled:'Visibilidade da seção',mediaType:'Tipo de mídia',sampleSource:'Origem da degustação',sampleKicker:'Chamada da degustação',importHtml:'Conteúdo importado',sourceRole:'Estrutura do bloco duplicado',textOverrides:'Textos do bloco duplicado',sectionCounts:'Quantidade de cards do bloco'}))add(`${block.id}:${key}`,`${label}: ${name}`,old[key]??({enabled:true,mediaType:'image',sampleSource:'@template',sampleKicker:'@template'})[key],block[key]??({enabled:true,mediaType:'image',sampleSource:'@template',sampleKicker:'@template'})[key])
    add(block.id+':button',`Botão de compra: ${name}`,[old.buttonLabel||'',old.buttonUrl||'',old.showButton!==false,old.inheritLink!==false],[block.buttonLabel||'',block.buttonUrl||'',block.showButton!==false,block.inheritLink!==false])
    add(block.id+':layout',`Layout: ${name}`,[old.style||{},old.layoutOverrides||[],!!old.layoutCustomized],[block.style||{},block.layoutOverrides||[],!!block.layoutCustomized])
  }
  for(const [id,block]of before)if(!after.has(id))changes.push({id:'remove:'+id,label:`Seção removida: ${snippet(block.title)}`,detail:'Esta seção deixará de aparecer depois da publicação.'})
  for(const slot of changedImageSlots){const media=after.get(slot)||(draft.offerGallery||[]).find(m=>m.id===slot)||(draft.importedAssets||[]).find(m=>m.id===slot);const id=slot==='hero'?'imageUrl':slot+':imageUrl';if(!changes.some(c=>c.id===id)&& (slot==='hero'?String(draft.imageUrl).includes('/images/hero'):String(media?.imageUrl).includes('/images/'+slot)))changes.push({id,label:slot==='hero'?'Imagem principal':`Imagem: ${snippet(media?.title)||'seção'}`,detail:'O arquivo de imagem foi substituído neste espaço.'})}
  return changes
}
export function reviewSignature(draft,assetVersion='') {
  const {step:_step,visitedSteps:_visited,addressAuto:_auto,reviewedSignature:_review,...content}=draft
  const text=JSON.stringify(clean(content))+'|'+assetVersion
  let hash=2166136261
  for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)
  return (hash>>>0).toString(16)
}

export function wizardReadiness(draft,origin,reviewed,published,pending) {
  let address=false;try{const url=new URL(draft.publicUrl);address=url.origin===origin&&/^\/[a-z0-9][a-z0-9_-]*$/.test(url.pathname)}catch{/* Address is still being chosen. */}
  let checkout=false;try{const url=new URL(draft.checkoutUrl);checkout=url.protocol==='https:'&&!url.username&&!url.password}catch{/* Checkout is still being filled. */}
  return [!!draft.name.trim(),!!draft.title.trim(),checkout,!draft.metaPixelEnabled||/^\d{5,30}$/.test(draft.metaPixelId),address,reviewed,published&&pending===0].map((valid,i)=>valid&&(draft.visitedSteps||[]).includes([1,2,4,5,6,7,8][i]))
}
