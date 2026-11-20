import { ResponsiveReview } from '../components/ResponsiveReview'
import { pendingChanges,reviewSignature,wizardReadiness } from '../../shared/studio-wizard.mjs'
import { WizardTimeline,StepGuide,PublicationChanges } from '../components/StudioWizard'
import { CheckoutSettings,AddressSettings,TrackingSettings } from '../components/StudioSettings'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import type { Draft } from '../components/studio-model'
import { StudioDesigner } from '../components/StudioDesigner'
import { withLegacyRoles } from '../components/legacy-template-model'
import { DeletePageDialog } from '../components/DeletePageDialog'
import '../studio.css'

interface Publication {id:string;revision:number;url:string;mode:string;publishedAt:string}
interface Page { id: string; revision: number; draft: Draft; editorialStatus:string; publication?:Publication; updatedAt: string; revisionCount:number }
interface Summary { id: string; name: string; revision:number; editorialStatus:string;publication?:Publication;step: number; updatedAt: string; revisions: number;pendingChangeCount:number }
const steps = ['Modelo', 'Conteúdo', 'Checkout', 'Rastreamento', 'Endereço', 'Revisão', 'Publicação']
const stepIds=[1,2,4,5,6,7,8]
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/platform/${path}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a solicitação.')
  return data
}

