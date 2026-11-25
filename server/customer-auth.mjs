import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto'
export const customerCookie = 'hubpages_customer'
export const termsVersion = process.env.HUBPAGES_ENV==='production'?'plataforma-2026-11-21':process.env.HUBPAGES_SAAS_ADMIN_ENABLED==='true'?'gold-sandbox-2026-11-25':'homologacao-2026-11-19'
const duration = 8 * 60 * 60
const digest = (token) => createHash('sha256').update(token).digest('hex')
const error = (status, message) => Object.assign(new Error(message), { status })
const safeUser = (user) => ({ id: user.id, accountId: user.accountId, name: user.name, email: user.email, role: 'customer', emailVerified: false })
function validPassword(password) { return typeof password === 'string' && password.length >= 12 && password.length <= 200 }
function hash(password) { const salt = randomBytes(16); return `scrypt$${salt.toString('base64url')}$${scryptSync(password, salt, 64).toString('base64url')}` }
function verify(password, encoded) {
  if (typeof password !== 'string' || password.length > 200) return false
  const [algorithm, salt, value] = encoded?.split('$') ?? []
  if (algorithm !== 'scrypt' || !salt || !value) return false
  const expected = Buffer.from(value, 'base64url')
  const actual = scryptSync(password, Buffer.from(salt, 'base64url'), 64)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
function profile(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw error(422, 'Informe nome e e-mail válidos.')
  return { name, email }
}
export function customerAuth(store) {
  const resolve = (token) => typeof token === 'string' && /^[a-zA-Z0-9_-]{43}$/.test(token) ? store.session(digest(token)) : Promise.resolve(undefined)
  async function issue(user) {
    const token = randomBytes(32).toString('base64url')
    await store.addSession(digest(token), user.id, Date.now() + duration * 1000)
    return { user: safeUser(user), cookie: `${customerCookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${duration}` }
  }
  return {
    resolve,
    async register(input, reservedEmail) {
      const value = profile(input)
      if (!validPassword(input.password)) throw error(422, 'A senha deve ter entre 12 e 200 caracteres.')
      if (input.acceptTerms !== true || input.termsVersion !== termsVersion) throw error(422, 'Leia e aceite as condições atuais de uso.')
      if (value.email === reservedEmail || await store.findEmail(value.email)) throw error(409, 'Não foi possível cadastrar este e-mail. Use o acesso existente ou outro endereço.')
      const user = await store.create({ ...value, passwordHash: hash(input.password), termsVersion, termsAcceptedAt: new Date().toISOString() })
      return issue(user)
    },
    async login(input) {
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
      const user = await store.findEmail(email)
      // Compute a dummy scrypt on missing users to avoid a fast email-existence signal.
      const ok = user ? verify(input.password, user.passwordHash) : (hash('dummy-auth-computation'), false)
      if (!ok) throw error(401, 'E-mail ou senha inválidos.')
      return issue(user)
    },
    async logout(token) { if (token) await store.revoke(digest(token)); return `${customerCookie}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` },
    async readProfile(token) { const user = await resolve(token); if (!user) throw error(401, 'Entre novamente.'); return safeUser(user) },
    async updateProfile(token, input, reservedEmail) {
      const user = await resolve(token)
      if (!user) throw error(401, 'Entre novamente.')
      if (!verify(input.currentPassword, user.passwordHash)) throw error(403, 'Senha atual incorreta.')
      const value = profile(input)
      if (value.email === reservedEmail) throw error(409, 'Este e-mail não está disponível.')
      if (input.newPassword && !validPassword(input.newPassword)) throw error(422, 'A nova senha deve ter entre 12 e 200 caracteres.')
      await store.update(user.id, { ...value, ...(input.newPassword ? { passwordHash: hash(input.newPassword) } : {}) })
      return { user: { ...safeUser(user), ...value }, requiresLogin: Boolean(input.newPassword) }
    },
  }
}
