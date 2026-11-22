import assert from 'node:assert/strict'
import {domainRouter} from '../server/domain-router.mjs'
let calls=0
const service={certificateAllowed:async h=>h==='vendas.example.com'}
const fallback=async u=>{calls++;assert.equal(u,'http://hubpages-dev:8080/api/domains/route?domain=teste.example.com');return new Response('',{headers:{'X-HubPages-Upstream':'hubpages-dev:8080'}})}
const prod=domainRouter({service,production:true,devFallback:true,fetcher:fallback})
assert.equal(await prod('vendas.example.com'),'hubpages-prod:8080');assert.equal(calls,0,'production domain does not depend on DEV')
assert.equal(await prod('teste.example.com'),'hubpages-dev:8080')
assert.equal(await prod('evil:8080'),null);assert.equal(await prod(''),null);assert.equal(calls,1)
assert.equal(await domainRouter({service,production:true})('teste.example.com'),null,'fallback is explicitly enabled only in production deployment')
assert.equal(await domainRouter({service,production:true,devFallback:true,fetcher:async()=>{throw Error('offline')}})('teste.example.com'),null)
assert.equal(await domainRouter({service,production:true,devFallback:true,fetcher:async()=>new Response('',{headers:{'X-HubPages-Upstream':'evil:8080'}})})('teste.example.com'),null,'never accept arbitrary upstreams')
assert.equal(await domainRouter({service})('vendas.example.com'),'hubpages-dev:8080')
console.log('PASS: fixed internal domain routing, production priority, isolated DEV fallback and fail-closed behavior')
