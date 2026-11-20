import assert from 'node:assert/strict'
import { suggestStudioAddress } from '../server/studio-address.mjs'
import { PlatformError } from '../server/platform-error.mjs'
const origin='https://dev.hubpages.com.br'
assert.equal((await suggestStudioAddress('Infância Além das Telas!',origin,async()=>{})).slug,'infancia_alem_das_telas_2')
assert.equal((await suggestStudioAddress('Outro site meu',origin,async()=>{})).slug,'outro_site_meu')
const checked=[]
const result=await suggestStudioAddress('Coleção família',origin,async url=>{checked.push(url);if(url.endsWith('/colecao_familia'))throw new PlatformError(409,'Ocupado.')})
assert.equal(result.slug,'colecao_familia_2');assert.equal(result.url,origin+'/colecao_familia_2');assert.equal(checked.length,2)
assert.equal((await suggestStudioAddress('🎉',origin,async()=>{})).slug,'minha_pagina')
await assert.rejects(suggestStudioAddress('Página',origin,async()=>{throw new Error('Banco indisponível')}),/Banco indisponível/)
console.log('PASS: name-based slugs, accent normalization, reserved paths, collision suffixes and real errors preserved')
