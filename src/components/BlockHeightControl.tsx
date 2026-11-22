import {useRef,useState} from 'react'
import type {CSSProperties,PointerEvent} from 'react'

import {clampBlockHeight} from './block-height'
export function BlockHeightControl({value,onChange}:{value?:number;onChange:(height:number)=>void}){
 const ref=useRef<HTMLDivElement>(null),[live,setLive]=useState<number|null>(null)
 const drag=useRef<{y:number;height:number;scale:number;old:string;priority:string;target:HTMLElement}|null>(null)
 const end=(event:PointerEvent,save:boolean)=>{const state=drag.current;if(!state)return;drag.current=null;state.target.style.setProperty('min-height',state.old,state.priority);setLive(null);if(save)onChange(clampBlockHeight(state.height+(event.clientY-state.y)/state.scale))}
 const control:CSSProperties={font:'600 12px/1.4 system-ui',border:'1px solid #e7ad8e',borderRadius:8,padding:'6px 9px',background:'#fff1e6',color:'#803e27'}
 return <div ref={ref} data-hp-editor="true" role="group" aria-label="Altura do bloco" onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',zIndex:40,display:'flex',alignItems:'center',gap:5,padding:4,borderRadius:10,background:'#fff8f0',boxShadow:'0 2px 10px #183f3a22',maxWidth:'100%',flexWrap:'wrap',justifyContent:'center'}}>
  <button type="button" aria-label="Arrastar para dimensionar altura do bloco" title="Arraste para cima ou para baixo; use as setas para ajustar" style={{...control,cursor:'ns-resize',touchAction:'none'}} onKeyDown={e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();onChange(clampBlockHeight((value||ref.current?.parentElement?.getBoundingClientRect().height||0)+(e.key==='ArrowDown'?10:-10)))}}} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();const target=ref.current?.parentElement;if(!target)return;const rect=target.getBoundingClientRect(),scale=rect.height/target.offsetHeight||1;drag.current={y:e.clientY,height:rect.height/scale,scale,target,old:target.style.getPropertyValue('min-height'),priority:target.style.getPropertyPriority('min-height')};e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{const state=drag.current;if(!state)return;const height=clampBlockHeight(state.height+(e.clientY-state.y)/state.scale);state.target.style.setProperty('min-height',height+'px','important');setLive(height)}} onPointerUp={e=>end(e,true)} onPointerCancel={e=>end(e,false)}>↕ Altura</button>
  <label style={{font:'12px system-ui',color:'#183f3a'}}>px <input aria-label="Altura mínima do bloco em pixels" type="number" min="0" max="6000" step="10" value={live??value??0} title="0 = automática. O bloco sempre comporta seu conteúdo." onChange={e=>{if(e.target.value!=='')onChange(clampBlockHeight(Number(e.target.value)))}} style={{...control,width:76,background:'white'}}/></label>
  <button type="button" style={control} onClick={()=>onChange(0)}>Automática</button>
 </div>
}
