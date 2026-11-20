import { PlatformError } from './platform-error.mjs'
const reserved=new Set(['perfil','admin','api','assets','studio','conta','condicoes-homologacao','p','login','logout','infancia_alem_das_telas','infancia_alem_das_telas_es'])
export function normalizeStudioAddress(value,origin,legacy=false) {
  let url;try{url=new URL(value)}catch{throw new PlatformError(422,'Informe o link completo da página.')}
  if(url.origin!==origin||url.username||url.password||url.search||url.hash)throw new PlatformError(422,`Use um endereço em ${origin}, sem parâmetros. Domínios externos precisam ser verificados antes de publicar.`)
  const path=url.pathname.replace(/\/+$/,'')
  if(!/^\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*){0,4}$/.test(path)||path.length>200||(reserved.has(path.split('/')[1])&&!(legacy&&['infancia_alem_das_telas','infancia_alem_das_telas_es'].includes(path.slice(1)))))throw new PlatformError(422,'Este caminho é reservado ou inválido. Use letras minúsculas, números, hífen e sublinhado.')
  return origin+path
}
export function legacyAddressConflict(state,url,exceptSlug) {
  const path=new URL(url).pathname.replace(/\/$/,'')
  return Object.entries(state.pages||{}).some(([slug,page])=>slug!==exceptSlug&&page?.publicUrl&&new URL(page.publicUrl).pathname.replace(/\/$/,'')===path)
}

export async function suggestStudioAddress(name,origin,check) {
  if(typeof name!=='string'||name.length>120)throw new PlatformError(422,'Nome da página inválido.')
  const base=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80).replace(/_+$/,'')||'minha_pagina'
  for(let n=1;n<=1000;n++) {
    const slug=n===1?base:`${base}_${n}`
    try {const url=normalizeStudioAddress(`${origin}/${slug}`,origin);await check(url);return {slug,url,available:true}}
    catch(error){if(!(error instanceof PlatformError)||![409,422].includes(error.status))throw error}
  }
  throw new PlatformError(409,'Escolha outro nome para encontrar um endereço disponível.')
}
