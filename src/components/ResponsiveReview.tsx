import { useEffect, useRef, useState } from 'react'
import type { Draft } from './studio-model'

const devices:Record<string,{name:string;width:number;height:number}>={desktop:{name:'Computador',width:1280,height:900},tablet:{name:'Tablet',width:768,height:1024},mobile:{name:'Celular',width:375,height:812}}
export function ResponsiveReview({pageId,draft,viewport}:{pageId:string;draft:Draft;viewport:string}) {
  const host=useRef<HTMLDivElement>(null),frame=useRef<HTMLIFrameElement>(null),latest=useRef(draft)
  const [available,setAvailable]=useState(0)
  const [status,setStatus]=useState<{id:string;ready:boolean;error:string}>({id:'',ready:false,error:''})
  const device=devices[viewport]||devices.desktop
  const scale=available?Math.min(1,Math.max(0,available-2)/device.width):1
  useEffect(()=>{const element=host.current;if(!element)return;const observer=new ResizeObserver(([entry])=>setAvailable(entry.contentRect.width));observer.observe(element);return()=>observer.disconnect()},[])
  useEffect(()=>{
    latest.current=draft
    if(status.id===pageId&&status.ready)frame.current?.contentWindow?.postMessage({type:'hubpages:preview-draft',pageId,draft},window.location.origin)
  },[draft,pageId,status])
  useEffect(()=>{
    const receive=(event:MessageEvent)=>{
      if(event.origin!==window.location.origin||event.source!==frame.current?.contentWindow||event.data?.pageId!==pageId)return
      if(event.data.type==='hubpages:preview-ready'){
        setStatus({id:pageId,ready:true,error:''})
        frame.current?.contentWindow?.postMessage({type:'hubpages:preview-draft',pageId,draft:latest.current},window.location.origin)
      }else if(event.data.type==='hubpages:preview-error')setStatus({id:pageId,ready:false,error:'Não foi possível abrir a prévia. Tente recarregar o Studio ou abrir a prévia em uma nova aba.'})
    }
    window.addEventListener('message',receive)
    return()=>window.removeEventListener('message',receive)
  },[pageId])
  return <section className="review-device" aria-label={`Visualização em ${device.name}`}><div className="review-device-info"><strong>{device.name}</strong><span>{device.width} × {device.height} px · {Math.round(scale*100)}%</span></div><p className="review-device-hint">Role dentro da prévia para explorar a página. Os links de compra abrem em uma nova aba.</p>{(status.id!==pageId||!status.ready)&&<p role="status">{status.id===pageId&&status.error?status.error:'Preparando a visualização…'}</p>}<div ref={host} className="review-device-host"><div className="review-device-screen" style={{width:device.width*scale,height:device.height*scale,visibility:available?'visible':'hidden'}}><iframe ref={frame} title={`Prévia responsiva da página — ${device.name}`} src={`/studio/preview/${pageId}?embedded=1`} width={device.width} height={device.height} style={{width:device.width,height:device.height,transform:`scale(${scale})`}} sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" /></div></div></section>
}
