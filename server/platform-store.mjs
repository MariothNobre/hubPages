import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { isDeepStrictEqual } from 'node:util'
import { PlatformError, listDrafts, readDraft, createDraft, saveDraft, duplicateDraft, restoreDraft, trashDraft, publishDraft, unpublishDraft } from './platform.mjs'

const core = ['id', 'ownerId', 'origin', 'editorialStatus', 'financialStatus', 'createdAt', 'updatedAt', 'revision', 'draft', 'revisions']
const imagePrefix = (id) => `/api/platform/pages/${id}/images/`
function checkImages(page) {
  for (const [url,slot] of [[page.draft.imageUrl,'hero'], ...page.draft.blocks.map((b) => [b.imageUrl,b.id])]) {
    if (url.startsWith('/api/') && url !== imagePrefix(page.id)+slot) throw new PlatformError(422, 'Use a imagem deste espaço ou envie uma nova imagem.')
  }
}
function slots(page) { return [page.draft.imageUrl === imagePrefix(page.id)+'hero' ? 'hero' : '', ...page.draft.blocks.filter((b) => b.imageUrl === imagePrefix(page.id) + b.id).map((b) => b.id)] }
function checkSlot(page, slot) { if (slot !== 'hero' && !page.draft.blocks.some((b) => b.id === slot)) throw new PlatformError(404, 'Espaço de imagem não encontrado.') }
function copyImages(page, originalId) {
  const replace = (url) => url.replace(imagePrefix(originalId), imagePrefix(page.id))
  page.draft.imageUrl = replace(page.draft.imageUrl)
  page.draft.blocks.forEach((b) => { b.imageUrl = replace(b.imageUrl) })
  page.revisions[0].draft = structuredClone(page.draft)
}
function fromRow(row, revisions = []) {
  return { ...row.extra, id: row.id, ownerId: row.owner_id, origin: row.origin, editorialStatus: row.editorial_status, financialStatus: row.financial_status, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), revision: row.revision, draft: row.draft, revisions }
}
async function ensureOwner(client, ownerId) {
  await client.query('INSERT INTO hubpages_page_owners(id,account_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [ownerId, ownerId === 'legacy-owner' ? null : ownerId])
}
async function writePage(client, page, previousVersion = 0) {
  const extra = Object.fromEntries(Object.entries(page).filter(([key]) => !core.includes(key)))
  await client.query(`INSERT INTO hubpages_studio_pages(id,owner_id,origin,editorial_status,financial_status,created_at,updated_at,revision,draft,extra)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT(id) DO UPDATE SET updated_at=EXCLUDED.updated_at,revision=EXCLUDED.revision,draft=EXCLUDED.draft,extra=EXCLUDED.extra,editorial_status=EXCLUDED.editorial_status`, [page.id, page.ownerId, page.origin, page.editorialStatus, page.financialStatus, page.createdAt, page.updatedAt, page.revision, page.draft, extra])
  for (const revision of page.revisions.filter((r) => r.version > previousVersion)) {
    await client.query('INSERT INTO hubpages_studio_revisions(page_id,version,document) VALUES($1,$2,$3)', [page.id, revision.version, revision])
  }
}
async function writeAudit(client, events) {
  for (const event of events) await client.query('INSERT INTO hubpages_studio_audit(id,owner_id,page_id,document) VALUES($1,$2,$3,$4)', [event.id, event.actorId, event.pageId, event])
}
async function loadPage(client, ownerId, id) {
  // Validate UUID before binding a PostgreSQL UUID parameter, retaining the API's 404 contract.
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new PlatformError(404, 'Página não encontrada.')
  const result = await client.query('SELECT * FROM hubpages_studio_pages WHERE id=$1 AND owner_id=$2', [id, ownerId])
  if (!result.rowCount) throw new PlatformError(404, 'Página não encontrada.')
  const revisions = await client.query('SELECT document FROM hubpages_studio_revisions WHERE page_id=$1 ORDER BY version', [id])
  return fromRow(result.rows[0], revisions.rows.map((r) => r.document))
}

export async function createPlatformStore(connectionString, fallback) {
  if (!connectionString) return fileStore(fallback)
  const pool = new pg.Pool({ connectionString, max: 3, connectionTimeoutMillis: 5000 })
  const migration = await pool.connect()
  try {
    await migration.query('BEGIN')
    await migration.query('SELECT pg_advisory_xact_lock(702071, 1)')
    const applied = await migration.query('SELECT version FROM hubpages_schema_migrations WHERE version=2')
    if (!applied.rowCount) {
      await migration.query(await readFile(new URL('./migrations/002-platform-pages.sql', import.meta.url), 'utf8'))
      const source = (await migration.query('SELECT payload FROM hubpages_state WHERE id=1 FOR UPDATE')).rows[0].payload.platform
      for (const page of Object.values(source?.pages ?? {})) {
        await ensureOwner(migration, page.ownerId)
        await writePage(migration, page)
        const restored = await loadPage(migration, page.ownerId, page.id)
        // Round-trip all fields, including metadata and the complete revision chain.
        if (!isDeepStrictEqual(restored, page)) throw new Error('Studio migration round-trip mismatch; source preserved')
      }
      await writeAudit(migration, source?.audit ?? [])
      await migration.query('INSERT INTO hubpages_schema_migrations(version) VALUES(2)')
    }
    if(!(await migration.query('SELECT version FROM hubpages_schema_migrations WHERE version=3')).rowCount) await migration.query(await readFile(new URL('./migrations/003-dev-publications.sql',import.meta.url),'utf8'))
    await migration.query('COMMIT')
  } catch (error) { await migration.query('ROLLBACK'); throw error }
  finally { migration.release() }

  const execute = async (ownerId, id, action, input) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Database lock works across server processes and serializes quota checks and writes per account.
      await client.query('SELECT pg_advisory_xact_lock(702072, hashtext($1))', [ownerId])
      const original = id ? await loadPage(client, ownerId, id) : null
      if(original?.trashedAt&&action!=='untrash')throw new PlatformError(404,'Página não encontrada.')
      const previousVersion = original?.revision ?? 0
      const state = { platform: { schemaVersion: 1, pages: original ? { [id]: original } : {}, audit: [] } }
      if (action === 'read') { await client.query('COMMIT'); return readDraft(state, ownerId, id) }
      if(['trash','untrash','publish','unpublish'].includes(action)) {
        const page=action==='publish'?publishDraft(state,ownerId,id,input.revision,input.origin):action==='unpublish'?unpublishDraft(state,ownerId,id,input.revision):trashDraft(state,ownerId,id,input.revision,action==='untrash')
        const publication=action==='publish'?state.platform.publications[page.publication.id]:null
        if(publication) {
          const imageSlots=[...new Set(slots(page).filter(Boolean))]
          const active=(await client.query('SELECT count(*)::integer AS n,COALESCE(sum(octet_length(content)),0)::integer AS bytes FROM hubpages_studio_images WHERE page_id=$1 AND slot=ANY($2::text[])',[id,imageSlots])).rows[0]
          if(active.n!==imageSlots.length)throw new PlatformError(422,'Reenvie as imagens que não estão mais disponíveis antes de publicar.')
          const used=(await client.query('SELECT COALESCE(sum(octet_length(i.content)),0)::integer AS bytes FROM hubpages_studio_publication_images i JOIN hubpages_studio_publications p ON p.id=i.publication_id WHERE p.owner_id=$1',[ownerId])).rows[0].bytes
          if(used+active.bytes>100*1024*1024)throw new PlatformError(422,'Limite de 100 MB de versões publicadas por conta atingido. Contate o suporte.')
          await client.query('INSERT INTO hubpages_studio_publications(id,page_id,owner_id,revision,draft,published_at,public_url,mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[publication.id,id,ownerId,publication.revision,publication.draft,publication.publishedAt,publication.url,publication.mode])
          await client.query('INSERT INTO hubpages_studio_publication_images(publication_id,slot,mime,content) SELECT $1,slot,mime,content FROM hubpages_studio_images WHERE page_id=$2 AND slot=ANY($3::text[])',[publication.id,id,imageSlots])
        }
        await writePage(client,page,previousVersion)
        await writeAudit(client,state.platform.audit)
        await client.query('COMMIT');return page
      }
      if (action === 'getImage' || action === 'putImage') {
        checkSlot(original, input.slot)
        if (action === 'putImage') {
          const bytes = (await client.query('SELECT COALESCE(sum(octet_length(i.content)),0)::integer AS n FROM hubpages_studio_images i JOIN hubpages_studio_pages p ON p.id=i.page_id WHERE p.owner_id=$1 AND NOT(i.page_id=$2 AND i.slot=$3)', [ownerId, id, input.slot])).rows[0].n
          if (bytes + input.content.length > 20 * 1024 * 1024) throw new PlatformError(422, 'Limite de 20 MB de imagens ativas por conta atingido.')
          await client.query('INSERT INTO hubpages_studio_images(page_id,slot,mime,content) VALUES($1,$2,$3,$4) ON CONFLICT(page_id,slot) DO UPDATE SET mime=EXCLUDED.mime,content=EXCLUDED.content,updated_at=now()', [id, input.slot, input.mime, input.content])
          await writeAudit(client, [{ id: randomUUID(), actorId: ownerId, pageId: id, action: 'image.replace', at: new Date().toISOString(), slot: input.slot }])
        }
        const result = await client.query('SELECT mime,content FROM hubpages_studio_images WHERE page_id=$1 AND slot=$2', [id, input.slot])
        if (!result.rowCount) throw new PlatformError(404, 'Imagem não encontrada.')
        await client.query('COMMIT')
        return result.rows[0]
      }
      if (action === 'create' || action === 'duplicate') {
        const count = (await client.query('SELECT count(*)::integer AS n FROM hubpages_studio_pages WHERE owner_id=$1', [ownerId])).rows[0].n
        if (count >= 1000) throw new PlatformError(422, 'Limite de uso justo atingido. Contate o suporte.')
      }
      let page
      if (action === 'create') page = createDraft(state, ownerId, input)
      else if (action === 'save') page = saveDraft(state, ownerId, id, input)
      else if (action === 'duplicate') page = duplicateDraft(state, ownerId, id)
      else if (action === 'restore') page = restoreDraft(state, ownerId, id, input.version, input.revision)
      else throw new Error('Unknown platform operation')
      if (action === 'duplicate') copyImages(page, id)
      checkImages(page)
      await ensureOwner(client, ownerId)
      await writePage(client, page, page.id === original?.id ? previousVersion : 0)
      if (action === 'duplicate') {
        const used = (await client.query('SELECT COALESCE(sum(octet_length(i.content)),0)::integer AS n FROM hubpages_studio_images i JOIN hubpages_studio_pages p ON p.id=i.page_id WHERE p.owner_id=$1', [ownerId])).rows[0].n
        const copying = (await client.query('SELECT COALESCE(sum(octet_length(content)),0)::integer AS n FROM hubpages_studio_images WHERE page_id=$1',[id])).rows[0].n
        if (used+copying>20*1024*1024) throw new PlatformError(422,'Limite de 20 MB de imagens ativas por conta atingido.')
        await client.query('INSERT INTO hubpages_studio_images(page_id,slot,mime,content) SELECT $1,slot,mime,content FROM hubpages_studio_images WHERE page_id=$2', [page.id, id])
      }
      // Only active slots, no personal library or binary image history.
      await client.query('DELETE FROM hubpages_studio_images WHERE page_id=$1 AND NOT(slot=ANY($2::text[]))', [page.id, slots(page)])
      await writeAudit(client, state.platform.audit)
      await client.query('COMMIT')
      return page
    } catch (error) { await client.query('ROLLBACK'); throw error }
    finally { client.release() }
  }
  return {
    async list(ownerId,trashed=false) {
      const result = await pool.query(`SELECT p.*, (SELECT count(*)::integer FROM hubpages_studio_revisions r WHERE r.page_id=p.id) AS revision_count FROM hubpages_studio_pages p WHERE owner_id=$1 AND (COALESCE(extra->>'trashedAt','')<>'')=$2 ORDER BY created_at,id`, [ownerId,trashed])
      return result.rows.map((row) => {
        const { draft, revisions: _revisions, ...page } = fromRow(row)
        return { ...page, name: draft.name, title: draft.title, step: draft.step, revisions: row.revision_count }
      })
    },
    read: (ownerId, id) => execute(ownerId, id, 'read'),
    create: (ownerId, input) => execute(ownerId, null, 'create', input),
    save: (ownerId, id, input) => execute(ownerId, id, 'save', input),
    duplicate: (ownerId, id) => execute(ownerId, id, 'duplicate'),
    restore: (ownerId, id, input) => execute(ownerId, id, 'restore', input),
    trash:(ownerId,id,input)=>execute(ownerId,id,'trash',input),
    untrash:(ownerId,id,input)=>execute(ownerId,id,'untrash',input),
    publish:(ownerId,id,input)=>execute(ownerId,id,'publish',input),
    unpublish:(ownerId,id,input)=>execute(ownerId,id,'unpublish',input),
    async publicPage(id) {
      if(!/^[a-f0-9-]{36}$/.test(id))throw new PlatformError(404,'Página não encontrada.')
      const result=await pool.query("SELECT s.id,s.revision,s.draft,s.published_at,s.public_url FROM hubpages_studio_pages p JOIN hubpages_studio_publications s ON s.id::text=p.extra->'publication'->>'id' WHERE p.id=$1 AND p.editorial_status='published' AND COALESCE(p.extra->>'trashedAt','')=''",[id])
      const row=result.rows[0];if(!row)throw new PlatformError(404,'Página não encontrada.')
      return {id:row.id,revision:row.revision,draft:row.draft,publishedAt:row.published_at.toISOString(),url:row.public_url}
    },
    async publicImage(id,slot) {
      const result=await pool.query("SELECT i.mime,i.content FROM hubpages_studio_publication_images i JOIN hubpages_studio_publications s ON s.id=i.publication_id JOIN hubpages_studio_pages p ON p.id=s.page_id WHERE s.id=$1 AND i.slot=$2 AND p.editorial_status='published' AND COALESCE(p.extra->>'trashedAt','')=''",[id,slot])
      if(!result.rowCount)throw new PlatformError(404,'Imagem não encontrada.')
      return result.rows[0]
    },
    getImage: (ownerId, id, slot) => execute(ownerId, id, 'getImage', { slot }),
    putImage: (ownerId, id, slot, mime, content) => execute(ownerId, id, 'putImage', { slot, mime, content }),
    close: () => pool.end(),
  }
}

