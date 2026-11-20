import { useRef,type CSSProperties } from 'react'
import type { CanvasEditing } from './StudioCanvas'
export function CanvasMedia({src,title,type='image',index=-1,editing,thumbnail=false,attributes={}}:{src:string;title:string;type?:'image'|'video';index?:number;editing?:CanvasEditing;thumbnail?:boolean;attributes?:{className?:string;style?:CSSProperties;alt?:string}}){
  const resize=useRef<{x:number;y:number;width:number;height:number;parent:number}|null>(null)
  const media=src?(type==='video'?<video key={src+':'+(editing?.mediaVersion||0)} src={src} className={attributes.className} style={attributes.style} aria-label={title} controls={!thumbnail} playsInline preload="metadata"/>:<img key={src+':'+(editing?.mediaVersion||0)} {...attributes} src={src} alt={attributes.alt??title}/>):null
  if(!editing||thumbnail)return media
  return <div className="legacy-inline-image canvas-media-edit" data-media-index={index} onClick={e=>{e.stopPropagation();editing.select(index,'image')}} onDragOver={e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();e.stopPropagation()}}} onDrop={e=>{if(e.dataTransfer.files.length){e.preventDefault();e.stopPropagation();editing.image(index,e.dataTransfer.files[0])}}}>
    {media||<p className="canvas-image-empty">Insira imagem, foto ou vídeo</p>}
    <button className="canvas-media-replace" type="button" aria-label={`Trocar mídia ${title||'deste espaço'}`} onClick={e=>{e.preventDefault();e.stopPropagation();editing.image(index)}}>Trocar imagem / vídeo</button>
    <button className="legacy-image-resize" type="button" aria-label="Redimensionar mídia arrastando" onPointerDown={e=>{e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);editing.select(index,'image');const parent=e.currentTarget.parentElement!;resize.current={x:e.clientX,y:e.clientY,width:100,height:parent.getBoundingClientRect().height,parent:parent.getBoundingClientRect().width}}} onPointerMove={e=>{const r=resize.current;if(r)editing.resize(index,{imageWidth:Math.round(Math.min(100,Math.max(10,r.width+(e.clientX-r.x)/Math.max(1,r.parent)*100))),imageHeight:Math.round(Math.min(800,Math.max(80,r.height+e.clientY-r.y)))})}} onPointerUp={()=>{resize.current=null}} onPointerCancel={()=>{resize.current=null}}/>
  </div>
}
