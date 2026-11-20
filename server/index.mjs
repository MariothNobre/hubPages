import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { createPostgresStore } from './postgres-store.mjs'
import { normalizePageUrl, resolvePageAddress } from './page-address.mjs'
import { PlatformError } from './platform.mjs'
import { createPlatformStore } from './platform-store.mjs'
import { templates, templateInput } from './templates.mjs'
import { createIdentityStore } from './identity-store.mjs'
import { customerAuth, customerCookie, termsVersion } from './customer-auth.mjs'

const port = Number(process.env.PORT ?? 8080)
const staticDir = resolve(process.env.STATIC_DIR ?? '/app/public')
const dataFile = resolve(process.env.DATA_FILE ?? '/data/content.json')
let postgresStore
if (process.env.DATABASE_URL) {
  let initialStore = { pages: {} }
  try { initialStore = JSON.parse(await readFile(dataFile, 'utf8')) }
  catch (error) { if (error?.code !== 'ENOENT') throw error }
  postgresStore = await createPostgresStore(process.env.DATABASE_URL, initialStore)
}
const allowedOrigins = new Set((process.env.APP_ORIGINS ?? process.env.APP_ORIGIN ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean))
const adminEmail = (process.env.HUBPAGES_ADMIN_EMAIL ?? '').trim().toLowerCase()
const bootstrapTokenHash = process.env.HUBPAGES_BOOTSTRAP_TOKEN_HASH ?? ''
const sessionSecret = process.env.HUBPAGES_SESSION_SECRET ?? ''
const customers = process.env.HUBPAGES_PLATFORM_ENABLED === 'true' ? customerAuth(await createIdentityStore(process.env.DATABASE_URL, `${dataFile}.identity.json`)) : null
const platformStore = customers ? await createPlatformStore(process.env.DATABASE_URL, { read: loadStore, write: saveStore }) : null
const sessionCookie = 'hubpages_admin'
let credentialRevision = (await loadStore()).admin?.passwordHash ?? ''
const sessionDurationSeconds = 60 * 60 * 8
const maxBodyBytes = 64 * 1024
const loginAttempts = new Map()
const onlineSessions = new Map()
const lastCountedVisits = new Map()
const salesPageSlugs = new Set(['infancia_alem_das_telas', 'infancia_alem_das_telas_es'])
const salesPageLabels = {
  infancia_alem_das_telas: 'Infância Além das Telas — Português',
  infancia_alem_das_telas_es: 'Infancia Más Allá de las Pantallas — Español',
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.webp': 'image/webp',
}

function securityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https://www.facebook.com; style-src 'self' 'unsafe-inline'; script-src 'self' https://connect.facebook.net; connect-src 'self' https://www.facebook.com https://connect.facebook.net; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https:")
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders })
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request, limit = maxBodyBytes) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw new Error('PAYLOAD_TOO_LARGE')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie ?? '').split(';').map((item) => item.trim()).filter(Boolean).map((item) => {
    const separator = item.indexOf('=')
    return separator === -1 ? [item, ''] : [item.slice(0, separator), decodeURIComponent(item.slice(separator + 1))]
  }))
}

