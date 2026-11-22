import {defaultOfferMedia,type Draft} from './studio-model'
import type {CanvasEditing} from './StudioCanvas'
import {Fragment,type CSSProperties} from 'react'
import {CanvasMedia} from './CanvasMedia'
export function StudioMediaGallery({draft,editing,label}:{draft:Draft;editing?:CanvasEditing;label:string}){
 const items=draft.offerGallery??defaultOfferMedia(draft)
 if(!items.length&&!editing)return null
 return <div className={'sales-v2-offer__books'+(editing?' is-editing-gallery':'')} data-gallery-count={items.length} aria-label={label}>{items.map((item,i)=>{
  const style=item.style||{},custom=style.imageAlign!==undefined||style.imageWidth!==undefined||style.imageHeight!==undefined
  const mediaStyle={...(style.imageWidth!==undefined?{width:style.imageWidth+'%','--hp-gallery-width':style.imageWidth+'%'}:{}),...(style.imageHeight!==undefined?{height:style.imageHeight,'--hp-gallery-height':style.imageHeight+'px'}:{}),...(style.imageFit?{objectFit:style.imageFit}:{} )} as CSSProperties
  const media=<CanvasMedia mediaAlign={style.imageAlign} src={item.imageUrl} title={item.title||`Mídia ${i+1} da coleção`} type={item.mediaType} index={draft.blocks.findIndex(b=>b.id===item.id)} editing={editing?{...editing,resize:(_index,value)=>editing.update?.(latest=>({offerGallery:(latest.offerGallery??defaultOfferMedia(latest)).map(m=>m.id===item.id?{...m,style:{...m.style,...value}}:m)})),select:(index)=>editing.select(index,'gallery:'+item.id),image:(index,file)=>editing.image(index,file,item.id)}:undefined} attributes={{className:!editing&&custom?undefined:i===0?'offer-main-cover':undefined,alt:item.title,style:Object.keys(mediaStyle).length?mediaStyle:undefined}}/>
  return !editing&&custom?<div key={item.id} className={'sales-gallery-slot'+(i===0?' offer-main-cover':'')}>{media}</div>:<Fragment key={item.id}>{media}</Fragment>
 })}</div>
}
