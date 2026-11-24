import {useCallback,useId,useMemo,useState,type ReactNode} from 'react'
import {EditorToolsContext} from './editor-tools-context'
import './editor-tools-dock.css'

export function EditorToolsDock({title,tools,actions,children}:{title:string;tools:ReactNode;actions?:ReactNode;children:ReactNode}){
 const [expanded,setExpanded]=useState(true),[text,setText]=useState<HTMLDivElement|null>(null),[object,setObject]=useState<HTMLDivElement|null>(null),[canvas,setCanvas]=useState<HTMLDivElement|null>(null)
 const textHost=useCallback((node:HTMLDivElement|null)=>setText(node),[]),objectHost=useCallback((node:HTMLDivElement|null)=>setObject(node),[])
 const canvasHost=useCallback((node:HTMLDivElement|null)=>setCanvas(node),[])
 const hosts=useMemo(()=>({text,object,canvas}),[text,object,canvas]),id=useId()
 return <EditorToolsContext.Provider value={hosts}><div className={'editor-tools-layout'+(expanded?' tools-expanded':' tools-collapsed')}>
  <div className="editor-tools-canvas">{children}</div>
  <button type="button" className="editor-tools-tab" aria-controls={id} aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)} title={expanded?'Recolher ferramentas':'Abrir ferramentas de edição'}><span aria-hidden="true">{expanded?'›':'‹'}</span><span>Ferramentas</span></button>
  <aside id={id} className="editor-tools-sidebar" aria-label="Ferramentas da página" hidden={!expanded} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setExpanded(false)}}}>
   <header className="editor-tools-heading"><div><span>HUBPAGES · EDITOR</span><h2>Suas ferramentas</h2></div><button type="button" aria-label="Recolher ferramentas de edição" onClick={()=>setExpanded(false)}>×</button></header>
   {actions&&<div className="editor-tools-global-actions">{actions}</div>}
   <div className="editor-tools-current"><span>SELEÇÃO ATUAL</span><strong>{title}</strong><p>Clique em outro elemento da página para ver seus ajustes.</p></div>
   <div className="editor-tools-scroll"><div ref={textHost} className="editor-tools-text-host"/><div ref={objectHost} className="editor-tools-object-host"/>{tools}<div ref={canvasHost}/></div>
   <footer>Edite no rascunho. Revise e publique quando estiver pronto.</footer>
  </aside>
 </div></EditorToolsContext.Provider>
}
