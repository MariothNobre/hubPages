import { PlatformError } from './platform-error.mjs'
import { adoptedPage,legacySlugs,trafficReport } from './workspace-model.mjs'
import { trackingChange } from './studio-tracking.mjs'
export function pgWorkspace(pool,options,{ensureOwner,writePage,writeAudit,loadPage}) {
  const transaction=async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result}catch(error){await c.query('ROLLBACK');throw error}finally{c.release()}}
  let lastCleanup=0
  return {
    async adoptLegacy(){return transaction(async c=>{
      await c.query('SELECT pg_advisory_xact_lock(702074,1)')
      const state=(await c.query('SELECT payload FROM hubpages_state WHERE id=1 FOR UPDATE')).rows[0].payload
      for(const slug of legacySlugs){if(!state.pages?.[slug]||(await c.query('SELECT 1 FROM hubpages_studio_legacy WHERE slug=$1',[slug])).rowCount)continue
        const {page,publication,audit}=adoptedPage(slug,state.pages[slug],state.analytics?.[slug]?.visits,options.publicOrigin)
        await ensureOwner(c,page.ownerId);await writePage(c,page)
        if(publication)await c.query('INSERT INTO hubpages_studio_publications(id,page_id,owner_id,revision,draft,published_at,public_url,mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[publication.id,page.id,page.ownerId,publication.revision,publication.draft,publication.publishedAt,publication.url,publication.mode])
        await c.query('INSERT INTO hubpages_studio_addresses(public_url,page_id,owner_id) VALUES($1,$2,$3)',[page.draft.publicUrl,page.id,page.ownerId])
        await c.query('INSERT INTO hubpages_studio_legacy(slug,page_id) VALUES($1,$2)',[slug,page.id])
        const old=state.tracking?.[slug]||(slug.endsWith('_es')?state.tracking?.infancia_alem_das_telas:null)
        if(old?.accessToken||old?.testEventCode){const t=trackingChange({metaConversionsApiToken:old.accessToken||'',metaTestEventCode:old.testEventCode||''},null,options.credentialKey);await c.query('INSERT INTO hubpages_studio_tracking(page_id,owner_id,token_ciphertext,test_event_code) VALUES($1,$2,$3,$4)',[page.id,page.ownerId,t.token_ciphertext,t.test_event_code])}
        await writeAudit(c,audit)
      }
    })},
    async legacyManaged(slug){return Boolean((await pool.query('SELECT 1 FROM hubpages_studio_legacy WHERE slug=$1',[slug])).rowCount)},
    async preferences(ownerId,value){return transaction(async c=>{await ensureOwner(c,ownerId);if(value!==undefined){if(!['cards','list'].includes(value))throw new PlatformError(422,'Modo de exibição inválido.');await c.query('INSERT INTO hubpages_studio_preferences(owner_id,list_view) VALUES($1,$2) ON CONFLICT(owner_id) DO UPDATE SET list_view=EXCLUDED.list_view',[ownerId,value])}return{listView:(await c.query('SELECT list_view FROM hubpages_studio_preferences WHERE owner_id=$1',[ownerId])).rows[0]?.list_view||'cards'}})},
    async summary(ownerId){const result=await pool.query("SELECT p.id,COALESCE((p.extra->>'legacyVisits')::bigint,0)+COALESCE((SELECT sum(visits) FROM hubpages_studio_traffic WHERE page_id=p.id),0) AS total,CASE WHEN p.editorial_status='published' AND COALESCE(p.extra->>'trashedAt','')='' THEN (SELECT count(DISTINCT visitor_hash) FROM hubpages_studio_presence WHERE page_id=p.id AND last_seen>now()-interval '45 seconds') ELSE 0 END AS online FROM hubpages_studio_pages p WHERE owner_id=$1",[ownerId]);return Object.fromEntries(result.rows.map(r=>[r.id,{visits:Number(r.total),online:Number(r.online)}]))},
    async metrics(ownerId,id){const page=await transaction(c=>loadPage(c,ownerId,id,false));if(page.trashedAt)throw new PlatformError(404,'Página não encontrada.');const rows=(await pool.query("SELECT hour,visits FROM hubpages_studio_traffic WHERE page_id=$1 AND hour>=(date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')-interval '29 days' ORDER BY hour",[id])).rows;const summary=(await this.summary(ownerId))[id];return trafficReport(rows,summary.visits,summary.online,page.legacyVisits||0)},
    async track({publicationId,url,visitor,tabId,isNewVisit,active}){return transaction(async c=>{
      const result=await c.query("SELECT p.id FROM hubpages_studio_pages p JOIN hubpages_studio_publications s ON s.id::text=p.extra->'publication'->>'id' JOIN hubpages_studio_publications requested ON requested.page_id=p.id WHERE requested.id=$1 AND s.public_url=$2 AND requested.public_url=$2 AND p.editorial_status='published' AND COALESCE(p.extra->>'trashedAt','')=''",[publicationId,url]);if(!result.rowCount)throw new PlatformError(404,'Página não publicada.');const id=result.rows[0].id
      await c.query('SELECT pg_advisory_xact_lock(702075,hashtext($1))',[id+visitor])
      if(!active){await c.query('DELETE FROM hubpages_studio_presence WHERE page_id=$1 AND visitor_hash=$2 AND tab_id=$3',[id,visitor,tabId]);return{accepted:true}}
      await c.query('INSERT INTO hubpages_studio_presence(page_id,visitor_hash,tab_id) VALUES($1,$2,$3) ON CONFLICT(page_id,visitor_hash,tab_id) DO UPDATE SET last_seen=now()',[id,visitor,tabId])
      let counted=false
      if(isNewVisit){const r=await c.query("INSERT INTO hubpages_studio_visitors(page_id,visitor_hash,last_visit_at) VALUES($1,$2,now()) ON CONFLICT(page_id,visitor_hash) DO UPDATE SET last_visit_at=now() WHERE hubpages_studio_visitors.last_visit_at<now()-interval '30 minutes' RETURNING visitor_hash",[id,visitor]);counted=!!r.rowCount;if(counted)await c.query("INSERT INTO hubpages_studio_traffic(page_id,hour,visits) VALUES($1,date_trunc('hour',now()),1) ON CONFLICT(page_id,hour) DO UPDATE SET visits=hubpages_studio_traffic.visits+1",[id])}
      if(Date.now()-lastCleanup>3600000){lastCleanup=Date.now();await c.query("DELETE FROM hubpages_studio_presence WHERE last_seen<now()-interval '1 day'");await c.query("DELETE FROM hubpages_studio_visitors WHERE last_visit_at<now()-interval '90 days'")}
      return {accepted:true,counted}
    })},
    async purge(ownerId,id,input){return transaction(async c=>{
      await c.query('SELECT pg_advisory_xact_lock(702072,hashtext($1))',[ownerId]);await c.query('SELECT pg_advisory_xact_lock(702073,1)')
      const page=await loadPage(c,ownerId,id,false)
      if(!page.trashedAt||page.editorialStatus==='published'||page.financialStatus!=='unpaid')throw new PlatformError(409,'Mova a página para a lixeira antes de excluir permanentemente.')
      if(input?.revision!==page.revision||input?.confirmation!=='EXCLUIR')throw new PlatformError(409,'Confirme a exclusão e a versão atual da página.')
      await c.query("SELECT set_config('hubpages.purge_page',$1,true)",[id])
      await c.query('INSERT INTO hubpages_studio_purges(page_id,owner_id) VALUES($1,$2)',[id,ownerId])
      await c.query('DELETE FROM hubpages_studio_meta_events WHERE publication_id IN(SELECT id FROM hubpages_studio_publications WHERE page_id=$1)',[id])
      await c.query('DELETE FROM hubpages_studio_publication_images WHERE publication_id IN(SELECT id FROM hubpages_studio_publications WHERE page_id=$1)',[id])
      for(const table of ['publications','revisions','audit','images','tracking','addresses'])await c.query(`DELETE FROM hubpages_studio_${table} WHERE page_id=$1`,[id])
      if(page.legacySlug){await c.query('UPDATE hubpages_studio_legacy SET purged_at=now() WHERE page_id=$1',[id]);await c.query("UPDATE hubpages_state SET payload=payload #- ARRAY['pages',$1] #- ARRAY['tracking',$1] #- ARRAY['analytics',$1] WHERE id=1",[page.legacySlug])}
      await c.query("UPDATE hubpages_state SET payload=jsonb_set(payload,'{platform,pages}',(payload#>'{platform,pages}')-$1,true) WHERE id=1 AND jsonb_typeof(payload#>'{platform,pages}')='object'",[id])
      await c.query("UPDATE hubpages_state SET payload=jsonb_set(payload,'{platform,audit}',COALESCE((SELECT jsonb_agg(v) FROM jsonb_array_elements(payload#>'{platform,audit}') v WHERE v->>'pageId'<>$1),'[]'::jsonb),true) WHERE id=1 AND jsonb_typeof(payload#>'{platform,audit}')='array'",[id])
      await c.query('DELETE FROM hubpages_studio_pages WHERE id=$1 AND owner_id=$2',[id,ownerId])
      return {deleted:true}
    })},
  }
}

