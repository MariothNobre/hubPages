import pg from 'pg'
import assert from 'node:assert/strict'
import { adoptedPage,legacySlugs } from './workspace-model.mjs'
import { openToken } from './studio-tracking.mjs'
assert.equal(process.env.HUBPAGES_ENV,'production')
assert.equal(process.env.HUBPAGES_PUBLIC_ORIGIN,'https://hubpages.com.br')
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1})
try{
  const state=(await pool.query('SELECT payload FROM hubpages_state WHERE id=1')).rows[0].payload
  assert.ok(state.admin?.email&&state.admin.passwordHash?.startsWith('scrypt$'))
  const shape=draft=>JSON.parse(JSON.stringify({...draft,blocks:draft.blocks.map(({id:_id,...block})=>block)}))
  for(const slug of legacySlugs){
    if(!state.pages?.[slug])continue
    const row=(await pool.query('SELECT p.* FROM hubpages_studio_pages p JOIN hubpages_studio_legacy l ON l.page_id=p.id WHERE l.slug=$1',[slug])).rows[0]
    assert.ok(row,'Existing production page must be managed by Studio')
    assert.equal(row.owner_id,'legacy-owner')
    if(row.revision===1){
      const expected=adoptedPage(slug,state.pages[slug],state.analytics?.[slug]?.visits,'https://hubpages.com.br').page
      assert.deepEqual(shape(row.draft),shape(expected.draft),'Production source content must be preserved')
      assert.equal(row.editorial_status,expected.editorialStatus)
      assert.equal(Number(row.extra.legacyVisits),expected.legacyVisits)
      const old=state.tracking?.[slug]||(slug.endsWith('_es')?state.tracking?.infancia_alem_das_telas:null)
      if(old?.accessToken){const t=(await pool.query('SELECT token_ciphertext,test_event_code FROM hubpages_studio_tracking WHERE page_id=$1',[row.id])).rows[0];assert.ok(openToken(t?.token_ciphertext,process.env.HUBPAGES_SESSION_SECRET)===old.accessToken,'Production tracking token must be preserved');assert.ok(t.test_event_code===(old.testEventCode||''),'Production test code must be preserved')}
    }
  }
  console.log('Production Studio verified: source pages, publication status, visit totals, tracking and existing access preserved. No DEV data imported.')
}finally{await pool.end()}
