export interface Layout { width?: number; imageWidth?: number; padding?: number; margin?: number; gap?: number; fontSize?: number; headingSize?: number; buttonWidth?: number; buttonPadding?: number; font?: string; columns?: number; align?: 'left' | 'center' | 'right'; animation?: string; background?: string; imageFit?: 'contain' | 'cover'; imageHeight?: number }
export interface Block { sourceRole?:string;textOverrides?:Record<string,string>;sectionCounts?:Draft['sectionCounts']; id: string; title: string; body: string; imageUrl: string; mediaType?:'image'|'video';enabled?:boolean;sampleSource?:string;sampleKicker?:string; kind?: string; buttonLabel?: string; buttonUrl?: string; showButton?:boolean; inheritLink?:boolean; templateRole?:string; layoutCustomized?:boolean; layoutOverrides?:string[]; style?: Layout }
export interface MediaItem {id:string;imageUrl:string;mediaType?:'image'|'video';title?:string}
export interface Draft { offerGallery?:MediaItem[]; mediaType?:'image'|'video';sampleEnabled?:boolean;sectionCounts?:Partial<Record<'method'|'manual'|'bonus'|'sample',number>>; name: string; title: string; description: string; ctaLabel: string; checkoutUrl: string; publicUrl: string; addressAuto?:boolean;reviewedSignature?:string;visitedSteps?:number[]; imageUrl: string; metaPixelId: string; metaPixelEnabled?:boolean; ga4Id: string; color: string; step: number; locale: 'pt-BR' | 'es'; template: string; blocks: Block[]; redLine?: string; eyebrow?: string; priceLabel?: string; originalPrice?: string; style?: Layout; layoutCustomized?:boolean; layoutOverrides?:string[]; templateTexts?:Record<string,string>; templateButtons?:Record<string,TemplateButton> }
export const blankBlock = (kind = 'content'): Block => ({ id: crypto.randomUUID(), title: kind === 'sample' ? 'Degustação do conteúdo' : 'Nova seção', body: '', imageUrl: '', kind, style: {} })
export interface TemplateButton { enabled?:boolean; label?:string; url?:string; inheritLink?:boolean }
export function moveBlock(blocks: Block[], from: number, to: number) { const next = [...blocks]; if (from < 0 || to < 0 || from >= next.length || to >= next.length) return next; next.splice(to,0,next.splice(from,1)[0]); return next }
export function movePageBlocks(draft:Draft,from:number,to:number) {
  const blocks=draft.blocks
  if(!['infancia_pt','infancia_es'].includes(draft.template)||!blocks[from]||!blocks[to])return moveBlock(blocks,from,to)
  const group=(b:Block)=>['bonus','sample','faq'].includes(b.kind||'')?b.kind:b.templateRole||b.id
  const source=group(blocks[from]),target=group(blocks[to])
  if(source===target)return moveBlock(blocks,from,to)
  const moving=blocks.filter(b=>group(b)===source),rest=blocks.filter(b=>group(b)!==source)
  const targets=rest.flatMap((b,i)=>group(b)===target?[i]:[])
  const at=from<to?targets[targets.length-1]+1:targets[0]
  rest.splice(at,0,...moving)
  return rest
}

export function defaultOfferMedia(draft:Draft):MediaItem[]{const offer=draft.blocks.find(b=>b.templateRole==='offer');return [{id:offer?.id||'hero',imageUrl:offer?.imageUrl||draft.imageUrl,mediaType:offer?.mediaType||draft.mediaType,title:draft.locale==='es'?'Infancia Más Allá de las Pantallas':'Infância Além das Telas'},...draft.blocks.filter(b=>b.kind==='bonus').slice(0,5).map(b=>({id:b.id,imageUrl:b.imageUrl,mediaType:b.mediaType,title:b.title}))]}