export function fileWorkspace(operation,options){
  const stats=(s,p)=>{const traffic=Object.values(s.workspace?.traffic?.[p.id]||{}).reduce((n,v)=>n+v,0);const online=p.editorialStatus==='published'&&!p.trashedAt?new Set(Object.values(s.workspace?.presence?.[p.id]||{}).filter(v=>Date.now()-v.at<45000).map(v=>v.visitor)).size:0;return{visits:(p.legacyVisits||0)+traffic,online}}
  return {
    adoptLegacy:()=>operation(s=>{s.workspace??={};s.workspace.legacy??={};for(const slug of legacySlugs){if(!s.pages?.[slug]||s.workspace.legacy[slug])continue;const{page,publication,audit}=adoptedPage(slug,s.pages[slug],s.analytics?.[slug]?.visits,options.publicOrigin);s.platform??={pages:{},audit:[]};s.platform.pages[page.id]=page;s.platform.audit.push(...audit);s.platform.publications??={};if(publication)s.platform.publications[publication.id]=publication;s.workspace.legacy[slug]={pageId:page.id};const old=s.tracking?.[slug]||(slug.endsWith('_es')?s.tracking?.infancia_alem_das_telas:null);if(old){s.platform.tracking??={};s.platform.tracking[page.id]=trackingChange({metaConversionsApiToken:old.accessToken||'',metaTestEventCode:old.testEventCode||''},null,options.credentialKey)}}}),
    legacyManaged:slug=>operation(s=>!!s.workspace?.legacy?.[slug],false),
    preferences:(ownerId,value)=>operation(s=>{s.workspace??={};s.workspace.preferences??={};if(value!==undefined){if(!['cards','list'].includes(value))throw new PlatformError(422,'Modo de exibição inválido.');s.workspace.preferences[ownerId]=value}return{listView:s.workspace.preferences[ownerId]||'cards'}}),
    summary:ownerId=>operation(s=>Object.fromEntries(Object.values(s.platform?.pages||{}).filter(p=>p.ownerId===ownerId).map(p=>[p.id,stats(s,p)])),false),
    metrics:(ownerId,id)=>operation(s=>{const p=s.platform?.pages?.[id];if(!p||p.ownerId!==ownerId||p.trashedAt)throw new PlatformError(404,'Página não encontrada.');const total=stats(s,p);return trafficReport(Object.entries(s.workspace?.traffic?.[id]||{}).map(([hour,visits])=>({hour,visits})),total.visits,total.online,p.legacyVisits||0)},false),
    track:input=>operation(s=>{const pub=s.platform?.publications?.[input.publicationId],p=s.platform?.pages?.[pub?.pageId];if(!p||p.trashedAt||p.editorialStatus!=='published'||p.publication?.url!==input.url||pub.url!==input.url)throw new PlatformError(404,'Página não publicada.');s.workspace??={};const w=s.workspace;w.presence??={};w.presence[p.id]??={};const key=input.visitor+':'+input.tabId;if(!input.active){delete w.presence[p.id][key];return{accepted:true}}w.presence[p.id][key]={visitor:input.visitor,at:Date.now()};w.visitors??={};w.visitors[p.id]??={};let counted=false;if(input.isNewVisit&&Date.now()-(w.visitors[p.id][input.visitor]||0)>=1800000){counted=true;w.visitors[p.id][input.visitor]=Date.now();w.traffic??={};w.traffic[p.id]??={};const hour=new Date(Math.floor(Date.now()/3600000)*3600000).toISOString();w.traffic[p.id][hour]=(w.traffic[p.id][hour]||0)+1}return{accepted:true,counted}}),
    purge:(ownerId,id,input)=>operation(s=>{const p=s.platform?.pages?.[id];if(!p||p.ownerId!==ownerId)throw new PlatformError(404,'Página não encontrada.');if(!p.trashedAt||p.financialStatus!=='unpaid'||p.revision!==input?.revision||input.confirmation!=='EXCLUIR')throw new PlatformError(409,'Confirme a versão atual de uma página na lixeira.');delete s.platform.pages[id];s.platform.audit=s.platform.audit.filter(e=>e.pageId!==id);for(const key of ['images','tracking'])if(s.platform[key])delete s.platform[key][id];for(const[pubId,pub]of Object.entries(s.platform.publications||{}))if(pub.pageId===id){delete s.platform.publications[pubId];for(const key of Object.keys(s.platform.metaEvents||{}))if(key.startsWith(pubId+':'))delete s.platform.metaEvents[key]}for(const key of ['presence','visitors','traffic'])if(s.workspace?.[key])delete s.workspace[key][id];if(p.legacySlug){s.workspace.legacy[p.legacySlug]={pageId:null,purgedAt:new Date().toISOString()};delete s.pages[p.legacySlug];if(s.tracking)delete s.tracking[p.legacySlug];if(s.analytics)delete s.analytics[p.legacySlug]}return{deleted:true}}),
  }
}
