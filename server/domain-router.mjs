// Fixed internal destinations only. No user-provided host can become an upstream URL.
export function domainRouter({service,production=false,devFallback=false,fetcher=fetch}){
 return async hostname=>{
  if(!service||!hostname||hostname.length>253||!/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(hostname))return null
  if(await service.certificateAllowed(hostname))return production?'hubpages-prod:8080':'hubpages-dev:8080'
  if(production&&devFallback){try{const r=await fetcher('http://hubpages-dev:8080/api/domains/route?domain='+encodeURIComponent(hostname),{signal:AbortSignal.timeout(2000),redirect:'error'});if(r.status===200&&r.headers.get('X-HubPages-Upstream')==='hubpages-dev:8080')return 'hubpages-dev:8080'}catch{/* Fail closed if DEV is unavailable; production domains do not depend on DEV. */}}
  return null
 }
}
