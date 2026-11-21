import type { CSSProperties,ReactNode } from 'react'
import type { CanvasEditing } from './StudioCanvas'

// All templates use this boundary: editable actions never carry a navigable href.
export function EditorAction({editing,index=-1,scope,enabled=true,label,className,style,href,onActivate}:{editing?:CanvasEditing;index?:number;scope:string;enabled?:boolean;label:ReactNode;className?:string;style?:CSSProperties;href?:string;onActivate?:()=>void}){
  if(!editing){if(!enabled)return null;return onActivate?<button type="button" className={className} style={style} onClick={onActivate}>{label}</button>:<a className={className} style={style} href={href||undefined} aria-disabled={!href} onClick={e=>{if(!href)e.preventDefault()}}>{label}</a>}
  return <div className={`editor-action ${enabled?'':'is-hidden-action'}`}><div role="group" onClickCapture={e=>{if(e.target instanceof Element&&e.target.closest('[contenteditable]'))queueMicrotask(()=>editing.select(index,`button:${scope}`))}} className={className} style={style} onClick={e=>{e.stopPropagation();editing.select(index,`button:${scope}`)}}>{label}</div><button type="button" className="editor-action-toggle" aria-label={`${enabled?'Ocultar':'Exibir'} botão ${scope}`} aria-pressed={enabled} onClick={e=>{e.preventDefault();e.stopPropagation();editing.button(index,scope,!enabled)}}>{enabled?'◉ Exibido':'○ Oculto na publicação'}</button>{onActivate&&<button type="button" className="editor-sample-open" onClick={e=>{e.preventDefault();e.stopPropagation();onActivate()}}>Editar degustação</button>}</div>
}
