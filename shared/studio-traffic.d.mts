export const heartbeatMs:number
export const onlineSeconds:number
export const metricsRefreshMs:number
export interface VisitEvent {viewId:string;sequence:number;isNewVisit:boolean;active:boolean}
export function createVisitSession(send:(event:VisitEvent)=>Promise<boolean>,uuid:()=>string):{open:(restored?:boolean)=>void;heartbeat:()=>void;close:()=>void}
