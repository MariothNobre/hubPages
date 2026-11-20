import type { Draft } from './studio-model'
export type UndoEntry={draft:Draft;media:Promise<Map<string,Blob>>;bytes:number}
export class StudioUndo {
  entries:UndoEntry[]=[]
  private reads:Promise<unknown>=Promise.resolve()
  slots(draft:Draft,pageId:string){const prefix=`/api/platform/pages/${pageId}/images/`;return new Map([draft.imageUrl,...draft.blocks.map(b=>b.imageUrl),...(draft.offerGallery||[]).map(m=>m.imageUrl)].filter(url=>url.startsWith(prefix)).map(url=>[url.slice(prefix.length),url]))}
  capture(draft:Draft,pageId:string,slots:string[]){const urls=this.slots(draft,pageId);return Promise.all([...new Set(slots)].filter(slot=>urls.has(slot)).map(async slot=>{const r=await fetch(urls.get(slot)!,{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw new Error('Não foi possível preservar a mídia para desfazer. Tente novamente.');return [slot,await r.blob()] as const})).then(items=>new Map(items))}
  record(draft:Draft,media:Promise<Map<string,Blob>>=Promise.resolve(new Map())){const entry={draft:structuredClone(draft),media,bytes:0};this.entries.push(entry);if(this.entries.length>50)this.entries.shift();this.reads=Promise.all([this.reads,media.then(items=>{entry.bytes=[...items.values()].reduce((n,b)=>n+b.size,0);while(this.entries.length>1&&this.entries.reduce((n,e)=>n+e.bytes,0)>100*1024*1024)this.entries.shift()})]);void this.reads.catch(()=>undefined);return entry}
  async settled(){await this.reads}
  clear(){this.entries=[];this.reads=Promise.resolve()}
}
