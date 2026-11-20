import { createHash,randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createDraft } from './platform.mjs'
import { templateInput } from './templates.mjs'
import { PlatformError } from './platform-error.mjs'
const defaults=JSON.parse(await readFile(new URL('./templates/legacy-defaults.json',import.meta.url),'utf8'))
export const legacySlugs=Object.keys(defaults)
export function adoptedPage(slug,content,visits,origin) {
  const es=slug.endsWith('_es'),source={...defaults[slug],...content},state={}
  const path=new URL(source.publicUrl||origin+'/'+slug).pathname.replace(/\/$/,'')
  if(!path)throw new PlatformError(409,'A página existente usa a raiz de um domínio externo. Sua migração exige um endereço próprio neste ambiente.')
  const input={...templateInput({template:es?'infancia_es':'infancia_pt'}),name:es?'Infancia Más Allá de las Pantallas':'Infância Além das Telas',title:source.title,description:source.description,redLine:source.redLine,eyebrow:source.eyebrow,ctaLabel:source.ctaLabel,checkoutUrl:source.ctaHref||'',publicUrl:origin+path,metaPixelId:source.metaPixelId||'',metaPixelEnabled:source.metaPixelEnabled===true,addressAuto:false}
  if(content.priceLabel)input.priceLabel=content.priceLabel
  if(content.originalPrice)input.originalPrice=content.originalPrice
  const page=createDraft(state,'legacy-owner',input)
  page.legacySlug=slug;page.legacyVisits=Math.max(0,Number(visits)||0)
  let publication
  if(source.published!==false){publication={id:randomUUID(),pageId:page.id,ownerId:page.ownerId,revision:page.revision,draft:structuredClone(page.draft),publishedAt:page.updatedAt,url:page.draft.publicUrl,mode:'dev-free'};const {draft:_draft,...metadata}=publication;page.publication=metadata;page.editorialStatus='published'}
  return {page,publication,audit:state.platform.audit}
}
export function visitorHash(visitor,secret){if(typeof visitor!=='string'||!/^[a-f0-9-]{36}$/.test(visitor))throw new PlatformError(422,'Identificador de visita inválido.');return createHash('sha256').update(secret+'|'+visitor).digest('hex')}
export function trafficReport(rows,total,online,legacyTotal=0,now=new Date()) {
  const hours=Array.from({length:24},(_,hour)=>({hour,visits:0})),heat=Array.from({length:7},()=>Array(24).fill(0)),days=new Map()
  for(let offset=29;offset>=0;offset--){const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(+now-offset*86400000));days.set(day,0)}
  for(const row of rows){const visits=Number(row.visits),date=new Date(row.hour),parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23',weekday:'short'}).formatToParts(date).map(p=>[p.type,p.value]));const day=parts.year+'-'+parts.month+'-'+parts.day,hour=Number(parts.hour),dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday);if(!days.has(day))continue;days.set(day,days.get(day)+visits);hours[hour].visits+=visits;if(dow>=0)heat[dow][hour]+=visits}
  const measured=hours.reduce((n,h)=>n+h.visits,0),maximum=Math.max(...hours.map(h=>h.visits)),minimum=Math.min(...hours.map(h=>h.visits))
  return {total:Number(total),online:Number(online),legacyTotal:Number(legacyTotal),measured,timezone:'America/Sao_Paulo',days:[...days].map(([day,visits])=>({day,visits})),hours,heat,peakHours:measured?hours.filter(h=>h.visits===maximum).map(h=>h.hour):[],lowHours:measured?hours.filter(h=>h.visits===minimum).map(h=>h.hour):[],measuredAt:now.toISOString()}
}
