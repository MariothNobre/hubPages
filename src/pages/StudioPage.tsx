import {CustomDomainWizard,PublishedDomainLinks} from '../components/CustomDomainWizard'
import {ImportPageDialog} from '../components/ImportPageDialog'
import {ImportedModelPanel} from '../components/ImportedModelPanel'
import '../import-studio.css'
import {activeImportedAssets,activeImportedButtons} from '../../shared/imported-palette.mjs'
import { checkoutLinkProblem } from '../../shared/checkout-links.mjs'
import { SystemDialog } from '../components/SystemDialog'
import { StudioUndo } from '../components/StudioUndo'
import { metricsRefreshMs } from '../../shared/studio-traffic.mjs'
import { TemplateGallery } from '../components/TemplateGallery'
import { WorkspaceLinks,WorkspaceFooter } from '../components/WorkspaceChrome'
import { StudioPageList,type StudioSummary } from '../components/StudioPageList'
import { StudioInsights } from '../components/StudioInsights'
import { PurgePageDialog } from '../components/PurgePageDialog'
import { ResponsiveReview } from '../components/ResponsiveReview'
import { pendingChanges,reviewSignature,wizardReadiness } from '../../shared/studio-wizard.mjs'
import { WizardTimeline,StepGuide,PublicationChanges } from '../components/StudioWizard'
import { CheckoutSettings,AddressSettings,TrackingSettings } from '../components/StudioSettings'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link,useSearchParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import type { Draft } from '../components/studio-model'
import { StudioDesigner } from '../components/StudioDesigner'
import { withLegacyRoles } from '../components/legacy-template-model'
import { DeletePageDialog } from '../components/DeletePageDialog'
import '../studio.css'

interface Publication {id:string;revision:number;url:string;mode:string;publishedAt:string}
interface Page { id: string; revision: number; draft: Draft; editorialStatus:string; publication?:Publication; updatedAt: string; revisionCount:number }
type Summary=StudioSummary
const steps = ['Modelo', 'Conteúdo', 'Checkout', 'Rastreamento', 'Endereço', 'Revisão', 'Publicação']
const stepIds=[1,2,4,5,6,7,8]
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/platform/${path}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a solicitação.')
  return data
}

