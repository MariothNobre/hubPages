import { randomUUID } from 'node:crypto'
import { PlatformError } from './platform-error.mjs'
import { normalizeStudioAddress } from './studio-address.mjs'
export { PlatformError } from './platform-error.mjs'

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
function image(value) {
  const url = text(value, 2000)
  if (/^\/assets\/[a-zA-Z0-9_./-]+\.(webp|png|jpe?g)$/.test(url) && !url.includes('..')) return url
  if (/^\/api\/platform\/pages\/[a-f0-9-]{36}\/images\/(hero|[a-f0-9-]{36})$/.test(url)) return url
  return https(url)
}
function number(value, min, max, fallback) {
  if (value === undefined) return fallback
  if (!Number.isFinite(value) || value < min || value > max) fail('Dimensão ou espaçamento inválido.')
  return Math.round(value)
}
function style(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Layout inválido.')
  return { width: number(value.width, 20, 100, 100), imageWidth: number(value.imageWidth, 10, 100, 100), padding: number(value.padding, 0, 120, 32), margin: number(value.margin, 0, 120, 16), gap: number(value.gap, 0, 80, 24), fontSize: number(value.fontSize, 14, 64, 18), headingSize: number(value.headingSize,20,80,36), buttonWidth: number(value.buttonWidth,20,100,100), buttonPadding: number(value.buttonPadding,8,40,16), columns: number(value.columns, 1, 3, 1), font: ['serif','rounded'].includes(value.font) ? value.font : 'system', align: ['left','center','right'].includes(value.align) ? value.align : 'left', animation: ['fade','rise'].includes(value.animation) ? value.animation : 'none', background: /^#[a-f0-9]{6}$/i.test(value.background ?? '') ? value.background : '#ffffff', imageFit: value.imageFit === 'cover' ? 'cover' : 'contain', imageHeight: number(value.imageHeight, 80, 800, 360) }
}
function overrides(value=[]) {
  if(!Array.isArray(value)||value.length>24||value.some(key=>!['color','width','imageWidth','imageHeight','imageFit','padding','margin','gap','fontSize','headingSize','buttonWidth','buttonPadding','font','columns','align','animation','background'].includes(key)))fail('Ajustes de layout inválidos.')
  return [...new Set(value)]
}
export function validateDraft(input) {
  if (!input || typeof input !== 'object') fail('Rascunho inválido.')
  const step = Number(input.step === 3 ? 2 : input.step ?? 1)
  if (!Number.isInteger(step) || step < 1 || step > 8) fail('Etapa inválida.')
  const blocks = input.blocks ?? []
  if (!Array.isArray(blocks) || blocks.length > 40) fail('Limite de 40 blocos por rascunho.')
  if(blocks.some(b=>b?.sourceRole&&!['pain','solution','method','manual','possibilities','offer','author','final'].includes(b.sourceRole)))fail('Origem do bloco duplicado inválida.')
  const color = text(input.color, 7, '#15534f')
  if (!/^#[a-f0-9]{6}$/i.test(color)) fail('Cor inválida.')
  const metaPixelId = text(input.metaPixelId, 30)
  const ga4Id = text(input.ga4Id, 30)
  const metaPixelEnabled=input.metaPixelEnabled===true
  if (metaPixelId && !/^\d{5,30}$/.test(metaPixelId)) fail('ID do Meta Pixel inválido.')
  if (ga4Id && !/^G-[A-Z0-9]+$/.test(ga4Id)) fail('Measurement ID GA4 inválido.')
  if(metaPixelEnabled&&!metaPixelId)fail('Informe o ID do Meta Pixel antes de ativar.')
  const templateTexts=input.templateTexts ?? {}
  if(!templateTexts || typeof templateTexts!=='object' || Array.isArray(templateTexts) || Object.keys(templateTexts).length>160) fail('Textos do modelo inválidos.')
  const buttons=input.templateButtons ?? {}
  if(!buttons || typeof buttons!=='object' || Array.isArray(buttons) || Object.keys(buttons).length>100||Object.keys(buttons).some(key=>!/^[a-zA-Z][a-zA-Z0-9:_-]{0,79}$/.test(key))) fail('Botões do modelo inválidos.')
  const counts=input.sectionCounts??{}
  if(!counts||typeof counts!=='object'||Array.isArray(counts)||Object.entries(counts).some(([key,n])=>!['method','manual','bonus','sample'].includes(key)||!Number.isInteger(n)||n<0||n>20))fail('Quantidade de cards inválida (0 a 20).')
  if(input.offerGallery!==undefined&&(!Array.isArray(input.offerGallery)||input.offerGallery.length>6||new Set(input.offerGallery.map(m=>m?.id)).size!==input.offerGallery.length||input.offerGallery.some(m=>!m||!/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|hero)$/.test(m.id))))fail('A galeria aceita até 6 mídias, sem espaços duplicados.')
  return {
    ...(input.offerGallery===undefined?{}:{offerGallery:input.offerGallery.map(m=>({id:m.id,imageUrl:image(m.imageUrl),mediaType:m.mediaType==='video'?'video':'image',title:text(m.title,240)}))}),
    sectionCounts:{...counts},sampleEnabled:input.sampleEnabled!==false,mediaType:input.mediaType==='video'?'video':'image',
    name: text(input.name, 120, 'Minha página') || 'Minha página',
    title: text(input.title, 240), description: text(input.description, 3000),
    ctaLabel: text(input.ctaLabel, 100, 'Quero saber mais'),
    checkoutUrl: /^#[a-zA-Z][a-zA-Z0-9_-]*$/.test(input.checkoutUrl||'')?text(input.checkoutUrl,2000):https(text(input.checkoutUrl, 2000)), publicUrl: /^http:\/\/localhost:\d+\//.test(input.publicUrl||'') ? text(input.publicUrl,500) : https(text(input.publicUrl, 500)),
    visitedSteps:Array.isArray(input.visitedSteps)?[...new Set(input.visitedSteps.filter(id=>[1,2,4,5,6,7,8].includes(id)))].slice(0,7):[],
    addressAuto: input.addressAuto===true, reviewedSignature:text(input.reviewedSignature,20),
    imageUrl: image(input.imageUrl), metaPixelId, metaPixelEnabled, ga4Id, color, step,
    redLine: text(input.redLine, 300), eyebrow: text(input.eyebrow, 300), priceLabel: text(input.priceLabel, 80), originalPrice: text(input.originalPrice, 80), style: style(input.style),
    locale: input.locale === 'es' ? 'es' : 'pt-BR',
    template: ['colecao', 'infancia_pt','infancia_es'].includes(input.template) ? input.template : 'essencial',
    layoutCustomized: input.layoutCustomized===true,
    layoutOverrides: overrides(input.layoutOverrides),
    templateTexts:Object.fromEntries(Object.entries(templateTexts).map(([key,value])=>{if(typeof value!=='string'||value.length>5000)fail('Texto do modelo inválido.');return[text(key,80),value]})),
    templateButtons:Object.fromEntries(Object.entries(buttons).map(([key,value])=>[key,{enabled:value?.enabled!==false,label:text(value?.label,100),url:https(text(value?.url,2000)),inheritLink:value?.inheritLink!==false}])),
    blocks: blocks.map((block) => ({ ...(block?.sourceRole?{sourceRole:text(block.sourceRole,80),textOverrides:Object.fromEntries(Object.entries(block.textOverrides||{}).slice(0,160).map(([k,v])=>[text(k,80),text(v,5000)])),sectionCounts:Object.fromEntries(Object.entries(block.sectionCounts||{}).filter(([k,n])=>['method','manual','bonus','sample'].includes(k)&&Number.isInteger(n)&&n>=0&&n<=20))}:{}), enabled:block?.enabled!==false,mediaType:block?.mediaType==='video'?'video':'image',sampleSource:block?.sampleSource===undefined?undefined:text(block.sampleSource,240),sampleKicker:block?.sampleKicker===undefined?undefined:text(block.sampleKicker,240),id: /^[a-f0-9-]{36}$/.test(block?.id ?? '') ? block.id : randomUUID(), title: text(block?.title, 240), body: text(block?.body, 5000), imageUrl: image(block?.imageUrl), kind: ['bonus','sample','faq','author','offer','button','divider','spacer'].includes(block?.kind) ? block.kind : 'content', buttonLabel: text(block?.buttonLabel, 100), buttonUrl: https(text(block?.buttonUrl, 2000)), showButton: block?.showButton ?? !['sample','faq','author','divider','spacer'].includes(block?.kind), inheritLink:block?.inheritLink!==false, templateRole:text(block?.templateRole,80), layoutCustomized:block?.layoutCustomized===true, layoutOverrides:overrides(block?.layoutOverrides), style: style(block?.style) })),
  }
}
function owned(state, ownerId, id, includeTrashed = false) {
  const page = state.platform?.pages?.[id]
  if (!page || page.ownerId !== ownerId || page.trashedAt && !includeTrashed) throw new PlatformError(404, 'Página não encontrada.')
  return page
}
function audit(state, ownerId, action, pageId) {
  state.platform.audit.push({ id: randomUUID(), at: new Date().toISOString(), actorId: ownerId, action, pageId })
}
export function listDrafts(state, ownerId, trashed = false) {
  return Object.values(state.platform?.pages ?? {}).filter((p) => p.ownerId === ownerId && Boolean(p.trashedAt) === trashed).map(({ draft, revisions, ...page }) => ({ ...page, name: draft.name, title: draft.title, step: draft.step, revisions: revisions.length }))
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
function lifecycle(page, ownerId, revision, reason) {
  if(revision!==page.revision)throw new PlatformError(409,'A página mudou. Atualize a lista e tente novamente.')
  page.revision+=1;page.updatedAt=new Date().toISOString()
  page.revisions.push({version:page.revision,at:page.updatedAt,actorId:ownerId,draft:structuredClone(page.draft),reason})
}
export function trashDraft(state,ownerId,id,revision,restore=false) {
  const page=owned(state,ownerId,id,restore)
  if(restore&&!page.trashedAt)throw new PlatformError(409,'A página não está na lixeira.')
  if(page.financialStatus!=='unpaid')throw new PlatformError(409,'Esta página possui uma vigência financeira. Gerencie a publicação antes de excluí-la.')
  lifecycle(page,ownerId,revision,restore?'untrash':'trash')
  if(restore)delete page.trashedAt;else page.trashedAt=page.updatedAt
  page.editorialStatus='draft'
  audit(state,ownerId,restore?'page.untrash':'page.trash',id)
  return structuredClone(page)
}
export function unpublishDraft(state,ownerId,id,revision) {
  const page=owned(state,ownerId,id)
  lifecycle(page,ownerId,revision,'unpublish')
  page.editorialStatus='draft';audit(state,ownerId,'page.unpublish',id)
  return structuredClone(page)
}
export function publishDraft(state,ownerId,id,revision,origin) {
  const page=owned(state,ownerId,id)
  if(page.financialStatus!=='unpaid')throw new PlatformError(409,'Esta página possui vigência financeira e não pode usar a liberação gratuita de homologação.')
  if(page.origin!=='native')throw new PlatformError(409,'Páginas importadas exigem domínio próprio verificado. Esta liberação temporária atende somente modelos nativos.')
  const url=normalizeStudioAddress(page.draft.publicUrl,origin,!!page.legacySlug)
  if(!page.draft.title||!page.draft.checkoutUrl||(!page.legacySlug&&!page.draft.checkoutUrl.startsWith('https://')))throw new PlatformError(422,'Preencha o título e o link de checkout antes de publicar.')
  lifecycle(page,ownerId,revision,'publish')
  const publication={id:randomUUID(),pageId:id,ownerId,revision:page.revision,publishedAt:page.updatedAt,url,mode:origin==='https://hubpages.com.br'?'temporary-free':'dev-free',draft:structuredClone(page.draft)}
  const image=(value)=>value.startsWith(`/api/platform/pages/${id}/images/`)?value.replace(`/api/platform/pages/${id}/images/`,`/api/public/publications/${publication.id}/images/`):value
  publication.draft.imageUrl=image(publication.draft.imageUrl)
  publication.draft.blocks.forEach(block=>{block.imageUrl=image(block.imageUrl)});publication.draft.offerGallery?.forEach(m=>{m.imageUrl=image(m.imageUrl)})
  state.platform.publications??={};state.platform.publications[publication.id]=publication
  const {draft:_draft,...metadata}=publication
  page.publication=metadata;page.editorialStatus='published'
  audit(state,ownerId,origin==='https://hubpages.com.br'?'page.publish.temporary-free':'page.publish.dev-free',id)
  return structuredClone(page)
}