function signSession(expiresAt) {
  const payload = `${expiresAt}.${randomBytes(18).toString('base64url')}`
  const signature = createHmac('sha256', sessionSecret + credentialRevision).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function hasValidSession(request) {
  if (!sessionSecret) return false
  const token = parseCookies(request)[sessionCookie]
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const payload = `${parts[0]}.${parts[1]}`
  const expected = createHmac('sha256', sessionSecret + credentialRevision).update(payload).digest()
  const received = Buffer.from(parts[2], 'base64url')
  return received.length === expected.length && timingSafeEqual(received, expected) && Number(parts[0]) > Math.floor(Date.now() / 1000)
}

function verifyEncodedSecret(secret, encodedHash) {
  const [algorithm, saltValue, digestValue] = encodedHash.split('$')
  if (algorithm !== 'scrypt' || !saltValue || !digestValue) return false
  const expected = Buffer.from(digestValue, 'base64url')
  const actual = scryptSync(secret, Buffer.from(saltValue, 'base64url'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function hashSecret(secret) {
  const salt = randomBytes(16)
  const digest = scryptSync(secret, salt, 64)
  return `scrypt$${salt.toString('base64url')}$${digest.toString('base64url')}`
}

function sessionResponse(response) {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds
  return sendJson(response, 200, { authenticated: true }, { 'Set-Cookie': `${sessionCookie}=${encodeURIComponent(signSession(expiresAt))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${sessionDurationSeconds}` })
}

function canAttemptLogin(ipAddress) {
  const now = Date.now()
  const current = loginAttempts.get(ipAddress)
  if (!current || current.resetAt <= now) {
    loginAttempts.set(ipAddress, { count: 1, resetAt: now + 15 * 60 * 1000 })
    return true
  }
  current.count += 1
  return current.count <= 8
}

function hasAllowedOrigin(request) {
  return allowedOrigins.has(request.headers.origin ?? '')
}

async function hasAllowedSalesOrigin(request) {
  if (hasAllowedOrigin(request)) return true
  const store = await loadStore()
  return [...salesPageSlugs].some((slug) => {
    const page = store.pages?.[slug]
    return page?.published !== false && page?.publicUrl && new URL(page.publicUrl).origin === request.headers.origin
  })
}

async function loadStore() {
  if (postgresStore) return postgresStore.read()
  try { return JSON.parse(await readFile(dataFile, 'utf8')) }
  catch (error) { if (error?.code === 'ENOENT') return { pages: {} }; throw error }
}

async function saveStore(store) {
  if (postgresStore) return postgresStore.write(store)
  await mkdir(resolve(dataFile, '..'), { recursive: true })
  const temporaryFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(store, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(temporaryFile, dataFile)
}

function validateSalesContent(value) {
  if (!value || typeof value !== 'object') throw new Error('Conteúdo inválido.')
  if (value.publicUrl) {
    value.publicUrl = normalizePageUrl(value.publicUrl)
    if (new URL(value.publicUrl).pathname === '/' && allowedOrigins.has(new URL(value.publicUrl).origin)) throw new Error('A raiz da HubPages é reservada ao site principal. Informe um caminho para a página de vendas.')
  }
  const fields = ['redLine', 'eyebrow', 'title', 'description', 'ctaLabel', 'ctaHref', 'status']
  for (const field of fields) {
    if (typeof value[field] !== 'string' || !value[field].trim()) throw new Error(`O campo ${field} é obrigatório.`)
    if (value[field].length > (field === 'description' ? 1600 : 240)) throw new Error(`O campo ${field} excede o limite permitido.`)
  }
  if (!value.ctaHref.startsWith('#')) {
    let ctaUrl
    try { ctaUrl = new URL(value.ctaHref) } catch { throw new Error('O link do botão deve ser uma URL HTTPS válida.') }
    if (ctaUrl.protocol !== 'https:') throw new Error('O link do botão deve usar HTTPS.')
    if (ctaUrl.hostname !== 'hotmart.com' && !ctaUrl.hostname.endsWith('.hotmart.com')) throw new Error('O link do botão deve direcionar para a Hotmart.')
  }
  if (!Array.isArray(value.sections) || value.sections.length > 12) throw new Error('A estrutura de seções é inválida.')
  const metaPixelEnabled = value.metaPixelEnabled === true
  const metaPixelId = typeof value.metaPixelId === 'string' ? value.metaPixelId.trim() : ''
  if (metaPixelId && !/^\d{5,30}$/.test(metaPixelId)) throw new Error('O ID do Meta Pixel deve conter somente números.')
  if (metaPixelEnabled && !metaPixelId) throw new Error('Informe o ID do Meta Pixel antes de ativar o rastreamento.')
  return { ...value, ...Object.fromEntries(fields.map((field) => [field, value[field].trim()])), metaPixelEnabled, metaPixelId }
}

function publicSalesContent(value) {
  const { metaConversionsApiToken, metaTestEventCode, clearMetaConversionsApiToken, ...publicValue } = value ?? {}
  return publicValue
}

function adminSalesContent(page, tracking) {
  return {
    ...publicSalesContent(page),
    metaConversionsApiConfigured: Boolean(tracking?.accessToken),
    metaTestEventCode: tracking?.testEventCode ?? '',
  }
}

async function sendMetaPageView(request, response, body) {
  if (!await hasAllowedSalesOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
  if (!body || typeof body.eventId !== 'string' || !/^[a-f0-9-]{20,64}$/i.test(body.eventId)) return sendJson(response, 422, { message: 'Evento inválido.' })

  let sourceUrl
  try { sourceUrl = new URL(body.eventSourceUrl) }
  catch { return sendJson(response, 422, { message: 'Origem do evento inválida.' }) }
  const pageSlug = typeof body.pageSlug === 'string' && salesPageSlugs.has(body.pageSlug) ? body.pageSlug : ''
  if (!pageSlug || sourceUrl.origin !== request.headers.origin) return sendJson(response, 422, { message: 'Origem do evento inválida.' })

  const store = await loadStore()
  const basePage = store.pages?.infancia_alem_das_telas
  const page = store.pages?.[pageSlug] ?? basePage
  if (page?.published === false || resolvePageAddress(store, sourceUrl, salesPageSlugs, process.env.HUBPAGES_ENV === 'development' ? 'https://dev.hubpages.com.br' : '') !== pageSlug) return sendJson(response, 403, { message: 'Página indisponível.' })
  const tracking = store.tracking?.[pageSlug]?.accessToken ? store.tracking[pageSlug] : store.tracking?.infancia_alem_das_telas
  if (!page?.metaPixelEnabled || !/^\d{5,30}$/.test(page.metaPixelId ?? '') || !tracking?.accessToken) return sendJson(response, 202, { accepted: false })

  const userData = { client_user_agent: request.headers['user-agent'] ?? '' }
  if (typeof body.fbp === 'string' && /^fb\.1\.\d+\.[A-Za-z0-9_-]+$/.test(body.fbp)) userData.fbp = body.fbp
  if (typeof body.fbc === 'string' && /^fb\.1\.\d+\.[A-Za-z0-9_-]+$/.test(body.fbc)) userData.fbc = body.fbc
  const payload = {
    data: [{
      event_name: 'PageView',
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.eventId,
      event_source_url: sourceUrl.toString(),
      action_source: 'website',
      user_data: userData,
    }],
  }
  if (tracking.testEventCode) payload.test_event_code = tracking.testEventCode

  const metaResponse = await fetch(`https://graph.facebook.com/v25.0/${page.metaPixelId}/events`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${tracking.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  })
  if (!metaResponse.ok) {
    console.error(`Meta Conversions API rejeitou o evento (${metaResponse.status}).`)
    return sendJson(response, 502, { message: 'A Meta não aceitou o evento.' })
  }
  return sendJson(response, 202, { accepted: true })
}

async function handleAnalyticsVisit(request, response, body) {
  if (!await hasAllowedSalesOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
  const pageSlug = typeof body?.pageSlug === 'string' && salesPageSlugs.has(body.pageSlug) ? body.pageSlug : ''
  const visitorId = typeof body?.visitorId === 'string' && /^[a-f0-9-]{20,64}$/i.test(body.visitorId) ? body.visitorId : ''
  if (!pageSlug || !visitorId) return sendJson(response, 422, { message: 'Métrica inválida.' })

  let sourcePath = ''
  try {
    sourcePath = new URL(request.headers.referer ?? '').pathname.replace(/\/$/, '')
  } catch {
    return sendJson(response, 403, { message: 'Origem da métrica não autorizada.' })
  }
  const metricStore = await loadStore()
  const metricPage = metricStore.pages?.[pageSlug]
  const metricUrl = new URL(request.headers.referer)
  if (metricPage?.published === false || sourcePath === '/admin' || metricUrl.origin !== request.headers.origin || resolvePageAddress(metricStore, metricUrl, salesPageSlugs, process.env.HUBPAGES_ENV === 'development' ? 'https://dev.hubpages.com.br' : '') !== pageSlug) return sendJson(response, 403, { message: 'Somente páginas de vendas publicadas podem registrar métricas.' })

  const now = Date.now()
  const pageSessions = onlineSessions.get(pageSlug) ?? new Map()
  pageSessions.set(visitorId, now)
  onlineSessions.set(pageSlug, pageSessions)

  const countKey = `${pageSlug}:${visitorId}`
  const shouldCount = body.isNewVisit === true && now - (lastCountedVisits.get(countKey) ?? 0) > 5000
  if (shouldCount) {
    const store = await loadStore()
    store.analytics ??= {}
    store.analytics[pageSlug] ??= { visits: 0 }
    store.analytics[pageSlug].visits += 1
    await saveStore(store)
    lastCountedVisits.set(countKey, now)
  }
  return sendJson(response, 202, { accepted: true })
}

function analyticsSnapshot(store) {
  const threshold = Date.now() - 45000
  return [...salesPageSlugs].map((slug) => {
    const sessions = onlineSessions.get(slug) ?? new Map()
    for (const [visitorId, lastSeen] of sessions) if (lastSeen < threshold) sessions.delete(visitorId)
    return { slug, label: salesPageLabels[slug], visits: store.analytics?.[slug]?.visits ?? 0, online: sessions.size }
  })
}

async function handleApi(request, response, url) {
  if (url.pathname.startsWith('/api/customer/')) {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
    if (!customers) return sendJson(response, 404, { message: 'Módulo indisponível neste ambiente.' })
    if (request.method !== 'GET' && !hasAllowedOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
    const token = parseCookies(request)[customerCookie]
    try {
      if (request.method === 'GET' && url.pathname === '/api/customer/config') return sendJson(response, 200, { termsVersion, registrationEnabled: process.env.HUBPAGES_CUSTOMER_SIGNUP_ENABLED === 'true', environment: 'development', emailDeliveryConfigured: false })
      if (request.method === 'GET' && url.pathname === '/api/customer/session') { const user = await customers.resolve(token); return sendJson(response, 200, { authenticated: Boolean(user), ...(user ? { user: await customers.readProfile(token) } : {}) }) }
      if (request.method === 'POST' && ['/api/customer/register', '/api/customer/login'].includes(url.pathname)) {
        const key = `${url.pathname}:${request.socket.remoteAddress}`
        if (!canAttemptLogin(key)) return sendJson(response, 429, { message: 'Muitas tentativas. Aguarde antes de tentar novamente.' })
        const body = await readJsonBody(request)
        if (url.pathname.endsWith('/register') && process.env.HUBPAGES_CUSTOMER_SIGNUP_ENABLED !== 'true') return sendJson(response, 403, { message: 'Cadastro ainda não liberado neste ambiente.' })
        const state = await loadStore()
        const result = url.pathname.endsWith('/register') ? await customers.register(body, state.admin?.email ?? adminEmail) : await customers.login(body)
        loginAttempts.delete(key)
        return sendJson(response, url.pathname.endsWith('/register') ? 201 : 200, { user: result.user }, { 'Set-Cookie': result.cookie })
      }
      if (request.method === 'POST' && url.pathname === '/api/customer/logout') return sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': await customers.logout(token) })
      if (request.method === 'GET' && url.pathname === '/api/customer/profile') return sendJson(response, 200, await customers.readProfile(token))
      if (request.method === 'PUT' && url.pathname === '/api/customer/profile') { const state = await loadStore(); return sendJson(response, 200, await customers.updateProfile(token, await readJsonBody(request), state.admin?.email ?? adminEmail)) }
      return sendJson(response, 404, { message: 'Recurso não encontrado.' })
    } catch (error) {
      if (error.code === '23505') return sendJson(response, 409, { message: 'Este e-mail não está disponível.' })
      if (error.status) return sendJson(response, error.status, { message: error.message })
      throw error
    }
  }
  if (url.pathname.startsWith('/api/platform/')) {
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
    if (process.env.HUBPAGES_PLATFORM_ENABLED !== 'true') return sendJson(response, 404, { message: 'Módulo indisponível neste ambiente.' })
    const customer = await customers?.resolve(parseCookies(request)[customerCookie])
    const isAdmin = !customer && hasValidSession(request)
    if (!customer && !isAdmin) return sendJson(response, 401, { message: 'Entre na sua conta para acessar o Studio privado.' })
    if (request.method !== 'GET' && !hasAllowedOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
    const state = await loadStore()
    // Compatibility account: no mutation of the legacy administrator identity.
    const ownerId = customer?.accountId ?? 'legacy-owner'
    try {
      if (url.pathname === '/api/platform/templates' && request.method === 'GET') return sendJson(response, 200, { templates })
      const imageMatch = url.pathname.match(/^\/api\/platform\/pages\/([a-f0-9-]{36})\/images\/(hero|[a-f0-9-]{36})$/)
      if (imageMatch) {
        const [, id, slot] = imageMatch
        if (request.method === 'PUT') {
          await platformStore.read(ownerId, id)
          const chunks = []; let size = 0
          for await (const chunk of request) { size += chunk.length; if (size > 2 * 1024 * 1024) return sendJson(response, 413, { message: 'Envie uma imagem de até 2 MB.' }); chunks.push(chunk) }
          const content = Buffer.concat(chunks)
          const mime = content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' : content.subarray(0,3).equals(Buffer.from([255,216,255])) ? 'image/jpeg' : content.toString('ascii',0,4)==='RIFF' && content.toString('ascii',8,12)==='WEBP' ? 'image/webp' : ''
          if (!mime) return sendJson(response, 422, { message: 'Formato inválido. Use PNG, JPEG ou WebP.' })
          await platformStore.putImage(ownerId,id,slot,mime,content)
          return sendJson(response,200,{ url: url.pathname })
        }
        if (request.method === 'GET') { const image = await platformStore.getImage(ownerId,id,slot); response.writeHead(200,{ 'Content-Type': image.mime, 'Cache-Control': 'private, no-store' }); return response.end(image.content) }
        return sendJson(response,405,{message:'Método não permitido.'})
      }
      if (url.pathname === '/api/platform/pages' && request.method === 'GET') return sendJson(response, 200, { pages: await platformStore.list(ownerId), billing: { provider: 'asaas', configured: false }, legacyPages: isAdmin ? [...salesPageSlugs].map((slug) => ({ slug, label: salesPageLabels[slug], published: state.pages?.[slug]?.published !== false })) : [], role: isAdmin ? 'admin' : 'customer' })
      if (url.pathname === '/api/platform/pages' && request.method === 'POST') {
        const page = await platformStore.create(ownerId, templateInput(await readJsonBody(request,256*1024)))
        return sendJson(response, 201, page)
      }
      const match = url.pathname.match(/^\/api\/platform\/pages\/([a-f0-9-]{36})(?:\/(duplicate|restore|publish))?$/)
      if (!match) return sendJson(response, 404, { message: 'Recurso não encontrado.' })
      const [, id, action] = match
      if (request.method === 'GET' && !action) return sendJson(response, 200, await platformStore.read(ownerId, id))
      let page
      if (request.method === 'PUT' && !action) page = await platformStore.save(ownerId, id, await readJsonBody(request,256*1024))
      else if (request.method === 'POST' && action === 'duplicate') page = await platformStore.duplicate(ownerId, id)
      else if (request.method === 'POST' && action === 'restore') page = await platformStore.restore(ownerId, id, await readJsonBody(request,256*1024))
      else if (request.method === 'POST' && action === 'publish') {
        await platformStore.read(ownerId, id)
        return sendJson(response, 409, { message: 'Publicação bloqueada: a integração Asaas e a confirmação de pagamento ainda não estão configuradas. Seu rascunho está preservado.' })
      } else return sendJson(response, 405, { message: 'Método não permitido.' })
      return sendJson(response, 200, page)
    } catch (error) {
      if (error instanceof PlatformError) return sendJson(response, error.status, { message: error.message })
      throw error
    }
  }
  if (request.method === 'GET' && url.pathname === '/api/resolve-page') {
    const store = await loadStore()
    const address = url.searchParams.get('url')
    let target
    try { target = new URL(address); target.search = ''; target.hash = '' } catch { return sendJson(response, 422, { message: 'Endereço inválido.' }) }
    const devOrigin = process.env.HUBPAGES_ENV === 'development' ? 'https://dev.hubpages.com.br' : ''
    const slug = resolvePageAddress(store, target, salesPageSlugs, devOrigin)
    if (!slug || store.pages?.[slug]?.published === false) return sendJson(response, 404, { message: 'Página indisponível.' })
    return sendJson(response, 200, { slug })
  }
  if (url.pathname === '/api/admin/profile') {
    if (!hasValidSession(request)) return sendJson(response, 401, { message: 'Entre novamente.' })
    const store = await loadStore()
    if (request.method === 'GET') return sendJson(response, 200, { name: store.admin?.name ?? '', email: store.admin?.email ?? adminEmail })
    if (request.method === 'PUT') {
      if (!hasAllowedOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
      const body = await readJsonBody(request)
      if (typeof body.currentPassword !== 'string' || !verifyEncodedSecret(body.currentPassword, store.admin.passwordHash)) return sendJson(response, 403, { message: 'Senha atual incorreta.' })
      if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254 || typeof body.name !== 'string' || body.name.length > 120) return sendJson(response, 422, { message: 'Nome ou e-mail inválido.' })
      if (body.newPassword && (typeof body.newPassword !== 'string' || body.newPassword.length < 12 || body.newPassword.length > 200)) return sendJson(response, 422, { message: 'A nova senha deve ter entre 12 e 200 caracteres.' })
      store.admin.name = body.name.trim()
      store.admin.email = body.email.trim().toLowerCase()
      if (body.newPassword) store.admin.passwordHash = hashSecret(body.newPassword)
      await saveStore(store)
      credentialRevision = store.admin.passwordHash
      return sendJson(response, 200, { name: store.admin.name, email: store.admin.email })
    }
  }
  if (request.method === 'GET' && url.pathname === '/health.json') return sendJson(response, 200, { status: 'ok', service: 'hubpages' })
  if (request.method === 'GET' && url.pathname === '/api/admin/session') return sendJson(response, 200, { authenticated: hasValidSession(request) })
  if (request.method === 'GET' && url.pathname === '/api/admin/setup-status') {
    const store = await loadStore()
    return sendJson(response, 200, { needsSetup: !store.admin?.passwordHash })
  }
  if (request.method === 'POST' && url.pathname === '/api/meta/events') return sendMetaPageView(request, response, await readJsonBody(request))
  if (request.method === 'POST' && url.pathname === '/api/analytics/visit') return handleAnalyticsVisit(request, response, await readJsonBody(request))
  if (request.method === 'GET' && url.pathname === '/api/admin/analytics') {
    if (!hasValidSession(request)) return sendJson(response, 401, { message: 'Sessão expirada. Entre novamente.' })
    const store = await loadStore()
    return sendJson(response, 200, { pages: analyticsSnapshot(store), measuredAt: new Date().toISOString() })
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/activate') {
    if (!hasAllowedOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
    if (!adminEmail || !bootstrapTokenHash || !sessionSecret) return sendJson(response, 503, { message: 'O primeiro acesso ainda não foi configurado.' })
    const ipAddress = request.socket.remoteAddress ?? 'unknown'
    if (!canAttemptLogin(ipAddress)) return sendJson(response, 429, { message: 'Muitas tentativas. Aguarde antes de tentar novamente.' })
    const body = await readJsonBody(request)
    const store = await loadStore()
    if (store.admin?.passwordHash) return sendJson(response, 409, { message: 'O primeiro acesso já foi concluído.' })
    if (typeof body.email !== 'string' || body.email.trim().toLowerCase() !== adminEmail) return sendJson(response, 401, { message: 'E-mail ou código de ativação inválido.' })
    if (typeof body.activationCode !== 'string' || !verifyEncodedSecret(body.activationCode, bootstrapTokenHash)) return sendJson(response, 401, { message: 'E-mail ou código de ativação inválido.' })
    if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 200) return sendJson(response, 422, { message: 'A senha deve ter entre 12 e 200 caracteres.' })
    store.admin = { email: adminEmail, passwordHash: hashSecret(body.password), activatedAt: new Date().toISOString() }
    await saveStore(store)
    credentialRevision = store.admin.passwordHash
    loginAttempts.delete(ipAddress)
    return sessionResponse(response)
  }

  if (request.method === 'POST' && url.pathname === '/api/admin/login') {
    if (!hasAllowedOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
    if (!adminEmail || !sessionSecret) return sendJson(response, 503, { message: 'A área administrativa ainda não foi configurada.' })
    const ipAddress = request.socket.remoteAddress ?? 'unknown'
    if (!canAttemptLogin(ipAddress)) return sendJson(response, 429, { message: 'Muitas tentativas. Aguarde antes de tentar novamente.' })
    const body = await readJsonBody(request)
    const store = await loadStore()
    if (!store.admin?.passwordHash) return sendJson(response, 409, { message: 'Conclua o primeiro acesso antes de entrar.' })
    const validEmail = typeof body.email === 'string' && body.email.trim().toLowerCase() === (store.admin.email ?? adminEmail)
    const validPassword = typeof body.password === 'string' && verifyEncodedSecret(body.password, store.admin.passwordHash)
    if (!validEmail || !validPassword) return sendJson(response, 401, { message: 'E-mail ou senha inválido.' })
    loginAttempts.delete(ipAddress)
    return sessionResponse(response)
  }

  if (request.method === 'DELETE' && url.pathname === '/api/admin/session') {
    if (!hasAllowedOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
    return sendJson(response, 200, { authenticated: false }, { 'Set-Cookie': `${sessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` })
  }

  const publicPage = url.pathname.match(/^\/api\/pages\/([a-z0-9_]+)$/)
  if (request.method === 'GET' && publicPage) {
    if (!salesPageSlugs.has(publicPage[1])) return sendJson(response, 404, { message: 'Página não encontrada.' })
    const store = await loadStore()
    const page = store.pages?.[publicPage[1]]
    return page && page.published !== false ? sendJson(response, 200, publicSalesContent(page)) : sendJson(response, 404, { message: 'Conteúdo ainda não publicado.' })
  }

  const adminPage = url.pathname.match(/^\/api\/admin\/pages\/([a-z0-9_]+)$/)
  if (request.method === 'GET' && adminPage) {
    if (!salesPageSlugs.has(adminPage[1])) return sendJson(response, 404, { message: 'Página não encontrada.' })
    if (!hasValidSession(request)) return sendJson(response, 401, { message: 'Sessão expirada. Entre novamente.' })
    const store = await loadStore()
    const page = store.pages?.[adminPage[1]]
    return page ? sendJson(response, 200, adminSalesContent(page, store.tracking?.[adminPage[1]])) : sendJson(response, 404, { message: 'Conteúdo ainda não publicado.' })
  }
  if (request.method === 'PUT' && adminPage) {
    if (!salesPageSlugs.has(adminPage[1])) return sendJson(response, 404, { message: 'Página não encontrada.' })
    if (!hasAllowedOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
    if (!hasValidSession(request)) return sendJson(response, 401, { message: 'Sessão expirada. Entre novamente.' })
    const body = await readJsonBody(request)
    let content
    try { content = validateSalesContent(body) }
    catch (error) { return sendJson(response, 422, { message: error.message }) }
    const newToken = typeof body.metaConversionsApiToken === 'string' ? body.metaConversionsApiToken.trim() : ''
    if (newToken.length > 512) return sendJson(response, 422, { message: 'O token da API de Conversões excede o limite permitido.' })
    const testEventCode = typeof body.metaTestEventCode === 'string' ? body.metaTestEventCode.trim() : ''
    if (testEventCode && !/^[A-Za-z0-9_-]{1,100}$/.test(testEventCode)) return sendJson(response, 422, { message: 'O código de evento de teste contém caracteres inválidos.' })
    const store = await loadStore()
    store.pages ??= {}
    if (content.publicUrl && Object.entries(store.pages).some(([key, page]) => key !== adminPage[1] && page.publicUrl === content.publicUrl)) return sendJson(response, 422, { message: 'Esse endereço já está sendo usado por outra página.' })
    store.tracking ??= {}
    store.pages[adminPage[1]] = publicSalesContent(content)
    const inheritedTracking = adminPage[1] === 'infancia_alem_das_telas_es' ? store.tracking.infancia_alem_das_telas : undefined
    const previousToken = store.tracking[adminPage[1]]?.accessToken ?? inheritedTracking?.accessToken ?? ''
    store.tracking[adminPage[1]] = {
      accessToken: body.clearMetaConversionsApiToken === true ? '' : (newToken || previousToken),
      testEventCode: testEventCode || inheritedTracking?.testEventCode || '',
    }
    await saveStore(store)
    return sendJson(response, 200, adminSalesContent(content, store.tracking[adminPage[1]]))
  }
  return sendJson(response, 404, { message: 'Rota não encontrada.' })
}

async function serveStatic(response, pathname) {
  const candidate = pathname === '/' ? '/index.html' : pathname
  const cleanPath = normalize(candidate).replace(/^(\.\.(\/|\\|$))+/, '')
  let filePath = resolve(join(staticDir, cleanPath))
  if (!filePath.startsWith(staticDir)) { response.writeHead(403); return response.end() }
  try { if (!(await stat(filePath)).isFile()) throw new Error('NOT_FILE') }
  catch { filePath = join(staticDir, 'index.html') }
  const fileStats = await stat(filePath)
  response.writeHead(200, {
    'Cache-Control': filePath.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    'Content-Length': fileStats.size,
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
  })
  createReadStream(filePath).pipe(response)
}

let apiQueue = Promise.resolve()
createServer(async (request, response) => {
  securityHeaders(response)
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    if (['/studio', '/conta', '/condicoes-homologacao'].includes(url.pathname) || url.pathname.startsWith('/studio/preview/')) {
      response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive')
      response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
    }
    if (url.pathname === '/health.json') return await handleApi(request, response, url)
    if (url.pathname.startsWith('/api/')) {
      const task = apiQueue.then(() => handleApi(request, response, url))
      apiQueue = task.catch(() => undefined)
      return await task
    }
    if (salesPageSlugs.has(url.pathname.replace(/^\/|\/$/g, ''))) {
      const store = await loadStore()
      if (store.pages?.[url.pathname.replace(/^\/|\/$/g, '')]?.published === false) return sendJson(response, 404, { message: 'Página indisponível.' })
    }
    return await serveStatic(response, decodeURIComponent(url.pathname))
  } catch (error) {
    console.error(error)
    return sendJson(response, error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : 500, { message: 'Não foi possível concluir a solicitação.' })
  }
}).listen(port, '0.0.0.0', () => console.log(`HubPages ativo na porta ${port}.`))
