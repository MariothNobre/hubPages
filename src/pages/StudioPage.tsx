import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { StudioCanvas } from '../components/StudioCanvas'
import type { Draft } from '../components/studio-model'
import { StudioDesigner } from '../components/StudioDesigner'
import '../studio.css'

interface Page { id: string; revision: number; draft: Draft; updatedAt: string; revisions: Array<{ version: number; at: string; reason: string }> }
interface Summary { id: string; name: string; step: number; updatedAt: string; revisions: number }
const steps = ['Modelo', 'Conteúdo', 'Identidade', 'Checkout', 'Rastreamento', 'Endereço', 'Revisão', 'Publicação']
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/platform/${path}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a solicitação.')
  return data
}

export function StudioPage() {
  const [pages, setPages] = useState<Summary[]>([])
  const [legacy, setLegacy] = useState<Array<{ slug: string; label: string; published: boolean }>>([])
  const [page, setPage] = useState<Page | null>(null)
  const [notice, setNotice] = useState('Carregando o Studio privado…')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewport, setViewport] = useState('desktop')
  const [templates, setTemplates] = useState<Array<{id:string;name:string;description:string;imageUrl:string}>>([])
  const current = useRef<Page | null>(null)
  const saved = useRef('')
  const pending = useRef<Promise<boolean> | null>(null)
  const refresh = useCallback(async () => {
    const result = await api<{ pages: Summary[]; legacyPages: typeof legacy }>('pages')
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
          const snapshot = structuredClone(current.current)
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
    if (!page || JSON.stringify(page.draft) === saved.current) return
    const timer = window.setTimeout(() => { void flush() }, 900)
    return () => window.clearTimeout(timer)
  }, [page, flush])
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (current.current && JSON.stringify(current.current.draft) !== saved.current) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [])
  function select(result: Page) { current.current = result; saved.current = JSON.stringify(result.draft); setPage(result); setNotice('Rascunho carregado.') }
  function update(change: Partial<Draft>) {
    if (!current.current) return
    current.current = { ...current.current, draft: { ...current.current.draft, ...change } }
    setPage(current.current); setNotice('Alterações pendentes…')
  }
  async function run(action: () => Promise<void>) { try { await action() } catch (error) { setNotice(error instanceof Error ? error.message : 'Falha na operação.') } }
  const draft = page?.draft
  const input = (label: string, field: keyof Draft, type = 'text') => <label>{label}<input type={type} value={String(draft?.[field] ?? '')} onChange={(event) => update({ [field]: event.target.value })} /></label>
  return <div className="studio"><header><Brand /><nav>{legacy.length > 0 ? <Link to="/admin">Painel legado e perfil</Link> : <Link to="/conta">Minha conta</Link>}<Link to="/">Site HubPages</Link></nav></header><main><div className="studio-heading"><div><p>HUBPAGES STUDIO · HOMOLOGAÇÃO</p><h1>{page ? draft?.name : 'Minhas páginas'}</h1><p>Crie gratuitamente. Pague somente para publicar cada página por 30 dias.</p></div>{ready && <button disabled={saving} onClick={() => run(async () => { if (await flush()) select(await api<Page>('pages', 'POST', { name: 'Minha nova página', template: 'infancia_pt' })) })}>Criar página grátis</button>}</div><p role="status" className="studio-notice">{notice} {saving && 'Salvando…'}</p>{!ready && <p><Link to="/conta">Entrar ou criar minha conta grátis</Link> · <Link to="/admin">Acesso do administrador existente</Link></p>}
    {ready && !page && <>{legacy.length > 0 && <><h2>Publicações existentes</h2><p>As páginas atuais continuam no editor legado, com seus dados e integrações preservados.</p><div className="studio-grid">{legacy.map((item) => <article key={item.slug}><span>LEGADO · {item.published ? 'Publicada' : 'Rascunho'}</span><h3>{item.label}</h3><Link to="/admin">Gerenciar no painel atual</Link></article>)}</div></>}<h2>Rascunhos do Studio</h2>{pages.length === 0 && <p>Você ainda não criou rascunhos no Studio.</p>}<div className="studio-grid">{pages.map((item) => <article key={item.id}><span>PRIVADO · ETAPA {item.step} DE 8</span><h3>{item.name}</h3><p>Última edição: {new Date(item.updatedAt).toLocaleString('pt-BR')}</p><button onClick={() => run(async () => select(await api<Page>(`pages/${item.id}`)))}>Editar página</button><button onClick={() => run(async () => { select(await api<Page>(`pages/${item.id}/duplicate`, 'POST')); await refresh() })}>Duplicar</button></article>)}</div></>}
    {page && draft && <><button disabled={saving} onClick={() => run(async () => { if (await flush()) { current.current = null; setPage(null); await refresh() } })}>Voltar para minhas páginas</button><div className="studio-workspace"><aside aria-label="Etapas da criação">{steps.map((name, index) => <button key={name} aria-current={draft.step === index + 1 ? 'step' : undefined} onClick={() => update({ step: index + 1 })}>{index + 1}. {name}</button>)}<button onClick={() => void flush()}>Salvar agora</button></aside><section className="studio-editor"><h2>{draft.step}. {steps[draft.step - 1]}</h2>
      {draft.step === 1 && <>{input('Nome da página', 'name')}<h3>Modelos disponíveis</h3><p>O modelo atual é {templates.find((t)=>t.id===draft.template)?.name || draft.template}. Escolher outro cria um novo rascunho e preserva este.</p><div className="studio-template-grid">{templates.map((template)=><article key={template.id}>{template.imageUrl && <img src={template.imageUrl} alt={template.name} />}<h3>{template.name}</h3><p>{template.description}</p><button disabled={saving} onClick={()=>run(async()=>{if(await flush()) select(await api<Page>('pages','POST',{name:template.name,template:template.id}))})}>Usar este modelo</button></article>)}</div><label>Idioma<select value={draft.locale} onChange={(event)=>update({locale:event.target.value as Draft['locale']})}><option value="pt-BR">Português</option><option value="es">Español</option></select></label></>}
      {(draft.step === 2 || draft.step === 3) && <StudioDesigner draft={draft} pageId={page.id} update={update} flush={flush} notice={setNotice} />}

      {draft.step === 4 && <>{input('Link de checkout ou afiliado', 'checkoutUrl', 'url')}<p>Hotmart, Kiwify, Eduzz ou outro checkout HTTPS. Seus parâmetros de afiliado serão preservados.</p></>}
      {draft.step === 5 && <>{input('ID do Meta Pixel', 'metaPixelId')}{input('Measurement ID GA4', 'ga4Id')}<p>Configurações são guardadas no rascunho; nenhum rastreamento é disparado na prévia privada.</p></>}
      {draft.step === 6 && <>{input('Endereço desejado', 'publicUrl', 'url')}<p>Cadastro de intenção. DNS, HTTPS e prova de controle serão necessários antes da publicação. Nenhuma rota pública é criada ao salvar.</p></>}
      {draft.step === 7 && <><a className="studio-preview-link" href={`/studio/preview/${page.id}`} target="_blank" rel="noopener noreferrer" onClick={(event)=>{event.preventDefault();void run(async()=>{if(await flush()) window.open(`/studio/preview/${page.id}`,'_blank','noopener,noreferrer')})}}>Abrir prévia completa com links ativos</a><div className="studio-viewports">{['desktop','tablet','mobile'].map((size)=><button key={size} onClick={()=>setViewport(size)} aria-pressed={viewport===size}>{size}</button>)}</div><div className={`studio-preview-wrap is-${viewport}`}><StudioCanvas draft={draft} interactive /></div></>}
      {draft.step === 8 && <><h3>Seu rascunho está privado</h3><p>O provedor escolhido é Asaas. Preço, credenciais, Pix/cartão e confirmação por webhook ainda precisam ser configurados e validados.</p><p>Publicação bloqueada até pagamento confirmado pelo servidor. Nenhuma cobrança foi criada.</p><button onClick={() => run(async () => { if (await flush()) await api(`pages/${page.id}/publish`, 'POST') })}>Verificar disponibilidade de publicação</button></>}
      <footer><button disabled={draft.step === 1} onClick={() => update({ step: draft.step - 1 })}>Voltar</button><span>Etapa {draft.step} de 8</span><button disabled={draft.step === 8} onClick={() => update({ step: draft.step + 1 })}>Próximo</button></footer>
      <details><summary>Histórico e restauração ({page.revisions.length})</summary>{page.revisions.slice().reverse().map((revision) => <div className="studio-revision" key={revision.version}><span>Versão {revision.version} · {new Date(revision.at).toLocaleString('pt-BR')}</span><button disabled={saving || revision.version === page.revision} onClick={() => run(async () => { if (await flush()) select(await api<Page>(`pages/${page.id}/restore`, 'POST', { version: revision.version, revision: current.current?.revision })) })}>Restaurar como nova versão</button></div>)}</details>
    </section></div></>}
    </main></div>
}
