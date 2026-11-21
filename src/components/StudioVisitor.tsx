import { useEffect,useRef } from 'react'
import { createVisitSession,heartbeatMs } from '../../shared/studio-traffic.mjs'

export function StudioVisitor({publicationId}:{publicationId:string}) {
  const session=useRef<ReturnType<typeof createVisitSession>|null>(null),generation=useRef({value:0})
  useEffect(()=>{
    const lifecycle=generation.current,current=++lifecycle.value
    if(!session.current){
      let visitorId:string=crypto.randomUUID()
      try{const key='hubpages_visitor_id',stored=localStorage.getItem(key);if(stored&&/^[a-f0-9-]{36}$/.test(stored))visitorId=stored;else localStorage.setItem(key,visitorId)}catch{/* Presence still works for this document without local storage. */}
      const tabId=crypto.randomUUID(),pageUrl=window.location.href
      session.current=createVisitSession(async event=>{
        const response=await fetch('/api/public/traffic',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({publicationId,visitorId,tabId,url:pageUrl,...event})})
        return response.ok
      },()=>crypto.randomUUID())
    }
    const tracker=session.current
    tracker.open()
    const interval=setInterval(()=>tracker.heartbeat(),heartbeatMs)
    const visibility=()=>tracker.heartbeat(),leave=()=>tracker.close(),restore=(event:PageTransitionEvent)=>{if(event.persisted)tracker.open(true)}
    document.addEventListener('visibilitychange',visibility)
    window.addEventListener('pagehide',leave);window.addEventListener('pageshow',restore)
    return()=>{
      clearInterval(interval);document.removeEventListener('visibilitychange',visibility)
      window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',restore)
      // React StrictMode replays effects. Its simulated cleanup must not close a live tab.
      queueMicrotask(()=>{if(lifecycle.value===current)tracker.close()})
    }
  },[publicationId])
  return null
}