function fileStore({ read, write }) {
  let pending = Promise.resolve()
  const operation = (fn, persist = true) => {
    const task = pending.then(async () => { const state = await read(); const result = fn(state); if (persist) await write(state); return result })
    pending = task.catch(() => undefined)
    return task
  }
  const quota = (state, ownerId) => { if (listDrafts(state, ownerId).length+listDrafts(state,ownerId,true).length >= 1000) throw new PlatformError(422, 'Limite de uso justo atingido. Contate o suporte.') }
  return {
    list: (ownerId,trashed=false) => operation((s) => listDrafts(s, ownerId,trashed), false),
    read: (ownerId, id) => operation((s) => readDraft(s, ownerId, id), false),
    create: (ownerId, input) => operation((s) => { quota(s, ownerId); const p = createDraft(s, ownerId, input); checkImages(p); return p }),
    save: (ownerId, id, input) => operation((s) => { const p = saveDraft(s, ownerId, id, input); checkImages(p); for (const key of Object.keys(s.platform.images?.[id] ?? {})) if (!slots(p).includes(key)) delete s.platform.images[id][key]; return p }),
    duplicate: (ownerId, id) => operation((s) => { readDraft(s, ownerId, id); quota(s, ownerId); const p = duplicateDraft(s, ownerId, id); copyImages(p,id); s.platform.pages[p.id]=p; s.platform.images ??= {}; s.platform.images[p.id] = structuredClone(s.platform.images[id] ?? {}); return p }),
    restore: (ownerId, id, input) => operation((s) => restoreDraft(s, ownerId, id, input.version, input.revision)),
    trash:(ownerId,id,input)=>operation(s=>trashDraft(s,ownerId,id,input.revision)),
    untrash:(ownerId,id,input)=>operation(s=>trashDraft(s,ownerId,id,input.revision,true)),
    unpublish:(ownerId,id,input)=>operation(s=>unpublishDraft(s,ownerId,id,input.revision)),
    publish:(ownerId,id,input)=>operation(s=>{const page=publishDraft(s,ownerId,id,input.revision,input.origin),pub=s.platform.publications[page.publication.id];pub.images={};for(const slot of slots(page).filter(Boolean)){const img=s.platform.images?.[id]?.[slot];if(!img)throw new PlatformError(422,'Reenvie as imagens antes de publicar.');pub.images[slot]=structuredClone(img)}return page}),
    publicPage:(id)=>operation(s=>{const page=s.platform?.pages?.[id],pub=s.platform?.publications?.[page?.publication?.id];if(!pub||page.trashedAt||page.editorialStatus!=='published')throw new PlatformError(404,'Página não encontrada.');const {ownerId:_owner,images:_images,...result}=pub;return result},false),
    publicImage:(id,slot)=>operation(s=>{const pub=s.platform?.publications?.[id],page=s.platform?.pages?.[pub?.pageId],img=pub?.images?.[slot];if(!img||page?.trashedAt||page?.editorialStatus!=='published')throw new PlatformError(404,'Imagem não encontrada.');return{mime:img.mime,content:Buffer.from(img.content,'base64')}},false),
    getImage: (ownerId, id, slot) => operation((s) => { checkSlot(readDraft(s, ownerId, id),slot); const img = s.platform.images?.[id]?.[slot]; if (!img) throw new PlatformError(404, 'Imagem não encontrada.'); return { mime: img.mime, content: Buffer.from(img.content,'base64') } }, false),
    putImage: (ownerId, id, slot, mime, content) => operation((s) => { checkSlot(readDraft(s, ownerId, id),slot); s.platform.images ??= {}; s.platform.images[id] ??= {}; const used = Object.entries(s.platform.images).filter(([pageId]) => s.platform.pages[pageId]?.ownerId === ownerId).reduce((sum,[pageId,items]) => sum + Object.entries(items).reduce((n,[key,img]) => n+(pageId===id && key===slot ? 0 : Buffer.from(img.content,'base64').length),0),0); if (used+content.length>20*1024*1024) throw new PlatformError(422,'Limite de imagens ativas atingido.'); s.platform.images[id][slot]={mime,content:content.toString('base64')}; return {mime,content} }),
    close: async () => {},
  }
}
