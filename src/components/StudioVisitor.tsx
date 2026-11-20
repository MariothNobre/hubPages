import { useEffect } from 'react'
export function StudioVisitor({publicationId}:{publicationId:string}) {
  useEffect(()=>{
    let visitorId:string=crypto.randomUUID();try{const key='hubpages_visitor_id',stored=localStorage.getItem(key);if(stored&&/^[a-f0-9-]{36}$/.test(stored))visitorId=stored;else localStorage.setItem(key,visitorId)}catch{/* Measurement still works for this page without storage. */}
    const tabId=crypto.randomUUID()
    const send=(isNewVisit:boolean,active=document.visibilityState==='visible')=>{void fetch('/api/public/traffic',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({publicationId,visitorId,tabId,url:window.location.href,isNewVisit,active})}).catch(()=>undefined)}
    if(document.visibilityState==='visible')send(true)
    const interval=setInterval(()=>{if(document.visibilityState==='visible')send(false)},15000)
    const visibility=()=>send(document.visibilityState==='visible'),leave=()=>send(false,false)
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leave)
    return()=>{clearInterval(interval);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);leave()}
  },[publicationId])
  return null
}