export function StudioPage() {
  const [pages, setPages] = useState<Summary[]>([])
  const [trashed,setTrashed]=useState<Summary[]>([])
  const [showTrash,setShowTrash]=useState(false)
  const [deleteTarget,setDeleteTarget]=useState<Summary|null>(null)
  const [deleting,setDeleting]=useState(false)
  const [deleteError,setDeleteError]=useState('')
  const [freePublishing,setFreePublishing]=useState(false)
  const [publishing,setPublishing]=useState(false)
  const [leaving,setLeaving]=useState(false)
  const transition=useRef(false)
  const [publicOrigin,setPublicOrigin]=useState('https://dev.hubpages.com.br')
  const [legacy, setLegacy] = useState<Array<{ slug: string; label: string; published: boolean }>>([])
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
  const pending = useRef<Promise<boolean> | null>(null)
  const refresh = useCallback(async () => {
    const result = await api<{ pages: Summary[]; legacyPages: typeof legacy;billing:{temporaryFreePublishing:boolean;publicOrigin:string} }>('pages')
    setFreePublishing(result.billing.temporaryFreePublishing)
    setPublicOrigin(result.billing.publicOrigin)
    setTrashed((await api<{pages:Summary[]}>('trash')).pages)
    setTemplates((await api<{templates:typeof templates}>('templates')).templates)
    setPages(result.pages); setLegacy(result.legacyPages); setReady(true)
  }, [])
  useEffect(() => { refresh().then(() => setNotice('Seus rascunhos ficam privados.')).catch((error) => setNotice(error.message)) }, [refresh])
  const flush = useCallback((): Promise<boolean> => {
    if (pending.current) return pending.current
    if (!current.current || JSON.stringify(current.current.draft) === saved.current) return Promise.resolve(true)
    const task = (async () => {
      setSaving(true)
      try {
        while (current.current && JSON.stringify(current.current.draft) !== saved.current) {
          const snapshot = {...current.current,draft:structuredClone(current.current.draft)}
          const result = await api<Page>(`pages/${snapshot.id}`, 'PUT', { revision: snapshot.revision, draft: snapshot.draft })
          saved.current = JSON.stringify(snapshot.draft)
          if (current.current?.id === snapshot.id) {
            current.current = { ...result, draft: current.current.draft }
            setPage(current.current)
          }
        }
        setNotice('Rascunho salvo.'); return true
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Falha ao salvar.'); return false }
      finally { pending.current = null; setSaving(false) }
    })()
    pending.current = task
    return task
  }, [])
  useEffect(() => {
    if (transition.current || !page || JSON.stringify(page.draft) === saved.current) return
    const timer = window.setTimeout(() => { void flush() }, 900)
    return () => window.clearTimeout(timer)
  }, [page, flush, publishing, leaving])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (current.current && JSON.stringify(current.current.draft) !== saved.current) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  function select(value: Page) { const result={...value,draft:withLegacyRoles({...value.draft,step:value.draft.step===3?2:value.draft.step,addressAuto:value.draft.publicUrl?value.draft.addressAuto:true})};current.current = result; saved.current = JSON.stringify(result.draft); setPage(result); setNotice('Rascunho carregado.') }
  function update(change: Partial<Draft> | ((draft: Draft) => Partial<Draft>)) {
    if (!current.current || transition.current) return
    current.current = { ...current.current, draft: { ...current.current.draft, ...(typeof change==='function' ? change(current.current.draft) : change) } }
    setPage(current.current); setNotice('Alterações pendentes…')
  }
  const suggestionId=page?.id,suggestionName=page?.draft.name,suggestionAutomatic=page?.draft.addressAuto===true
  useEffect(()=>{
    if(!suggestionId||!suggestionName||!suggestionAutomatic||publishing||leaving)return
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
  async function publishPage(unpublish=false) {
    if(transition.current)return
    transition.current=true;setPublishing(true)
    try{if(pending.current){const ok=await pending.current;if(!ok&&!unpublish)return}if((!unpublish&&!await flush())||!current.current)return;const item=structuredClone(current.current);const result=await api<Page>(`pages/${item.id}/${unpublish?'unpublish':'publish'}`,'POST',{revision:item.revision});if(current.current?.id===item.id){if(!unpublish)saved.current=JSON.stringify(item.draft);current.current={...result,draft:current.current.draft};setPage(current.current)}await refresh();setNotice(unpublish?'Página retirada do ar. O conteúdo está preservado como rascunho.':'Página publicada gratuitamente no DEV. Nenhuma cobrança foi criada.')}
    catch(error){setNotice(error instanceof Error?error.message:'Falha ao publicar.')}
    finally{transition.current=false;setPublishing(false)}
  }
  async function backToPages(){if(transition.current)return;transition.current=true;setLeaving(true);try{if(pending.current&&!await pending.current)return;if(!await flush())return;current.current=null;setPage(null);await refresh()}catch(error){setNotice(error instanceof Error?error.message:'Falha ao carregar páginas.')}finally{transition.current=false;setLeaving(false)}}
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
  const stepReady=draft?wizardReadiness(draft,publicOrigin,reviewed||!!reviewCurrent&&!reviewCurrent.error&&!!page?.publication&&changes.length===0,page?.editorialStatus==='published'&&!!reviewCurrent&&!reviewCurrent.error,changes.length):[]
  if(draft)stepReady[4]=stepReady[4]&&addressCheck?.pageId===page?.id&&addressCheck?.url===draft.publicUrl&&addressCheck.available
  const pageNavigation = page && draft && <div className="studio-page-navigation"><div className="wizard-header-actions"><button disabled={leaving||publishing} onClick={()=>void backToPages()}>← Minhas páginas</button><span>Crie. Personalize. Publique.</span><button disabled={publishing||leaving} onClick={()=>void flush()}>Salvar agora</button></div><WizardTimeline step={draft.step} ready={stepReady} pending={changes.length} busy={publishing||leaving} onStep={id=>update({step:id})}/></div>
  const input = (label: string, field: keyof Draft, type = 'text') => <label>{label}<input type={type} value={String(draft?.[field] ?? '')} onChange={(event) => update({ [field]: event.target.value })} /></label>
  return <div className={`studio ${page ? 'is-building' : ''}`}><header><Brand /><nav>{legacy.length > 0 ? <Link to="/admin">Painel legado e perfil</Link> : <Link to="/conta">Minha conta</Link>}<Link to="/">Site HubPages</Link></nav>{pageNavigation}</header><main><div className="studio-heading"><div><p>HUBPAGES STUDIO · HOMOLOGAÇÃO</p><h1>{page ? draft?.name : 'Minhas páginas'}</h1><p>Sua ideia vira uma página pronta para vender. Comece por um modelo e personalize no seu ritmo.</p></div>{ready && <button disabled={saving||publishing||leaving} onClick={() => run(async () => { if (await flush()) select(await api<Page>('pages', 'POST', { name: 'Minha nova página', template: 'infancia_pt' })) })}>Criar página grátis</button>}</div><p role="status" className="studio-notice">{notice} {saving && 'Salvando…'}</p>{!ready && <p><Link to="/conta">Entrar ou criar minha conta grátis</Link> · <Link to="/admin">Acesso do administrador existente</Link></p>}
    {ready && !page && <>{!showTrash&&<section className="wizard-guide wizard-welcome"><span className="wizard-eyebrow">DA SUA IDEIA AO PRIMEIRO CLIQUE</span><h2>Uma oferta. Seu estilo. Um link pronto para vender.</h2><ol className="wizard-flow"><li><span className="wizard-flow-number">1</span><div><strong>Comece com um modelo</strong><p>Clique em Criar página grátis para começar com uma estrutura pronta.</p></div></li><li><span className="wizard-flow-number">2</span><div><strong>Conte a sua história</strong><p>Edite na própria página e conecte seu botão de compra.</p></div></li><li><span className="wizard-flow-number">3</span><div><strong>Revise e publique</strong><p>Confira a prévia e compartilhe o link com seu público.</p></div></li></ol></section>}{legacy.length > 0 && <><h2>Publicações existentes</h2><p>As páginas atuais continuam no editor legado, com seus dados e integrações preservados.</p><div className="studio-grid">{legacy.map((item) => <article key={item.slug}><span>LEGADO · {item.published ? 'Publicada' : 'Rascunho'}</span><h3>{item.label}</h3><Link to="/admin">Gerenciar no painel atual</Link></article>)}</div></>}<div className="studio-list-heading"><h2>{showTrash?'Lixeira':'Páginas do Studio'}</h2><div><button onClick={()=>setShowTrash(!showTrash)}>{showTrash?'Voltar às páginas':`Lixeira (${trashed.length})`}</button><button onClick={()=>run(refresh)}>Atualizar lista</button></div></div>{showTrash&&<p>Páginas excluídas ficam preservadas e podem ser restauradas como rascunho.</p>}{(showTrash?trashed:pages).length===0&&<p>{showTrash?'A lixeira está vazia.':'Você ainda não criou páginas no Studio.'}</p>}<div className="studio-grid">{(showTrash?trashed:pages).map(item=><article key={item.id}><span className={`studio-page-status ${!showTrash&&item.editorialStatus==='published'?'is-published':''}`}>{showTrash?'NA LIXEIRA':item.editorialStatus==='published'?'PUBLICADA':'RASCUNHO'}</span><h3>{item.name}</h3><p>Última edição: {new Date(item.updatedAt).toLocaleString('pt-BR')}</p>{!showTrash&&item.editorialStatus==='published'&&item.publication&&<><a href={item.publication.url} target="_blank" rel="noopener noreferrer">Visitar página publicada</a>{item.pendingChangeCount>0&&<p className="studio-pending-publication">Alterações não publicadas</p>}</>}{showTrash?<button onClick={()=>run(async()=>{await api(`pages/${item.id}/untrash`,'POST',{revision:item.revision});await refresh();setNotice('Página restaurada como rascunho.')} )}>Restaurar página</button>:<div><button onClick={()=>run(async()=>select(await api<Page>(`pages/${item.id}`)))}>Editar página</button><button onClick={()=>run(async()=>{select(await api<Page>(`pages/${item.id}/duplicate`,'POST'));await refresh()})}>Duplicar</button><button className="studio-danger" onClick={()=>{setDeleteError('');setDeleteTarget(item)}}>Excluir página</button></div>}</article>)}</div></>}
    {page && draft && <><div className="studio-workspace" inert={publishing||leaving}><section className="studio-editor"><h2>{stepIds.indexOf(draft.step)+1}. {steps[stepIds.indexOf(draft.step)]}</h2><StepGuide key={draft.step} step={draft.step} onStep={id=>update({step:id})}/>
      {draft.step === 1 && <>{input('Nome da página', 'name')}<h3>Modelos disponíveis</h3><p>Seu modelo: {templates.find((t)=>t.id===draft.template)?.name || draft.template}. Quer experimentar outro? Criamos um rascunho separado para você comparar.</p><div className="studio-template-grid">{templates.map((template)=><article key={template.id}>{template.imageUrl && <img src={template.imageUrl} alt={template.name} />}<h3>{template.name}</h3><p>{template.description}</p><button disabled={saving} onClick={()=>run(async()=>{if(await flush()) select(await api<Page>('pages','POST',{name:template.name,template:template.id}))})}>Usar este modelo</button></article>)}</div></>}
      {(draft.step === 2 || draft.step === 3) && <StudioDesigner draft={draft} pageId={page.id} update={(change)=>{if(current.current?.id===page.id)update(change)}} flush={flush} notice={setNotice} assetChanged={()=>setAssetRefresh(value=>value+1)} />}

      {draft.step === 4 && <CheckoutSettings draft={draft} update={update}/>}
      {draft.step === 5 && <TrackingSettings key={page.id} id={page.id} draft={draft} update={update}/>}
      {draft.step === 6 && <AddressSettings id={page.id} draft={draft} origin={publicOrigin} update={update}/>}
      {draft.step === 7 && <><a className="studio-preview-link" href={`/studio/preview/${page.id}`} target="_blank" rel="noopener noreferrer" onClick={(event)=>{event.preventDefault();void run(async()=>{if(await flush()) window.open(`/studio/preview/${page.id}`,'_blank','noopener,noreferrer')})}}>Abrir minha página em prévia ↗</a><div className="wizard-review-confirm"><label><input type="checkbox" checked={reviewed} disabled={!reviewCurrent||!!reviewCurrent.error} onChange={event=>update({reviewedSignature:event.target.checked?signature:''})}/>Conferi os textos, as imagens e os links da minha página.</label><p>{reviewed?'Revisão confirmada. Sua página está pronta para o próximo passo.':'Depois de conferir, marque esta opção. Novas edições pedem uma nova revisão.'}</p><button disabled={!reviewed} onClick={()=>update({step:8})}>Continuar para publicação →</button></div><div className="studio-viewports">{['desktop','tablet','mobile'].map((size)=><button key={size} onClick={()=>setViewport(size)} aria-pressed={viewport===size}>{{desktop:'Computador',tablet:'Tablet',mobile:'Celular'}[size]}</button>)}</div><ResponsiveReview pageId={page.id} draft={draft} viewport={viewport}/></>}
      {draft.step === 8 && <><div className="wizard-publication-status"><span className={`studio-page-status ${page.editorialStatus==='published'?'is-published':''}`}>{page.editorialStatus==='published'?'NO AR':'RASCUNHO'}</span><p>{page.editorialStatus==='published'?'Seu link está ativo. As próximas mudanças ficam no rascunho até você atualizar a publicação.':'Você está a um passo de colocar sua oferta no ar.'}</p></div><PublicationChanges changes={changes} publishedAt={reviewCurrent?.publishedAt||null} loading={!reviewCurrent} error={reviewCurrent?.error||''} active={page.editorialStatus==='published'}/>{reviewCurrent?.error&&<button onClick={()=>setAssetRefresh(value=>value+1)}>Tentar conferir novamente</button>}<div className="wizard-launch"><div><span className="wizard-eyebrow">SEU LINK PARA COMPARTILHAR</span>{draft.publicUrl?<strong>{draft.publicUrl}</strong>:<p>Escolha um nome para seu link antes de publicar.</p>}<button onClick={()=>update({step:6})}>{draft.publicUrl?'Alterar endereço':'Escolher endereço'} →</button></div><div className="wizard-launch-checks"><p>{stepReady[1]?'✓':'○'} Conteúdo preparado</p><p>{stepReady[2]?'✓':'○'} Link de compra conectado</p><p>{stepReady[4]?'✓':'○'} Endereço escolhido</p><button onClick={()=>update({step:7})}>{stepReady[5]?'✓ Revisão conferida':'○ Conferir a prévia'} →</button></div></div>{!freePublishing&&<p role="status">A publicação ainda não está disponível neste ambiente. Seu rascunho continua salvo e você pode usar a prévia.</p>}<div className="wizard-publish-actions"><button className="wizard-primary" disabled={publishing||!freePublishing} onClick={()=>void publishPage()}>{publishing?'Preparando sua página…':page.editorialStatus==='published'?'Publicar alterações →':'Publicar minha página →'}</button>{page.editorialStatus==='published'&&page.publication&&<a href={page.publication.url} target="_blank" rel="noopener noreferrer">Visitar página no ar ↗</a>}{page.editorialStatus==='published'&&<button disabled={publishing} onClick={()=>void publishPage(true)}>Retirar página do ar</button>}</div><p className="wizard-environment-note">Ambiente de testes: o link será publicado no domínio de homologação. Depois de publicar, copie o endereço para compartilhar. Para continuar editando, volte ao Conteúdo.</p></>}
      <footer><button disabled={draft.step === 1} onClick={() => update({ step: stepIds[stepIds.indexOf(draft.step)-1] })}>Voltar</button><span>Etapa {stepIds.indexOf(draft.step)+1} de 7</span><button disabled={draft.step === 8} onClick={() => update({ step: stepIds[stepIds.indexOf(draft.step)+1] })}>Próxima etapa →</button></footer>
    </section></div></>}
    </main>{deleteTarget&&<DeletePageDialog name={deleteTarget.name} busy={deleting} error={deleteError} onCancel={()=>setDeleteTarget(null)} onConfirm={()=>void deletePage()}/>}</div>
}
