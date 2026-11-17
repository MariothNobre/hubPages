import { randomBytes, scryptSync } from 'node:crypto'
import { readFileSync } from 'node:fs'

const password = readFileSync(0, 'utf8').trimEnd()
if (password.length < 12) {
  console.error('A senha deve ter pelo menos 12 caracteres.')
  process.exit(1)
}
const salt = randomBytes(16)
const digest = scryptSync(password, salt, 64)
process.stdout.write(`scrypt$${salt.toString('base64url')}$${digest.toString('base64url')}\n`)
