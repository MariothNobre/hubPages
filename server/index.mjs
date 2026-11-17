import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const port = Number(process.env.PORT ?? 8080)
const staticDir = resolve(process.env.STATIC_DIR ?? '/app/public')
const dataFile = resolve(process.env.DATA_FILE ?? '/data/content.json')
const allowedOrigins = new Set((process.env.APP_ORIGINS ?? process.env.APP_ORIGIN ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean))
const adminEmail = (process.env.HUBPAGES_ADMIN_EMAIL ?? '').trim().toLowerCase()
const bootstrapTokenHash = process.env.HUBPAGES_BOOTSTRAP_TOKEN_HASH ?? ''
const sessionSecret = process.env.HUBPAGES_SESSION_SECRET ?? ''
const sessionCookie = 'hubpages_admin'
const sessionDurationSeconds = 60 * 60 * 8
const maxBodyBytes = 64 * 1024
const loginAttempts = new Map()

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
  response.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https:")
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders })
  response.end(JSON.stringify(payload))
}

async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBodyBytes) throw new Error('PAYLOAD_TOO_LARGE')
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
  const signature = createHmac('sha256', sessionSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function hasValidSession(request) {
  if (!sessionSecret) return false
  const token = parseCookies(request)[sessionCookie]
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const payload = `${parts[0]}.${parts[1]}`
  const expected = createHmac('sha256', sessionSecret).update(payload).digest()
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

async function loadStore() {
  try { return JSON.parse(await readFile(dataFile, 'utf8')) }
  catch (error) { if (error?.code === 'ENOENT') return { pages: {} }; throw error }
}

async function saveStore(store) {
  await mkdir(resolve(dataFile, '..'), { recursive: true })
  const temporaryFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporaryFile, `${JSON.stringify(store, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  await rename(temporaryFile, dataFile)
}

function validateSalesContent(value) {
  if (!value || typeof value !== 'object') throw new Error('Conteúdo inválido.')
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
  return { ...value, ...Object.fromEntries(fields.map((field) => [field, value[field].trim()])) }
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/health.json') return sendJson(response, 200, { status: 'ok', service: 'hubpages' })
  if (request.method === 'GET' && url.pathname === '/api/admin/session') return sendJson(response, 200, { authenticated: hasValidSession(request) })
  if (request.method === 'GET' && url.pathname === '/api/admin/setup-status') {
    const store = await loadStore()
    return sendJson(response, 200, { needsSetup: !store.admin?.passwordHash })
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
    const validEmail = typeof body.email === 'string' && body.email.trim().toLowerCase() === adminEmail
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
    const store = await loadStore()
    const page = store.pages?.[publicPage[1]]
    return page ? sendJson(response, 200, page) : sendJson(response, 404, { message: 'Conteúdo ainda não publicado.' })
  }

  const adminPage = url.pathname.match(/^\/api\/admin\/pages\/([a-z0-9_]+)$/)
  if (request.method === 'PUT' && adminPage) {
    if (!hasAllowedOrigin(request)) return sendJson(response, 403, { message: 'Origem não autorizada.' })
    if (!hasValidSession(request)) return sendJson(response, 401, { message: 'Sessão expirada. Entre novamente.' })
    const content = validateSalesContent(await readJsonBody(request))
    const store = await loadStore()
    store.pages ??= {}
    store.pages[adminPage[1]] = content
    await saveStore(store)
    return sendJson(response, 200, content)
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

createServer(async (request, response) => {
  securityHeaders(response)
  try {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
    if (url.pathname === '/health.json' || url.pathname.startsWith('/api/')) return await handleApi(request, response, url)
    return await serveStatic(response, decodeURIComponent(url.pathname))
  } catch (error) {
    console.error(error)
    return sendJson(response, error?.message === 'PAYLOAD_TOO_LARGE' ? 413 : 500, { message: 'Não foi possível concluir a solicitação.' })
  }
}).listen(port, '0.0.0.0', () => console.log(`HubPages ativo na porta ${port}.`))
