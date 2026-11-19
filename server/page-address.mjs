export function normalizePageUrl(value) {
  const url = new URL(value.trim())
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port) throw new Error('Informe uma URL HTTPS completa, sem parâmetros ou fragmentos.')
  if (/^\/(admin|api|assets)(\/|$)/.test(url.pathname)) throw new Error('Esse caminho é reservado para o sistema.')
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString()
}

export function resolvePageAddress(store, target, slugs, devOrigin) {
  for (const key of slugs) {
    const configured = store.pages?.[key]?.publicUrl
    if (!configured) continue
    const address = new URL(configured)
    const samePath = address.pathname.replace(/\/+$/, '') === target.pathname.replace(/\/+$/, '')
    if (samePath && (address.origin === target.origin || (devOrigin && target.origin === devOrigin && target.pathname !== '/'))) return key
  }
  return [...slugs].find((key) => target.pathname.replace(/\/+$/, '') === `/${key}`)
}
