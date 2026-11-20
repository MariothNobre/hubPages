export const heartbeatMs=15000
export const onlineSeconds=90
export const metricsRefreshMs=5000

// One ID per document access. Retrying delivery or resuming a hidden tab is not another access.
export function createVisitSession(send,uuid) {
  let viewId=uuid(),sequence=0,pending=true,closed=false,started=false
  function emit(active){const id=viewId,event={viewId:id,sequence:++sequence,isNewVisit:pending,active};void Promise.resolve().then(()=>send(event)).then(ok=>{if(ok&&id===viewId)pending=false}).catch(()=>undefined)}
  return {
    open(restored=false){if(restored||closed){viewId=uuid();pending=true}closed=false;started=true;emit(true)},
    heartbeat(){if(started&&!closed)emit(true)},
    close(){if(started&&!closed){closed=true;emit(false)}},
  }
}
