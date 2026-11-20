import { randomUUID } from 'node:crypto'

export class PlatformError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
const fail = (message) => { throw new PlatformError(422, message) }
const text = (value, max, fallback = '') => {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || value.length > max) fail('Texto inválido ou acima do limite.')
  return value.trim()
}
function https(value) {
  if (!value) return ''
  let url
  try { url = new URL(value) } catch { fail('Informe uma URL HTTPS válida.') }
  if (url.protocol !== 'https:' || url.username || url.password) fail('Somente URLs HTTPS sem credenciais são permitidas.')
  return url.toString()
}
export function validateDraft(input) {
  if (!input || typeof input !== 'object') fail('Rascunho inválido.')
  const step = Number(input.step ?? 1)
  if (!Number.isInteger(step) || step < 1 || step > 8) fail('Etapa inválida.')
  const blocks = input.blocks ?? []
  if (!Array.isArray(blocks) || blocks.length > 40) fail('Limite de 40 blocos por rascunho.')
  const color = text(input.color, 7, '#15534f')
  if (!/^#[a-f0-9]{6}$/i.test(color)) fail('Cor inválida.')
  const metaPixelId = text(input.metaPixelId, 30)
  const ga4Id = text(input.ga4Id, 30)
  if (metaPixelId && !/^\d{5,30}$/.test(metaPixelId)) fail('ID do Meta Pixel inválido.')
  if (ga4Id && !/^G-[A-Z0-9]+$/.test(ga4Id)) fail('Measurement ID GA4 inválido.')
  return {
    name: text(input.name, 120, 'Minha página') || 'Minha página',
    title: text(input.title, 240), description: text(input.description, 3000),
    ctaLabel: text(input.ctaLabel, 100, 'Quero saber mais'),
    checkoutUrl: https(text(input.checkoutUrl, 2000)), publicUrl: https(text(input.publicUrl, 500)),
    imageUrl: https(text(input.imageUrl, 2000)), metaPixelId, ga4Id, color, step,
    locale: input.locale === 'es' ? 'es' : 'pt-BR',
    template: input.template === 'colecao' ? 'colecao' : 'essencial',
    blocks: blocks.map((block) => ({ title: text(block?.title, 240), body: text(block?.body, 5000), imageUrl: https(text(block?.imageUrl, 2000)) })),
  }
}
function owned(state, ownerId, id) {
  const page = state.platform?.pages?.[id]
  if (!page || page.ownerId !== ownerId) throw new PlatformError(404, 'Página não encontrada.')
  return page
}
function audit(state, ownerId, action, pageId) {
  state.platform.audit.push({ id: randomUUID(), at: new Date().toISOString(), actorId: ownerId, action, pageId })
}
export function listDrafts(state, ownerId) {
  return Object.values(state.platform?.pages ?? {}).filter((p) => p.ownerId === ownerId).map(({ draft, revisions, ...page }) => ({ ...page, name: draft.name, title: draft.title, step: draft.step, revisions: revisions.length }))
}
export function readDraft(state, ownerId, id) { return structuredClone(owned(state, ownerId, id)) }
export function createDraft(state, ownerId, input = {}) {
  const draft = validateDraft(input)
  state.platform ??= { schemaVersion: 1, pages: {}, audit: [] }
  const now = new Date().toISOString()
  const page = { id: randomUUID(), ownerId, origin: 'native', editorialStatus: 'draft', financialStatus: 'unpaid', createdAt: now, updatedAt: now, revision: 1, draft, revisions: [{ version: 1, at: now, actorId: ownerId, draft: structuredClone(draft), reason: 'create' }] }
  state.platform.pages[page.id] = page
  audit(state, ownerId, 'page.create', page.id)
  return structuredClone(page)
}
export function saveDraft(state, ownerId, id, input) {
  const page = owned(state, ownerId, id)
  if (input.revision !== page.revision) throw new PlatformError(409, 'Existe uma versão mais recente. Recarregue a página antes de salvar.')
  const draft = validateDraft(input.draft)
  page.draft = draft; page.revision += 1; page.updatedAt = new Date().toISOString()
  page.revisions.push({ version: page.revision, at: page.updatedAt, actorId: ownerId, draft: structuredClone(draft), reason: 'edit' })
  audit(state, ownerId, 'page.save', id)
  return structuredClone(page)
}
export function restoreDraft(state, ownerId, id, version, revision) {
  const page = owned(state, ownerId, id)
  const previous = page.revisions.find((r) => r.version === version)
  if (!previous) throw new PlatformError(404, 'Versão não encontrada.')
  const result = saveDraft(state, ownerId, id, { revision, draft: previous.draft })
  audit(state, ownerId, 'page.restore', id)
  return result
}
export function duplicateDraft(state, ownerId, id) {
  const page = owned(state, ownerId, id)
  // Origin taint must survive duplication when authorized import is introduced.
  const copy = createDraft(state, ownerId, { ...page.draft, name: `${page.draft.name.slice(0,100)} — cópia`, publicUrl: '' })
  state.platform.pages[copy.id].origin = page.origin
  return readDraft(state, ownerId, copy.id)
}
