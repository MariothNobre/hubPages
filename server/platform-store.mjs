import { reviewSignature } from '../shared/studio-wizard.mjs'
import { pgWorkspace,fileWorkspace } from './workspace-store.mjs'
import { pendingChanges } from '../shared/studio-wizard.mjs'
import { readFile } from 'node:fs/promises'
import { randomUUID,createHash } from 'node:crypto'
import pg from 'pg'
import { isDeepStrictEqual } from 'node:util'
import { normalizeStudioAddress,legacyAddressConflict,suggestStudioAddress } from './studio-address.mjs'
import { trackingChange,trackingView,openToken } from './studio-tracking.mjs'
import { PlatformError, listDrafts, readDraft, createDraft, saveDraft, duplicateDraft, restoreDraft, trashDraft, publishDraft, unpublishDraft } from './platform.mjs'

const core = ['id', 'ownerId', 'origin', 'editorialStatus', 'financialStatus', 'createdAt', 'updatedAt', 'revision', 'draft', 'revisions']
const imagePrefix = (id) => `/api/platform/pages/${id}/images/`
function checkImages(page) {
  for (const [url,slot] of [[page.draft.imageUrl,'hero'], ...page.draft.blocks.map((b) => [b.imageUrl,b.id]),...(page.draft.offerGallery||[]).map(m=>[m.imageUrl,m.id])]) {
    if (url.startsWith('/api/') && url !== imagePrefix(page.id)+slot) throw new PlatformError(422, 'Use a imagem deste espaço ou envie uma nova imagem.')
  }
}
function slots(page) { return [page.draft.imageUrl === imagePrefix(page.id)+'hero' ? 'hero' : '', ...page.draft.blocks.filter((b) => b.imageUrl === imagePrefix(page.id) + b.id).map((b) => b.id),...(page.draft.offerGallery||[]).filter(m=>m.imageUrl===imagePrefix(page.id)+m.id).map(m=>m.id)] }
function checkSlot(page, slot) { if (slot !== 'hero' && !page.draft.blocks.some((b) => b.id === slot)&&!page.draft.offerGallery?.some(m=>m.id===slot)) throw new PlatformError(404, 'Espaço de imagem não encontrado.') }
function copyImages(page, originalId) {
  const replace = (url) => url.replace(imagePrefix(originalId), imagePrefix(page.id))
  page.draft.imageUrl = replace(page.draft.imageUrl)
  page.draft.blocks.forEach((b) => { b.imageUrl = replace(b.imageUrl) });page.draft.offerGallery?.forEach(m=>{m.imageUrl=replace(m.imageUrl)})
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
async function loadPage(client, ownerId, id, history=true) {
  // Validate UUID before binding a PostgreSQL UUID parameter, retaining the API's 404 contract.
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new PlatformError(404, 'Página não encontrada.')
  const result = await client.query('SELECT * FROM hubpages_studio_pages WHERE id=$1 AND owner_id=$2', [id, ownerId])
  if (!result.rowCount) throw new PlatformError(404, 'Página não encontrada.')
  const revisions = history?await client.query('SELECT document FROM hubpages_studio_revisions WHERE page_id=$1 ORDER BY version', [id]):{rows:[]}
  return fromRow(result.rows[0], revisions.rows.map((r) => r.document))
}

export async function createPlatformStore(connectionString, fallback) {
  if (!connectionString) return fileStore(fallback)
  const publicOrigin=fallback?.publicOrigin||'https://dev.hubpages.com.br'
  const checkAddress=async(client,id,value)=>{const own=(await client.query('SELECT slug FROM hubpages_studio_legacy WHERE page_id=$1',[id])).rows[0]?.slug;const url=normalizeStudioAddress(value,publicOrigin,!!own);if(legacyAddressConflict(await fallback?.read?.()||{pages:{}},url,own))throw new PlatformError(409,'Este endereço já está em uso.');const taken=await client.query('SELECT page_id FROM hubpages_studio_addresses WHERE public_url=$1 AND page_id<>$2',[url,id]);if(taken.rowCount)throw new PlatformError(409,'Este endereço já está em uso.');return url}
  const syncAddress=async(client,page)=>{const keep=[];if(!page.trashedAt){try{keep.push(normalizeStudioAddress(page.draft.publicUrl,publicOrigin))}catch{/* Existing drafts keep their content until an address is selected. */}if(page.editorialStatus==='published'&&page.publication?.url)keep.push(page.publication.url)}await client.query('DELETE FROM hubpages_studio_addresses WHERE page_id=$1 AND NOT(public_url=ANY($2::text[]))',[page.id,keep]);for(const url of keep)await client.query('INSERT INTO hubpages_studio_addresses(public_url,page_id,owner_id) VALUES($1,$2,$3) ON CONFLICT(public_url) DO NOTHING',[url,page.id,page.ownerId])}
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
    if(!(await migration.query('SELECT version FROM hubpages_schema_migrations WHERE version=4')).rowCount)await migration.query(await readFile(new URL('./migrations/004-studio-address-tracking.sql',import.meta.url),'utf8'))
    if(!(await migration.query('SELECT version FROM hubpages_schema_migrations WHERE version=5')).rowCount)await migration.query(await readFile(new URL('./migrations/005-studio-workspace.sql',import.meta.url),'utf8'))
    if(!(await migration.query('SELECT version FROM hubpages_schema_migrations WHERE version=6')).rowCount)await migration.query(await readFile(new URL('./migrations/006-traffic-pageviews.sql',import.meta.url),'utf8'))
    if(!(await migration.query('SELECT version FROM hubpages_schema_migrations WHERE version=7')).rowCount)await migration.query(await readFile(new URL('./migrations/007-current-media.sql',import.meta.url),'utf8'))
    if(!(await migration.query('SELECT version FROM hubpages_schema_migrations WHERE version=8')).rowCount)await migration.query(await readFile(new URL('./migrations/008-studio-guide-preference.sql',import.meta.url),'utf8'))
    await migration.query('COMMIT')
  } catch (error) { await migration.query('ROLLBACK'); throw error }
  finally { migration.release() }

  const execute = async (ownerId, id, action, input) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Database lock works across server processes and serializes quota checks and writes per account.
      await client.query('SELECT pg_advisory_xact_lock(702072, hashtext($1))', [ownerId])
      const original = id ? await loadPage(client, ownerId, id,action==='restore') : null
      const previousAddress=original?.draft.publicUrl
      if(original?.trashedAt&&action!=='untrash')throw new PlatformError(404,'Página não encontrada.')
      const previousVersion = original?.revision ?? 0
      if(['create','save','duplicate','publish','unpublish','trash','untrash'].includes(action))await client.query('SELECT pg_advisory_xact_lock(702073,1)')
      const state = { platform: { schemaVersion: 1, pages: original ? { [id]: original } : {}, audit: [] } }
      if(action==='review'){
        const pub=original.publication?(await client.query('SELECT draft,published_at FROM hubpages_studio_publications WHERE id=$1 AND page_id=$2 AND owner_id=$3',[original.publication.id,id,ownerId])).rows[0]:null
        const images=await client.query('SELECT i.slot,i.updated_at,(p.content IS DISTINCT FROM i.content) AS changed FROM hubpages_studio_images i LEFT JOIN hubpages_studio_publication_images p ON p.publication_id=$2 AND p.slot=i.slot WHERE i.page_id=$1 ORDER BY i.slot',[id,original.publication?.id||null])
        await client.query('COMMIT');return {publishedDraft:pub?.draft||null,publishedAt:pub?.published_at.toISOString()||null,changedImageSlots:images.rows.filter(row=>row.changed).map(row=>row.slot),assetVersion:images.rows.map(row=>row.slot+':'+row.updated_at.toISOString()).join('|')}
      }
      if(action==='suggestion'){
const result=await suggestStudioAddress(input.name,publicOrigin,url=>checkAddress(client,id,url));await client.query('COMMIT');return result}
      if(action==='availability'){const url=await checkAddress(client,id,input.url);await client.query('COMMIT');return {available:true,url}}
      if(action==='trackingRead'||action==='trackingSave'){let row=(await client.query('SELECT * FROM hubpages_studio_tracking WHERE page_id=$1 AND owner_id=$2',[id,ownerId])).rows[0];if(action==='trackingSave'){row=trackingChange(input,row,fallback?.credentialKey);await client.query('INSERT INTO hubpages_studio_tracking(page_id,owner_id,token_ciphertext,test_event_code) VALUES($1,$2,$3,$4) ON CONFLICT(page_id) DO UPDATE SET token_ciphertext=EXCLUDED.token_ciphertext,test_event_code=EXCLUDED.test_event_code',[id,ownerId,row.token_ciphertext,row.test_event_code])}await client.query('COMMIT');return trackingView(row)}
      if (action === 'read') { await client.query('COMMIT'); return readDraft(state, ownerId, id) }
      if(['trash','untrash','publish','unpublish'].includes(action)) {
        if(action==='publish'&&input.requireReview&&original.origin==='native'&&original.financialStatus==='unpaid'){const images=await client.query('SELECT slot,updated_at FROM hubpages_studio_images WHERE page_id=$1 ORDER BY slot',[id]);const version=images.rows.map(row=>row.slot+':'+row.updated_at.toISOString()).join('|');if(!(original.draft.visitedSteps||[]).includes(7)||original.draft.reviewedSignature!==reviewSignature(original.draft,version))throw new PlatformError(422,'A Revisão é necessária antes de publicar. Abra a etapa Revisão e marque a caixinha confirmando a conferência dos textos, imagens e links.')}
        if(action==='publish'&&original.origin==='native')await checkAddress(client,id,original.draft.publicUrl)
        const page=action==='publish'?publishDraft(state,ownerId,id,input.revision,input.origin):action==='unpublish'?unpublishDraft(state,ownerId,id,input.revision):trashDraft(state,ownerId,id,input.revision,action==='untrash')
        const publication=action==='publish'?state.platform.publications[page.publication.id]:null
        if(['publish','unpublish','trash'].includes(action)){await client.query("SELECT set_config('hubpages.media_prune_page',$1,true)",[id]);await client.query('DELETE FROM hubpages_studio_publication_images WHERE publication_id IN(SELECT id FROM hubpages_studio_publications WHERE page_id=$1)',[id])}
        if(publication) {
          const imageSlots=[...new Set(slots(page).filter(Boolean))]
          const active=(await client.query('SELECT count(*)::integer AS n,COALESCE(sum(octet_length(content)),0)::integer AS bytes FROM hubpages_studio_images WHERE page_id=$1 AND slot=ANY($2::text[])',[id,imageSlots])).rows[0]
          if(active.n!==imageSlots.length)throw new PlatformError(422,'Reenvie as imagens que não estão mais disponíveis antes de publicar.')
          const used=(await client.query('SELECT COALESCE(sum(octet_length(i.content)),0)::integer AS bytes FROM hubpages_studio_publication_images i JOIN hubpages_studio_publications p ON p.id=i.publication_id WHERE p.owner_id=$1',[ownerId])).rows[0].bytes
          if(used+active.bytes>100*1024*1024)throw new PlatformError(422,'Limite de 100 MB de mídias publicadas por conta atingido. Contate o suporte.')
          await client.query('INSERT INTO hubpages_studio_publications(id,page_id,owner_id,revision,draft,published_at,public_url,mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[publication.id,id,ownerId,publication.revision,publication.draft,publication.publishedAt,publication.url,publication.mode])
          await client.query('INSERT INTO hubpages_studio_publication_images(publication_id,slot,mime,content) SELECT $1,slot,mime,content FROM hubpages_studio_images WHERE page_id=$2 AND slot=ANY($3::text[])',[publication.id,id,imageSlots])
        }
        await writePage(client,page,previousVersion)
        if(action!=='untrash')await syncAddress(client,page)
        await writeAudit(client,state.platform.audit)
        await client.query('COMMIT');return page
      }
      if (action === 'getImage' || action === 'putImage') {
        checkSlot(original, input.slot)
        if (action === 'putImage') {
          const bytes = (await client.query('SELECT COALESCE(sum(octet_length(i.content)),0)::integer AS n FROM hubpages_studio_images i JOIN hubpages_studio_pages p ON p.id=i.page_id WHERE p.owner_id=$1 AND NOT(i.page_id=$2 AND i.slot=$3)', [ownerId, id, input.slot])).rows[0].n
          if (bytes + input.content.length > 100 * 1024 * 1024) throw new PlatformError(422, 'Limite de 100 MB de mídias atuais por conta atingido.')
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
      if(['create','save'].includes(action)&&input?.draft?.publicUrl&&input.draft.publicUrl!==previousAddress)input={...input,draft:{...input.draft,publicUrl:await checkAddress(client,id||'00000000-0000-0000-0000-000000000000',input.draft.publicUrl)}}
      let page
      if (action === 'create'){page = createDraft(state, ownerId, input);if(page.draft.name==='Minha nova página'&&!page.draft.publicUrl){page.draft.publicUrl=(await suggestStudioAddress(page.draft.name,publicOrigin,url=>checkAddress(client,page.id,url))).url;page.draft.addressAuto=true;page.revisions[0].draft=structuredClone(page.draft)}}
      else if (action === 'save') page = saveDraft(state, ownerId, id, input)
      else if (action === 'duplicate') page = duplicateDraft(state, ownerId, id)
      else if (action === 'restore') page = restoreDraft(state, ownerId, id, input.version, input.revision)
      else throw new Error('Unknown platform operation')
      if (action === 'duplicate') copyImages(page, id)
      checkImages(page)
      if(page.draft.publicUrl&&page.draft.publicUrl!==previousAddress){page.draft.publicUrl=await checkAddress(client,page.id,page.draft.publicUrl);page.revisions.at(-1).draft=structuredClone(page.draft)}
      await ensureOwner(client, ownerId)
      await writePage(client, page, page.id === original?.id ? previousVersion : 0)
      await syncAddress(client,page)
      if (action === 'duplicate') {
        const used = (await client.query('SELECT COALESCE(sum(octet_length(i.content)),0)::integer AS n FROM hubpages_studio_images i JOIN hubpages_studio_pages p ON p.id=i.page_id WHERE p.owner_id=$1', [ownerId])).rows[0].n
        const copying = (await client.query('SELECT COALESCE(sum(octet_length(content)),0)::integer AS n FROM hubpages_studio_images WHERE page_id=$1',[id])).rows[0].n
        if (used+copying>100*1024*1024) throw new PlatformError(422,'Limite de 100 MB de mídias atuais por conta atingido.')
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
    ...pgWorkspace(pool,fallback,{ensureOwner,writePage,writeAudit,loadPage}),
    addressOccupied:async(url)=>Boolean((await pool.query('SELECT 1 FROM hubpages_studio_addresses WHERE public_url=$1',[publicOrigin+new URL(url).pathname.replace(/\/$/,'')])).rowCount),
    review:(ownerId,id)=>execute(ownerId,id,'review'),
    suggestion:(ownerId,id,name)=>execute(ownerId,id,'suggestion',{name}),
    availability:(ownerId,id,url)=>execute(ownerId,id,'availability',{url}),
    trackingRead:(ownerId,id)=>execute(ownerId,id,'trackingRead'),
    trackingSave:(ownerId,id,input)=>execute(ownerId,id,'trackingSave',input),
    async publicResolve(url){const r=await pool.query("SELECT p.id FROM hubpages_studio_pages p JOIN hubpages_studio_publications s ON s.id::text=p.extra->'publication'->>'id' WHERE s.public_url=$1 AND p.editorial_status='published' AND COALESCE(p.extra->>'trashedAt','')=''",[url]);if(!r.rowCount)throw new PlatformError(404,'Página não encontrada.');return this.publicPage(r.rows[0].id)},
    async metaContext(id){const r=await pool.query("SELECT s.draft,s.public_url,t.token_ciphertext,t.test_event_code FROM hubpages_studio_publications s JOIN hubpages_studio_pages p ON p.id=s.page_id LEFT JOIN hubpages_studio_tracking t ON t.page_id=p.id WHERE s.id=$1 AND p.extra->'publication'->>'id'=s.id::text AND p.editorial_status='published' AND COALESCE(p.extra->>'trashedAt','')=''",[id]);const row=r.rows[0];return row?{enabled:row.draft.metaPixelEnabled,pixelId:row.draft.metaPixelId,url:row.public_url,accessToken:openToken(row.token_ciphertext,fallback?.credentialKey),testEventCode:row.test_event_code}:null},
    async claimMeta(id,event){return Boolean((await pool.query('INSERT INTO hubpages_studio_meta_events(publication_id,event_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,event])).rowCount)},
    async finishMeta(id,event,status){await pool.query('UPDATE hubpages_studio_meta_events SET status=$3 WHERE publication_id=$1 AND event_id=$2',[id,event,status])},
    async list(ownerId,trashed=false) {
      const result = await pool.query(`SELECT p.*, (SELECT s.draft FROM hubpages_studio_publications s WHERE s.id::text=p.extra->'publication'->>'id') AS published_draft, ARRAY(SELECT i.slot FROM hubpages_studio_images i LEFT JOIN hubpages_studio_publication_images v ON v.publication_id::text=p.extra->'publication'->>'id' AND v.slot=i.slot WHERE i.page_id=p.id AND i.content IS DISTINCT FROM v.content) AS changed_images, (SELECT count(*)::integer FROM hubpages_studio_revisions r WHERE r.page_id=p.id) AS revision_count FROM hubpages_studio_pages p WHERE owner_id=$1 AND (COALESCE(extra->>'trashedAt','')<>'')=$2 ORDER BY created_at,id`, [ownerId,trashed])
      return result.rows.map((row) => {
        const { draft, revisions: _revisions, ...page } = fromRow(row)
        return { ...page, name: draft.name, title: draft.title, step: draft.step, revisions: row.revision_count,coverUrl:draft.imageUrl,coverType:draft.mediaType,locale:draft.locale,pendingChangeCount:pendingChanges(draft,row.published_draft,row.changed_images).length }
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
      const result=await pool.query("SELECT i.mime,i.content FROM hubpages_studio_publication_images i JOIN hubpages_studio_publications s ON s.id=i.publication_id JOIN hubpages_studio_pages p ON p.id=s.page_id WHERE s.id=$1 AND i.slot=$2 AND p.extra->'publication'->>'id'=s.id::text AND p.editorial_status='published' AND COALESCE(p.extra->>'trashedAt','')=''",[id,slot])
      if(!result.rowCount)throw new PlatformError(404,'Imagem não encontrada.')
      return result.rows[0]
    },
    getImage: (ownerId, id, slot) => execute(ownerId, id, 'getImage', { slot }),
    putImage: (ownerId, id, slot, mime, content) => execute(ownerId, id, 'putImage', { slot, mime, content }),
    close: () => pool.end(),
  }
}

function fileStore({ read, write,publicOrigin,credentialKey }) {
  let pending = Promise.resolve()
  const operation = (fn, persist = true) => {
    const task = pending.then(async () => { const state = await read(); const result = await fn(state); if (persist) await write(state); return result })
    pending = task.catch(() => undefined)
    return task
  }
  const checkAddress=(s,id,value)=>{const own=s.platform?.pages?.[id]?.legacySlug;const url=normalizeStudioAddress(value,publicOrigin,!!own);if(legacyAddressConflict(s,url,own)||Object.values(s.platform?.pages||{}).some(p=>p.id!==id&&!p.trashedAt&&(p.draft.publicUrl===url||(p.editorialStatus==='published'&&p.publication?.url===url))))throw new PlatformError(409,'Este endereço já está em uso.');return url}
  const review=(s,ownerId,id)=>{const page=readDraft(s,ownerId,id),pub=s.platform.publications?.[page.publication?.id],images=Object.entries(s.platform.images?.[id]||{}).sort(([a],[b])=>a.localeCompare(b));return {publishedDraft:pub?.draft||null,publishedAt:pub?.publishedAt||null,changedImageSlots:images.filter(([slot,img])=>img.content!==pub?.images?.[slot]?.content).map(([slot])=>slot),assetVersion:createHash('sha256').update(JSON.stringify(images)).digest('hex')}}
  const quota = (state, ownerId) => { if (listDrafts(state, ownerId).length+listDrafts(state,ownerId,true).length >= 1000) throw new PlatformError(422, 'Limite de uso justo atingido. Contate o suporte.') }
  return {
    ...fileWorkspace(operation,{publicOrigin,credentialKey}),
    addressOccupied:(url)=>operation(s=>{try{checkAddress(s,'',publicOrigin+new URL(url).pathname);return false}catch(error){return error.status===409}},false),
    review:(ownerId,id)=>operation(s=>review(s,ownerId,id),false),
    suggestion:(ownerId,id,name)=>operation(async s=>{readDraft(s,ownerId,id);return suggestStudioAddress(name,publicOrigin,url=>checkAddress(s,id,url))},false),
    availability:(ownerId,id,url)=>operation(s=>{readDraft(s,ownerId,id);return {available:true,url:checkAddress(s,id,url)}},false),
    trackingRead:(ownerId,id)=>operation(s=>{readDraft(s,ownerId,id);return trackingView(s.platform.tracking?.[id])},false),
    trackingSave:(ownerId,id,input)=>operation(s=>{readDraft(s,ownerId,id);s.platform.tracking??={};s.platform.tracking[id]=trackingChange(input,s.platform.tracking[id],credentialKey);return trackingView(s.platform.tracking[id])}),
    publicResolve:(url)=>operation(s=>{const p=Object.values(s.platform?.pages||{}).find(p=>!p.trashedAt&&p.editorialStatus==='published'&&p.publication?.url===url);if(!p)throw new PlatformError(404,'Página não encontrada.');const pub=s.platform.publications[p.publication.id];return{id:pub.id,revision:pub.revision,draft:pub.draft,publishedAt:pub.publishedAt,url:pub.url}},false),
    metaContext:(id)=>operation(s=>{const pub=s.platform?.publications?.[id],p=s.platform?.pages?.[pub?.pageId];if(!p||p.trashedAt||p.editorialStatus!=='published'||p.publication?.id!==id)return null;const t=s.platform.tracking?.[p.id];return{enabled:pub.draft.metaPixelEnabled,pixelId:pub.draft.metaPixelId,url:pub.url,accessToken:openToken(t?.token_ciphertext,credentialKey),testEventCode:t?.test_event_code}},false),
    claimMeta:(id,event)=>operation(s=>{s.platform.metaEvents??={};const key=id+':'+event;if(s.platform.metaEvents[key])return false;s.platform.metaEvents[key]='pending';return true}),
    finishMeta:(id,event,status)=>operation(s=>{s.platform.metaEvents[id+':'+event]=status}),
    list: (ownerId,trashed=false) => operation((s) => listDrafts(s, ownerId,trashed).map(page=>{if(trashed)return page;const context=review(s,ownerId,page.id);return{...page,coverUrl:s.platform.pages[page.id].draft.imageUrl,coverType:s.platform.pages[page.id].draft.mediaType,locale:s.platform.pages[page.id].draft.locale,pendingChangeCount:pendingChanges(s.platform.pages[page.id].draft,context.publishedDraft,context.changedImageSlots).length}}), false),
    read: (ownerId, id) => operation((s) => readDraft(s, ownerId, id), false),
    create: (ownerId, input) => operation(async(s) => { quota(s, ownerId); const p = createDraft(s, ownerId, input);if(p.draft.name==='Minha nova página'&&!p.draft.publicUrl){p.draft.publicUrl=(await suggestStudioAddress(p.draft.name,publicOrigin,url=>checkAddress(s,p.id,url))).url;p.draft.addressAuto=true;p.revisions[0].draft=structuredClone(p.draft)}if(p.draft.publicUrl){p.draft.publicUrl=checkAddress(s,p.id,p.draft.publicUrl);p.revisions[0].draft=structuredClone(p.draft);s.platform.pages[p.id]=p} checkImages(p); return p }),
    save: (ownerId, id, input) => operation((s) => { if(input.draft?.publicUrl&&input.draft.publicUrl!==readDraft(s,ownerId,id).draft.publicUrl)input={...input,draft:{...input.draft,publicUrl:checkAddress(s,id,input.draft.publicUrl)}};const p = saveDraft(s, ownerId, id, input); checkImages(p); for (const key of Object.keys(s.platform.images?.[id] ?? {})) if (!slots(p).includes(key)) delete s.platform.images[id][key]; return p }),
    duplicate: (ownerId, id) => operation((s) => { readDraft(s, ownerId, id); quota(s, ownerId); const p = duplicateDraft(s, ownerId, id); copyImages(p,id); s.platform.pages[p.id]=p; s.platform.images ??= {}; s.platform.images[p.id] = structuredClone(s.platform.images[id] ?? {}); return p }),
    restore: (ownerId, id, input) => operation((s) => restoreDraft(s, ownerId, id, input.version, input.revision)),
    trash:(ownerId,id,input)=>operation(s=>{const p=trashDraft(s,ownerId,id,input.revision);for(const pub of Object.values(s.platform.publications||{}))if(pub.pageId===id)pub.images={};return p}),
    untrash:(ownerId,id,input)=>operation(s=>trashDraft(s,ownerId,id,input.revision,true)),
    unpublish:(ownerId,id,input)=>operation(s=>{const p=unpublishDraft(s,ownerId,id,input.revision);for(const pub of Object.values(s.platform.publications||{}))if(pub.pageId===id)pub.images={};return p}),
    publish:(ownerId,id,input)=>operation(s=>{const original=readDraft(s,ownerId,id);if(input.requireReview&&original.origin==='native'&&original.financialStatus==='unpaid'&&(!(original.draft.visitedSteps||[]).includes(7)||original.draft.reviewedSignature!==reviewSignature(original.draft,review(s,ownerId,id).assetVersion)))throw new PlatformError(422,'A Revisão é necessária antes de publicar. Abra a etapa Revisão e marque a caixinha confirmando a conferência dos textos, imagens e links.');if(original.origin==='native')checkAddress(s,id,original.draft.publicUrl);const page=publishDraft(s,ownerId,id,input.revision,input.origin),pub=s.platform.publications[page.publication.id];pub.images={};for(const slot of slots(page).filter(Boolean)){const img=s.platform.images?.[id]?.[slot];if(!img)throw new PlatformError(422,'Reenvie as imagens antes de publicar.');pub.images[slot]=structuredClone(img)}for(const old of Object.values(s.platform.publications))if(old.pageId===id&&old.id!==pub.id)old.images={};return page}),
    publicPage:(id)=>operation(s=>{const page=s.platform?.pages?.[id],pub=s.platform?.publications?.[page?.publication?.id];if(!pub||page.trashedAt||page.editorialStatus!=='published')throw new PlatformError(404,'Página não encontrada.');const {ownerId:_owner,images:_images,...result}=pub;return result},false),
    publicImage:(id,slot)=>operation(s=>{const pub=s.platform?.publications?.[id],page=s.platform?.pages?.[pub?.pageId],img=pub?.images?.[slot];if(!img||page?.publication?.id!==id||page?.trashedAt||page?.editorialStatus!=='published')throw new PlatformError(404,'Imagem não encontrada.');return{mime:img.mime,content:Buffer.from(img.content,'base64')}},false),
    getImage: (ownerId, id, slot) => operation((s) => { checkSlot(readDraft(s, ownerId, id),slot); const img = s.platform.images?.[id]?.[slot]; if (!img) throw new PlatformError(404, 'Imagem não encontrada.'); return { mime: img.mime, content: Buffer.from(img.content,'base64') } }, false),
    putImage: (ownerId, id, slot, mime, content) => operation((s) => { checkSlot(readDraft(s, ownerId, id),slot); s.platform.images ??= {}; s.platform.images[id] ??= {}; const used = Object.entries(s.platform.images).filter(([pageId]) => s.platform.pages[pageId]?.ownerId === ownerId).reduce((sum,[pageId,items]) => sum + Object.entries(items).reduce((n,[key,img]) => n+(pageId===id && key===slot ? 0 : Buffer.from(img.content,'base64').length),0),0); if (used+content.length>100*1024*1024) throw new PlatformError(422,'Limite de imagens ativas atingido.'); s.platform.images[id][slot]={mime,content:content.toString('base64')}; return {mime,content} }),
    close: async () => {},
  }
}