export function StudioPage() {
  const [importOpen,setImportOpen]=useState(false)
  const [params,setParams]=useSearchParams()
  const requestedId=params.get('page'),requestedStep=params.get('step')
  const [guideOpen,setGuideOpen]=useState(true)
  const [dialog,setDialog]=useState<{title:string;message:string;step?:number;recover?:boolean}|null>(null)
  const [listView,setListView]=useState<'cards'|'list'>('cards')
  const [purgeTarget,setPurgeTarget]=useState<Summary|null>(null)
  const [metricTarget,setMetricTarget]=useState<Summary|null>(null)
  const [pages, setPages] = useState<Summary[]>([])
  const [trashed,setTrashed]=useState<Summary[]>([])
  const [showTrash,setShowTrash]=useState(false)
  const [deleteTarget,setDeleteTarget]=useState<Summary|null>(null)
  const [deleting,setDeleting]=useState(false)
  const [deleteError,setDeleteError]=useState('')
  const [freePublishing,setFreePublishing]=useState(false)
  const [production,setProduction]=useState(false)
  const [customDomainsEnabled,setCustomDomainsEnabled]=useState(false)
  const [publishing,setPublishing]=useState(false)
  const [leaving,setLeaving]=useState(false)
  const transition=useRef(false)
  const history=useRef(new StudioUndo())
  const [undoCount,setUndoCount]=useState(0)
  const [undoing,setUndoing]=useState(false)
  const [inlineDirty,setInlineDirty]=useState(false)
  const [mediaBusy,setMediaBusy]=useState(false)
  const skipHistory=useRef(false)
  const [publicOrigin,setPublicOrigin]=useState('https://dev.hubpages.com.br')
  const [page, setPage] = useState<Page | null>(null)
  const [notice, setNotice] = useState('Carregando o Studio privado…')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewport, setViewport] = useState('desktop')
  const [assetRefresh,setAssetRefresh]=useState(0)
  const [addressCheck,setAddressCheck]=useState<{pageId:string;url:string;available:boolean}|null>(null)
  const [review,setReview]=useState<{pageId:string;publicationId:string;publishedDraft:Draft|null;publishedAt:string|null;changedImageSlots:string[];assetVersion:string;error:string}|null>(null)
  const [templates, setTemplates] = useState<Array<{id:string;name:string;description:string;imageUrl:string}>>([])
  const current = useRef<Page | null>(null)
  const saved = useRef('')
  const failedSave=useRef<{draft:string;message:string;step?:number}|null>(null)
  const pending = useRef<Promise<boolean> | null>(null)
  const refresh = useCallback(async () => {
    const result = await api<{ pages: Summary[]; preferences:{listView:'cards'|'list';guideOpen:boolean};billing:{customDomainsEnabled?:boolean;temporaryFreePublishing:boolean;publicOrigin:string;environment?:string} }>('pages')
    setFreePublishing(result.billing.temporaryFreePublishing);setCustomDomainsEnabled(result.billing.customDomainsEnabled===true)
    setPublicOrigin(result.billing.publicOrigin);setProduction(result.billing.environment==='production')
    setTrashed((await api<{pages:Summary[]}>('trash')).pages)
    setTemplates((await api<{templates:typeof templates}>('templates')).templates)
    setGuideOpen(result.preferences?.guideOpen!==false);setPages(result.pages);setListView(result.preferences?.listView||'cards'); setReady(true)
  }, [])
  useEffect(() => { refresh().then(() => setNotice('Seus rascunhos ficam privados.')).catch((error) => setNotice(error.message)) }, [refresh])
  useEffect(()=>{
    if(!ready||!requestedId||current.current?.id===requestedId)return
    let active=true
    api<Page>(`pages/${requestedId}`).then(value=>{if(!active)return;const step=stepIds.includes(Number(requestedStep))?Number(requestedStep):value.draft.step;history.current.clear();failedSave.current=null;setUndoCount(0);const result={...value,draft:withLegacyRoles({...value.draft,step:step===3?2:step,addressAuto:value.draft.publicUrl?value.draft.addressAuto:true})};suggested.current=result.draft.publicUrl?result.id+':'+result.draft.name:'';current.current=result;saved.current=JSON.stringify(result.draft);setPage(result);setNotice('Sua página foi reaberta na etapa em que você estava.')}).catch(error=>{if(active){setNotice(error.message);setParams({},{replace:true})}})
    return()=>{active=false}
  },[ready,requestedId,requestedStep,setParams])
  useEffect(()=>{if(!ready||page)return;let active=true;const timer=setInterval(()=>{if(document.visibilityState!=='visible')return;api<{metrics:Record<string,{visits:number;online:number}>}>('metrics').then(result=>{if(active)setPages(pages=>pages.map(p=>({...p,...result.metrics[p.id]})))}).catch(()=>undefined)},metricsRefreshMs);return()=>{active=false;clearInterval(timer)}},[ready,page])
  const flush = useCallback((interactive=true): Promise<boolean> => {
    const pauseForLink=()=>{const issue=current.current&&checkoutLinkProblem(current.current.draft);if(!issue)return false;const message=`Complete o campo “${issue.label}” com uma URL HTTPS válida para salvar. O texto em edição continua nesta página.`;failedSave.current={draft:JSON.stringify(current.current?.draft),message,step:4};setNotice('Link em edição: aguardando um endereço HTTPS completo para salvar.');if(interactive)setDialog({title:'Complete o link de compra',message,step:4});return true}
    if(pauseForLink())return Promise.resolve(false)
    if (pending.current) return pending.current
    if(current.current&&failedSave.current?.step===6&&failedSave.current?.draft===JSON.stringify(current.current.draft))return Promise.resolve(false)
    if (!current.current || JSON.stringify(current.current.draft) === saved.current) return Promise.resolve(true)
    const task = (async () => {
      setSaving(true)
      let attempted=''
      try {
        await history.current.settled()
        while (current.current && JSON.stringify(current.current.draft) !== saved.current) {
          await history.current.settled()
          if(pauseForLink())return false
          const snapshot = {...current.current,draft:structuredClone(current.current.draft)}
          attempted=JSON.stringify(snapshot.draft)
          const result = await api<Page>(`pages/${snapshot.id}`, 'PUT', { revision: snapshot.revision, draft: snapshot.draft })
          failedSave.current=null; saved.current = JSON.stringify(result.draft)
          if (current.current?.id === snapshot.id) {
            current.current = { ...result, draft: JSON.stringify(current.current.draft)===JSON.stringify(snapshot.draft)?result.draft:current.current.draft }
            setPage(current.current)
          }
        }
        setNotice('Rascunho salvo.'); return true
      } catch (error) { const message=error instanceof Error?error.message:'Falha ao salvar.';failedSave.current={draft:attempted,message,step:/endereço|caminho|link completo/i.test(message)?6:undefined};setNotice(message);setDialog({title:/endereço|caminho|link completo/i.test(message)?'Endereço indisponível':'Não foi possível salvar',message,step:/endereço|caminho|link completo/i.test(message)?6:undefined});return false }
      finally { pending.current = null; setSaving(false) }
    })()
    pending.current = task
    return task
  }, [])
  useEffect(() => {
    if (transition.current || !page || JSON.stringify(page.draft) === saved.current) return
    const timer = window.setTimeout(() => { void flush(false) }, 900)
    return () => window.clearTimeout(timer)
  }, [page, flush, publishing, leaving])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (current.current && JSON.stringify(current.current.draft) !== saved.current) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  function select(value: Page) { history.current.clear();failedSave.current=null;setUndoCount(0);const result={...value,draft:withLegacyRoles({...value.draft,step:value.draft.step===3?2:value.draft.step,addressAuto:value.draft.publicUrl?value.draft.addressAuto:true})};suggested.current=result.draft.publicUrl?result.id+':'+result.draft.name:'';current.current = result; saved.current = JSON.stringify(result.draft); setPage(result);setParams({page:result.id,step:String(result.draft.step)},{replace:true}); setNotice('Rascunho carregado.') }
  function update(change: Partial<Draft> | ((draft: Draft) => Partial<Draft>)) {
    if (!current.current || transition.current) return
    const patch=typeof change==='function'?change(current.current.draft):change
    const before=current.current.draft,next={...before,...patch};if(next.imported){next.importedAssets=activeImportedAssets(next);next.templateButtons=activeImportedButtons(next)}
    if(failedSave.current?.step===4&&!checkoutLinkProblem(next))failedSave.current=null
    const meaningful=Object.keys(patch).some(key=>!['step','visitedSteps','reviewedSignature'].includes(key)&&JSON.stringify(before[key as keyof Draft])!==JSON.stringify(next[key as keyof Draft]))
    if(meaningful&&!skipHistory.current){const oldSlots=history.current.slots(before,current.current.id),newSlots=history.current.slots(next,current.current.id);history.current.record(before,history.current.capture(before,current.current.id,[...oldSlots.keys()].filter(slot=>!newSlots.has(slot))));setUndoCount(history.current.entries.length)}
    skipHistory.current=false
    const step=patch.step??current.current.draft.step
    current.current = {...current.current,draft:{...current.current.draft,...patch,visitedSteps:[...new Set([...(current.current.draft.visitedSteps||[]),step])]}}
    if(patch.step!==undefined)setParams({page:current.current.id,step:String(step)},{replace:true})
    setPage(current.current); setNotice('Alterações pendentes…')
  }
  async function prepareMediaUndo(slot:string){
    const item=current.current;if(!item)throw new Error('Abra uma página para editar.')
    const media=await history.current.capture(item.draft,item.id,[slot])
    return ()=>{if(current.current?.id!==item.id)return;history.current.record(current.current.draft,Promise.resolve(media));setUndoCount(history.current.entries.length);skipHistory.current=true}
  }
  const undo=useCallback(async()=>{
    if(transition.current||!current.current)return
    const entry=history.current.entries.at(-1);if(!entry)return
    transition.current=true;setUndoing(true)
    try{
      if(pending.current&&!await pending.current)return
      const media=await entry.media,item=current.current
      current.current={...item,draft:{...structuredClone(entry.draft),step:item.draft.step,visitedSteps:item.draft.visitedSteps}}
      setPage(current.current)
      if(!await flush())return
      for(const [slot,blob]of media){const r=await fetch(`/api/platform/pages/${item.id}/images/${slot}`,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':blob.type},body:blob});if(!r.ok)throw new Error('Falha ao restaurar a mídia. Clique em Desfazer para tentar novamente.')}
      history.current.entries.pop();setUndoCount(history.current.entries.length);setAssetRefresh(v=>v+1);setNotice('Última alteração desfeita e rascunho salvo.')
    }catch(error){setNotice(error instanceof Error?error.message:'Não foi possível desfazer.')}
    finally{transition.current=false;setUndoing(false)}
  },[flush])
  useEffect(()=>{const key=(event:KeyboardEvent)=>{if(!(event.ctrlKey||event.metaKey)||event.key.toLowerCase()!=='z'||event.shiftKey||event.altKey||event.isComposing)return;const target=event.target;if(target instanceof HTMLElement&&target.closest('input,textarea,[contenteditable="true"]'))return;if(current.current){event.preventDefault();if(!mediaBusy)void undo()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[undo,mediaBusy])
  const suggestionId=page?.id,suggestionName=page?.draft.name,suggestionAutomatic=page?.draft.addressAuto===true
  const suggested=useRef('')
  useEffect(()=>{
    if(!suggestionAutomatic){suggested.current='';return}
    if(suggestionName==='Minha nova página'&&/\/minha_nova_pagina_\d+$/.test(current.current?.draft.publicUrl||''))return
    if(!suggestionId||!suggestionName||publishing||leaving||suggested.current===suggestionId+':'+suggestionName)return
    suggested.current=suggestionId+':'+suggestionName
    const controller=new AbortController()
    const timer=window.setTimeout(()=>{fetch(`/api/platform/pages/${suggestionId}/address-suggestion?name=${encodeURIComponent(suggestionName)}`,{signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.message);const item=current.current;if(!controller.signal.aborted&&!transition.current&&item?.id===suggestionId&&item.draft.name===suggestionName&&(!item.draft.publicUrl||item.draft.addressAuto===true)&&item.draft.publicUrl!==data.url){current.current={...item,draft:{...item.draft,publicUrl:data.url,addressAuto:true}};setPage(current.current);setNotice('Endereço sugerido a partir do nome da página.')}}).catch(error=>{if(!controller.signal.aborted)setNotice(error.message)})},350)
    return()=>{window.clearTimeout(timer);controller.abort()}
  },[suggestionId,suggestionName,suggestionAutomatic,publishing,leaving])
  async function run(action: () => Promise<void>) { try { await action() } catch (error) { setNotice(error instanceof Error ? error.message : 'Falha na operação.') } }
  async function deletePage() {
    if(!deleteTarget)return
    setDeleting(true);setDeleteError('')
    try{await api(`pages/${deleteTarget.id}`,'DELETE',{revision:deleteTarget.revision});await refresh();setDeleteTarget(null);setNotice('Página movida para a lixeira. Você pode restaurá-la a qualquer momento.')}
    catch(error){setDeleteError(error instanceof Error?error.message:'Não foi possível excluir a página.')}
    finally{setDeleting(false)}
  }
  async function confirmReview(checked:boolean){
    if(!checked){update({reviewedSignature:''});return}
    if(!await flush()||!current.current)return
    const item=current.current
    try{const context=await api<{publishedDraft:Draft|null;publishedAt:string|null;changedImageSlots:string[];assetVersion:string}>(`pages/${item.id}/publication-review`);setReview({...context,pageId:item.id,publicationId:item.publication?.id||'',error:''});update({reviewedSignature:reviewSignature(item.draft,context.assetVersion)});await flush()}catch(error){setDialog({title:'Confira a revisão',message:error instanceof Error?error.message:'Não foi possível confirmar a revisão.',step:7})}
  }
  async function publishPage(unpublish=false) {
    if(transition.current)return
    transition.current=true;setPublishing(true)
    try{
      if(pending.current){const ok=await pending.current;if(!ok&&!unpublish)return}
      if((!unpublish&&!await flush())||!current.current)return
      const item=structuredClone(current.current)
      if(!unpublish){
        try{await api(`pages/${item.id}/address-availability?url=${encodeURIComponent(item.draft.publicUrl)}`)}catch(error){setDialog({title:'Endereço indisponível',message:(error instanceof Error?error.message:'Escolha um endereço disponível.')+' Sua página não foi publicada. Escolha outro nome na etapa Endereço.',step:6});return}
        const context=await api<{assetVersion:string}>(`pages/${item.id}/publication-review`)
        if(!(item.draft.visitedSteps||[]).includes(7)||item.draft.reviewedSignature!==reviewSignature(item.draft,context.assetVersion)){setDialog({title:'Revisão necessária antes de publicar',message:'Abra a etapa Revisão e selecione a caixinha “Conferi os textos, as imagens e os links da minha página”. Se você fez novas alterações, confirme a revisão novamente.',step:7});return}
      }
      const result=await api<Page>(`pages/${item.id}/${unpublish?'unpublish':'publish'}`,'POST',{revision:item.revision})
      if(current.current?.id===item.id){saved.current=JSON.stringify(result.draft);current.current=result;setPage(result);const context=await api<{publishedDraft:Draft|null;publishedAt:string|null;changedImageSlots:string[];assetVersion:string}>(`pages/${item.id}/publication-review`);setReview({...context,pageId:item.id,publicationId:result.publication?.id||'',error:''})}
      await refresh();setNotice(unpublish?'Página retirada do ar. O conteúdo está preservado como rascunho.':'Página publicada. Todas as alterações foram aplicadas ao seu link.')
    }catch(error){const message=error instanceof Error?error.message:'Falha ao publicar.';setNotice(message);setDialog({title:'Não foi possível publicar',message,step:message.includes('Revisão')?7:/endereço|caminho|link completo/i.test(message)?6:undefined})}
    finally{transition.current=false;setPublishing(false)}
  }
  async function backToPages(){
    if(transition.current)return;transition.current=true;setLeaving(true)
    try{if(pending.current)await pending.current;if(!await flush()){setDialog({title:failedSave.current?.step===6?'Endereço indisponível':'Não foi possível sair do editor',message:failedSave.current?.message||'Confira os dados da página antes de continuar.',step:failedSave.current?.step,recover:failedSave.current?.step===6});return}current.current=null;history.current.clear();setUndoCount(0);setInlineDirty(false);setPage(null);setParams({},{replace:true});await refresh()}
    catch(error){setDialog({title:'Não foi possível voltar',message:error instanceof Error?error.message:'Tente novamente.'})}
    finally{transition.current=false;setLeaving(false)}
  }
  async function recoverAddressAndLeave(){
    const item=current.current;if(!item)return
    setDialog(null)
    try{const result=await api<{url:string}>(`pages/${item.id}/address-suggestion?name=${encodeURIComponent(item.draft.name)}`);update({publicUrl:result.url,addressAuto:false});await backToPages()}catch(error){setDialog({title:'Escolha outro endereço',message:error instanceof Error?error.message:'Confira o endereço.',step:6})}
  }
  async function changeGuide(open:boolean){setGuideOpen(open);try{await api('preferences','PUT',{guideOpen:open})}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível salvar esta preferência.')}}
  const addressPageId=page?.id,addressValue=page?.draft.publicUrl
  useEffect(()=>{if(!addressPageId||!addressValue)return;const controller=new AbortController();const timer=window.setTimeout(()=>{fetch(`/api/platform/pages/${addressPageId}/address-availability?url=${encodeURIComponent(addressValue)}`,{signal:controller.signal}).then(response=>{if(!controller.signal.aborted)setAddressCheck({pageId:addressPageId,url:addressValue,available:response.ok})}).catch(()=>{if(!controller.signal.aborted)setAddressCheck({pageId:addressPageId,url:addressValue,available:false})})},300);return()=>{window.clearTimeout(timer);controller.abort()}},[addressPageId,addressValue])
  const reviewPageId=page?.id,reviewPublicationId=page?.publication?.id||''
  useEffect(()=>{
    if(!reviewPageId)return
    const controller=new AbortController()
    const timer=window.setTimeout(()=>{fetch(`/api/platform/pages/${reviewPageId}/publication-review`,{signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.message);if(!controller.signal.aborted)setReview({...data,publishedDraft:data.publishedDraft?withLegacyRoles(data.publishedDraft):null,pageId:reviewPageId,publicationId:reviewPublicationId,error:''})}).catch(error=>{if(!controller.signal.aborted)setReview(previous=>({pageId:reviewPageId,publicationId:reviewPublicationId,publishedDraft:previous?.pageId===reviewPageId?previous.publishedDraft:null,publishedAt:previous?.pageId===reviewPageId?previous.publishedAt:null,changedImageSlots:[],assetVersion:'',error:error.message}))})},200)
    return()=>{window.clearTimeout(timer);controller.abort()}
  },[reviewPageId,reviewPublicationId,assetRefresh])
  const draft = page?.draft
  const reviewCurrent=review?.pageId===page?.id&&review?.publicationId===reviewPublicationId?review:null
  const changes=draft&&(!page?.publication||reviewCurrent&&!reviewCurrent.error)?pendingChanges(draft,reviewCurrent?.publishedDraft||null,reviewCurrent?.changedImageSlots):[]
  if(page?.publication&&page.editorialStatus!=='published'&&changes.length===0&&!reviewCurrent?.error)changes.push({id:'reactivate',label:'Colocar a página no ar',detail:'A página está como rascunho. Publique para ativar seu link novamente.'})
  const signature=draft?reviewSignature(draft,reviewCurrent?.assetVersion||''):''
  const reviewed=!!reviewCurrent&&!reviewCurrent.error&&draft?.reviewedSignature===signature
  const stepReady=draft?wizardReadiness(draft,publicOrigin,reviewed,page?.editorialStatus==='published'&&!!reviewCurrent&&!reviewCurrent.error,changes.length):[]
  if(draft)stepReady[4]=stepReady[4]&&addressCheck?.pageId===page?.id&&addressCheck?.url===draft.publicUrl&&addressCheck.available
  const pageNavigation = page && draft && <div className="studio-page-navigation"><div className="wizard-header-actions"><button disabled={leaving||publishing||undoing||mediaBusy} onClick={()=>void backToPages()}>← Minhas páginas</button><span className="studio-autosave" role="status">{saving?'Salvando automaticamente…':failedSave.current?'Confira o aviso de salvamento':current.current&&JSON.stringify(current.current.draft)!==saved.current?'Alterações aguardando salvamento…':'✓ Salvamento automático'}</span></div><WizardTimeline imported={!!draft.imported} step={draft.step} ready={stepReady} pending={changes.length} busy={publishing||leaving||undoing||mediaBusy} onStep={id=>update({step:id})}/></div>
  async function changeView(value:'cards'|'list'){try{await api('preferences','PUT',{listView:value});setListView(value)}catch(error){setNotice(error instanceof Error?error.message:'Falha ao salvar exibição.')}}
  async function purgePage(){if(!purgeTarget)return;setDeleting(true);setDeleteError('');try{await api(`pages/${purgeTarget.id}/purge`,'POST',{revision:purgeTarget.revision,confirmation:'EXCLUIR'});setPurgeTarget(null);await refresh();setNotice('Página excluída permanentemente.')}catch(error){setDeleteError(error instanceof Error?error.message:'Falha ao excluir.')}finally{setDeleting(false)}}
  const input = (label: string, field: keyof Draft, type = 'text') => <label>{label}<input type={type} value={String(draft?.[field] ?? '')} onChange={(event) => update({ [field]: event.target.value })} /></label>
  return <div className={`studio ${page ? 'is-building' : ''}`} onInputCapture={e=>{if(e.nativeEvent.composedPath().some(node=>node instanceof HTMLElement&&node.isContentEditable))setInlineDirty(true)}} onBlurCapture={e=>{if(e.nativeEvent.composedPath().some(node=>node instanceof HTMLElement&&node.isContentEditable))setInlineDirty(false)}}><header><div className="studio-wordmark"><Brand/><span>STUDIO DE CRIAÇÃO</span></div><WorkspaceLinks/>{pageNavigation}</header><main><div className="studio-heading"><div><p>HUBPAGES STUDIO</p><h1>{page ? draft?.name : 'Minhas páginas'}</h1><p>Sua ideia vira uma página pronta para vender. Comece por um modelo e personalize no seu ritmo.</p></div>{ready && !page && <div className="studio-create-actions"><button disabled={saving||publishing||leaving||undoing||mediaBusy} onClick={() => run(async () => { if (await flush()) select(await api<Page>('pages', 'POST', { name: 'Minha nova página', template: 'infancia_pt' })) })}>Criar minha página de vendas</button><button onClick={()=>setImportOpen(true)}>Importar página de vendas</button></div>}</div>{ready&&!page&&<section className="import-shortcut"><span aria-hidden="true">↗</span><div><h2>Seu próximo atalho: da página que você já tem à sua próxima venda.</h2><p>Importe uma página de vendas autorizada, personalize o layout, coloque seu link de checkout e conecte seu Pixel. Seu ponto de partida já existe. Agora ele ganha a sua identidade.</p><small>Sem programar · Original + cinco temas de cores · Sete passos até publicar</small></div><button onClick={()=>setImportOpen(true)}>Conhecer a importação →</button></section>}<p role="status" className="studio-notice">{notice} {saving && 'Salvando…'}</p>{!ready && <p><Link to="/conta">Entrar ou criar minha conta grátis</Link> · <Link to="/admin">Acesso do administrador existente</Link></p>}
    {ready && !page && <>{!showTrash&&<section className="wizard-guide wizard-welcome"><span className="wizard-eyebrow">DA SUA IDEIA AO PRIMEIRO CLIQUE</span><h2>Uma oferta. Seu estilo. Um link pronto para vender.</h2><ol className="wizard-flow"><li><span className="wizard-flow-number">1</span><div><strong>Comece com um modelo</strong><p>Clique em Criar minha página de vendas para começar com uma estrutura pronta.</p></div></li><li><span className="wizard-flow-number">2</span><div><strong>Conte a sua história</strong><p>Edite na própria página e conecte seu botão de compra.</p></div></li><li><span className="wizard-flow-number">3</span><div><strong>Revise e publique</strong><p>Confira a prévia e compartilhe o link com seu público.</p></div></li></ol></section>}<div className="studio-list-heading"><h2>{showTrash?'Lixeira':'Páginas Criadas no Studio'}</h2><div className="studio-list-tools"><div className="studio-view-switch" role="group" aria-label="Modo de exibição"><button aria-pressed={listView==='cards'} onClick={()=>void changeView('cards')}>▦ Cards</button><button aria-pressed={listView==='list'} onClick={()=>void changeView('list')}>☰ Lista</button></div><button onClick={()=>setShowTrash(!showTrash)}>{showTrash?'Voltar às páginas':`Lixeira (${trashed.length})`}</button><button onClick={()=>run(refresh)}>Atualizar lista</button></div></div>{showTrash&&<p>Restaure uma página ou exclua permanentemente. A exclusão definitiva pede confirmação.</p>}{(showTrash?trashed:pages).length===0&&<p>{showTrash?'A lixeira está vazia.':'Você ainda não criou páginas no Studio.'}</p>}<StudioPageList pages={showTrash?trashed:pages} trash={showTrash} view={listView} onEdit={item=>void run(async()=>select(await api<Page>(`pages/${item.id}`)))} onDuplicate={item=>void run(async()=>{select(await api<Page>(`pages/${item.id}/duplicate`,'POST'));await refresh()})} onDelete={item=>{setDeleteError('');setDeleteTarget(item)}} onRestore={item=>void run(async()=>{await api(`pages/${item.id}/untrash`,'POST',{revision:item.revision});await refresh();setNotice('Página restaurada como rascunho.')})} onPurge={item=>{setDeleteError('');setPurgeTarget(item)}} onMetrics={setMetricTarget} onDisconnect={async(item,domain)=>{await api(`pages/${item.id}/domains/${domain.id}/disconnect`,'POST');await refresh();setNotice('Domínio desvinculado. Ele já pode ser conectado a outra página.')}}/></>}
    {page && draft && <><div className="studio-workspace" inert={publishing||leaving||undoing||mediaBusy}><section className="studio-editor"><h2>{stepIds.indexOf(draft.step)+1}. {draft.imported&&draft.step===1?'Importação e temas':steps[stepIds.indexOf(draft.step)]}</h2><StepGuide imported={!!draft.imported} key={draft.step} open={guideOpen} onToggle={open=>void changeGuide(open)} step={draft.step} onStep={id=>update({step:id})}/>
      {draft.step === 1 && draft.imported&&<><label>Nome da página<input value={draft.name} onChange={event=>update({name:event.target.value})}/></label><ImportedModelPanel draft={draft} pageId={page.id} update={update} flush={flush}/></>}
      {draft.step === 1 && !draft.imported && <>{input('Nome da página', 'name')}<h3>Modelos disponíveis</h3><p>Seu modelo: {templates.find((t)=>t.id===draft.template)?.name || draft.template}. Explore as paletas, visualize a página completa e escolha a combinação que traduz sua oferta.</p><TemplateGallery templates={templates} selected={draft.template} busy={saving} selectedTheme={draft.colorTheme||'original'} onChoose={(template,colorTheme)=>void run(async()=>{if(template.id===draft.template){update({colorTheme});return}if(await flush())select(await api<Page>('pages','POST',{name:draft.name,template:template.id,colorTheme}))})}/></>}
      {(draft.step === 2 || draft.step === 3) && <StudioDesigner draft={draft} pageId={page.id} update={(change)=>{if(current.current?.id===page.id)update(change)}} flush={flush} notice={setNotice} assetVersion={assetRefresh} undo={()=>void undo()} undoAvailable={undoCount>0||inlineDirty} undoBusy={undoing||mediaBusy} prepareMediaUndo={prepareMediaUndo} onMediaBusy={setMediaBusy} assetChanged={()=>setAssetRefresh(value=>value+1)} />}

      {draft.step === 4 && <CheckoutSettings draft={draft} update={update}/>}
      {draft.step === 5 && <TrackingSettings key={page.id} id={page.id} draft={draft} update={update}/>}
      {draft.step === 6 && <><AddressSettings id={page.id} draft={draft} origin={publicOrigin} update={update}/>{customDomainsEnabled&&<CustomDomainWizard key={page.id} pageId={page.id} published={page.editorialStatus==='published'} onReview={()=>update({step:7})}/>}</>}
      {draft.step === 7 && <><a className="studio-preview-link" href={`/studio/preview/${page.id}`} target="_blank" rel="noopener noreferrer" onClick={(event)=>{event.preventDefault();void run(async()=>{if(await flush()) window.open(`/studio/preview/${page.id}`,'_blank','noopener,noreferrer')})}}>Abrir minha página em prévia ↗</a><div className="wizard-review-confirm"><label><input type="checkbox" checked={reviewed} disabled={!reviewCurrent||!!reviewCurrent.error} onChange={event=>void confirmReview(event.target.checked)}/>Conferi os textos, as imagens e os links da minha página.</label><p>{reviewed?'Revisão confirmada. Sua página está pronta para o próximo passo.':'Depois de conferir, marque esta opção. Novas edições pedem uma nova revisão.'}</p><button disabled={!reviewed} onClick={()=>update({step:8})}>Continuar para publicação →</button></div><div className="studio-viewports">{['desktop','tablet','mobile'].map((size)=><button key={size} onClick={()=>setViewport(size)} aria-pressed={viewport===size}>{{desktop:'Computador',tablet:'Tablet',mobile:'Celular'}[size]}</button>)}</div><ResponsiveReview pageId={page.id} draft={draft} viewport={viewport}/></>}
      {draft.step === 8 && <><div className="wizard-publication-status"><span className={`studio-page-status ${page.editorialStatus==='published'?'is-published':''}`}>{page.editorialStatus==='published'?'NO AR':'RASCUNHO'}</span><p>{page.editorialStatus==='published'?'Seu link está ativo. As próximas mudanças ficam no rascunho até você atualizar a publicação.':'Você está a um passo de colocar sua oferta no ar.'}</p></div><PublicationChanges changes={changes} publishedAt={reviewCurrent?.publishedAt||null} loading={!reviewCurrent} error={reviewCurrent?.error||''} active={page.editorialStatus==='published'}/>{reviewCurrent?.error&&<button onClick={()=>setAssetRefresh(value=>value+1)}>Tentar conferir novamente</button>}<div className={'wizard-launch'+(page.editorialStatus==='published'?' is-published':'')}><div><span className="wizard-eyebrow">SEU LINK PARA COMPARTILHAR</span>{customDomainsEnabled&&page.editorialStatus==='published'&&<PublishedDomainLinks pageId={page.id}/>}{draft.publicUrl?<a className="studio-address-link" href={draft.publicUrl} target="_blank" rel="noopener noreferrer">{draft.publicUrl} ↗</a>:<p>Escolha um nome para seu link antes de publicar.</p>}<button onClick={()=>update({step:6})}>{draft.publicUrl?'Alterar endereço':'Escolher endereço'} →</button></div><div className="wizard-launch-checks"><p>{stepReady[1]?'✓':'○'} Conteúdo preparado</p><p>{stepReady[2]?'✓':'○'} Link de compra conectado</p><p>{stepReady[4]?'✓':'○'} Endereço escolhido</p><button onClick={()=>update({step:7})}>{stepReady[5]?'✓ Revisão conferida':'○ Conferir a prévia'} →</button></div></div>{!freePublishing&&<p role="status">A publicação ainda não está disponível neste ambiente. Seu rascunho continua salvo e você pode usar a prévia.</p>}<div className="wizard-publish-actions">{page.editorialStatus==='published'&&<button className="studio-unpublish" disabled={publishing} onClick={()=>void publishPage(true)}>Retirar página do ar</button>}<button className="studio-publish" disabled={publishing||!freePublishing} onClick={()=>void publishPage()}>{publishing?'Preparando sua página…':page.editorialStatus==='published'?'Publicar alterações':'Publicar minha página'}</button>{page.editorialStatus==='published'&&page.publication&&<a href={page.publication.url} target="_blank" rel="noopener noreferrer">Visitar página no ar ↗</a>}</div><p className="wizard-environment-note">{production?'Sua página será publicada no domínio HubPages. Depois de publicar, copie o endereço para compartilhar.':'Ambiente de testes: o link será publicado no domínio de homologação. Depois de publicar, copie o endereço para compartilhar.'} Para continuar editando, volte ao Conteúdo.</p></>}
    </section></div></>}
    </main><WorkspaceFooter/>{importOpen&&<ImportPageDialog onClose={()=>setImportOpen(false)} onImported={async id=>{select(await api<Page>('pages/'+id));setImportOpen(false);setNotice('Página importada! Personalize o conteúdo e siga as sete etapas até publicar.')}}/>}{dialog&&<SystemDialog title={dialog.title} message={dialog.message} onClose={()=>setDialog(null)} actionLabel={dialog.recover?'Usar endereço disponível e voltar':dialog.step===7?'Ir para Revisão':dialog.step===4?'Ir para Checkout':dialog.step?'Corrigir endereço':'Tentar novamente'} onAction={dialog.recover?()=>void recoverAddressAndLeave():dialog.step?()=>{const step=dialog.step;setDialog(null);update({step})}:dialog.title==='Não foi possível salvar'?()=>{setDialog(null);void flush()}:undefined}/>}{metricTarget&&<StudioInsights pageId={metricTarget.id} name={metricTarget.name} onClose={()=>setMetricTarget(null)}/>} {purgeTarget&&<PurgePageDialog name={purgeTarget.name} busy={deleting} error={deleteError} onCancel={()=>setPurgeTarget(null)} onConfirm={()=>void purgePage()}/>} {deleteTarget&&<DeletePageDialog name={deleteTarget.name} busy={deleting} error={deleteError} onCancel={()=>setDeleteTarget(null)} onConfirm={()=>void deletePage()}/>}</div>
}
