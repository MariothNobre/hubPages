import { PlatformError } from './platform-error.mjs'
const reserved=new Set(['admin','api','assets','studio','conta','condicoes-homologacao','p','login','logout','infancia_alem_das_telas','infancia_alem_das_telas_es'])
export function normalizeStudioAddress(value,origin) {
  let url;try{url=new URL(value)}catch{throw new PlatformError(422,'Informe o link completo da página.')}
  if(url.origin!==origin||url.username||url.password||url.search||url.hash)throw new PlatformError(422,`Use um endereço em ${origin}, sem parâmetros. Domínios externos precisam ser verificados antes de publicar.`)
  const path=url.pathname.replace(/\/+$/,'')
  if(!/^\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*){0,4}$/.test(path)||path.length>200||reserved.has(path.split('/')[1]))throw new PlatformError(422,'Este caminho é reservado ou inválido. Use letras minúsculas, números, hífen e sublinhado.')
  return origin+path
}
export function legacyAddressConflict(state,url) {
  const path=new URL(url).pathname.replace(/\/$/,'')
  return Object.values(state.pages||{}).some(page=>page?.publicUrl&&new URL(page.publicUrl).pathname.replace(/\/$/,'')===path)
}
