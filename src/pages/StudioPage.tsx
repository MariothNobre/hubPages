import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import '../studio.css'

interface Block { title: string; body: string; imageUrl: string }
interface Draft { name: string; title: string; description: string; ctaLabel: string; checkoutUrl: string; publicUrl: string; imageUrl: string; metaPixelId: string; ga4Id: string; color: string; step: number; locale: 'pt-BR' | 'es'; template: string; blocks: Block[] }
interface Page { id: string; revision: number; draft: Draft; updatedAt: string; revisions: Array<{ version: number; at: string; reason: string }> }
interface Summary { id: string; name: string; step: number; updatedAt: string; revisions: number }
const steps = ['Modelo', 'Conteúdo', 'Identidade', 'Checkout', 'Rastreamento', 'Endereço', 'Revisão', 'Publicação']
async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/platform/${path}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a solicitação.')
  return data
}
function DraftPreview({ draft }: { draft: Draft }) {
  return <div className={`studio-preview template-${draft.template}`} style={{ '--draft-color': draft.color } as React.CSSProperties} lang={draft.locale}><span>PRÉVIA PRIVADA · RASCUNHO</span>{draft.imageUrl && <img src={draft.imageUrl} alt="Imagem principal do rascunho" />}<h1>{draft.title || 'Título da sua página'}</h1><p>{draft.description || 'Escreva a apresentação do seu produto.'}</p><button type="button" disabled>{draft.ctaLabel || 'Quero saber mais'}</button><small>O checkout está desativado nesta prévia.</small>{draft.blocks.map((block, index) => <section key={index}>{block.imageUrl && <img src={block.imageUrl} alt={block.title || 'Ilustração da seção'} />}<h2>{block.title}</h2><p>{block.body}</p></section>)}</div>
}

export function StudioPage() {
  const [pages, setPages] = useState<Summary[]>([])
  const [legacy, setLegacy] = useState<Array<{ slug: string; label: string; published: boolean }>>([])
  const [page, setPage] = useState<Page | null>(null)
  const [notice, setNotice] = useState('Carregando o Studio privado…')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewport, setViewport] = useState('desktop')
  const current = useRef<Page | null>(null)
  const saved = useRef('')
  const pending = useRef<Promise<boolean> | null>(null)
  const refresh = useCallback(async () => {
    const result = await api<{ pages: Summary[]; legacyPages: typeof legacy }>('pages')
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
  return <div className="studio"><header><Brand /><nav><Link to="/admin">Painel legado e perfil</Link><Link to="/">Site HubPages</Link></nav></header><main><div className="studio-heading"><div><p>HUBPAGES STUDIO · HOMOLOGAÇÃO</p><h1>{page ? draft?.name : 'Minhas páginas'}</h1><p>Crie gratuitamente. Pague somente para publicar cada página por 30 dias.</p></div>{ready && <button disabled={saving} onClick={() => run(async () => { if (await flush()) select(await api<Page>('pages', 'POST', { name: 'Minha nova página' })) })}>Criar página grátis</button>}</div><p role="status" className="studio-notice">{notice} {saving && 'Salvando…'}</p>{!ready && <Link to="/admin">Entrar com meu acesso existente</Link>}
    {ready && !page && <><h2>Publicações existentes</h2><p>As páginas atuais continuam no editor legado, com seus dados e integrações preservados.</p><div className="studio-grid">{legacy.map((item) => <article key={item.slug}><span>LEGADO · {item.published ? 'Publicada' : 'Rascunho'}</span><h3>{item.label}</h3><Link to="/admin">Gerenciar no painel atual</Link></article>)}</div><h2>Rascunhos do Studio</h2>{pages.length === 0 && <p>Você ainda não criou rascunhos no Studio.</p>}<div className="studio-grid">{pages.map((item) => <article key={item.id}><span>PRIVADO · ETAPA {item.step} DE 8</span><h3>{item.name}</h3><p>Última edição: {new Date(item.updatedAt).toLocaleString('pt-BR')}</p><button onClick={() => run(async () => select(await api<Page>(`pages/${item.id}`)))}>Editar página</button><button onClick={() => run(async () => { select(await api<Page>(`pages/${item.id}/duplicate`, 'POST')); await refresh() })}>Duplicar</button></article>)}</div></>}
    {page && draft && <><button disabled={saving} onClick={() => run(async () => { if (await flush()) { current.current = null; setPage(null); await refresh() } })}>Voltar para minhas páginas</button><div className="studio-workspace"><aside aria-label="Etapas da criação">{steps.map((name, index) => <button key={name} aria-current={draft.step === index + 1 ? 'step' : undefined} onClick={() => update({ step: index + 1 })}>{index + 1}. {name}</button>)}<button onClick={() => void flush()}>Salvar agora</button></aside><section className="studio-editor"><h2>{draft.step}. {steps[draft.step - 1]}</h2>
      {draft.step === 1 && <>{input('Nome da página', 'name')}<label>Modelo nativo<select value={draft.template} onChange={(event) => update({ template: event.target.value })}><option value="essencial">Essencial — oferta e benefícios</option><option value="colecao">Coleção — produto e seções</option></select></label><label>Idioma<select value={draft.locale} onChange={(event) => update({ locale: event.target.value as Draft['locale'] })}><option value="pt-BR">Português</option><option value="es">Español</option></select></label><p>Importação autorizada será disponibilizada após a verificação de domínio e o isolamento por conta.</p></>}
      {draft.step === 2 && <>{input('Título principal', 'title')}<label>Apresentação<textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} /></label>{input('Texto do botão', 'ctaLabel')}{draft.blocks.map((block, index) => <fieldset key={index}><legend>Seção {index + 1}</legend><label>Título<input value={block.title} onChange={(event) => update({ blocks: draft.blocks.map((b, i) => i === index ? { ...b, title: event.target.value } : b) })} /></label><label>Texto<textarea value={block.body} onChange={(event) => update({ blocks: draft.blocks.map((b, i) => i === index ? { ...b, body: event.target.value } : b) })} /></label><button disabled={index === 0} onClick={() => { const blocks = [...draft.blocks]; [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]]; update({ blocks }) }}>Mover para cima</button><button onClick={() => update({ blocks: draft.blocks.filter((_, i) => i !== index) })}>Remover do rascunho</button></fieldset>)}<button onClick={() => update({ blocks: [...draft.blocks, { title: '', body: '', imageUrl: '' }] })}>Adicionar seção</button></>}
      {draft.step === 3 && <>{input('Cor principal', 'color', 'color')}{input('URL HTTPS da imagem principal', 'imageUrl', 'url')}<p>Esta etapa aceita uma imagem já hospedada. Upload direto ainda não está disponível neste lote.</p></>}
      {draft.step === 4 && <>{input('Link de checkout ou afiliado', 'checkoutUrl', 'url')}<p>Hotmart, Kiwify, Eduzz ou outro checkout HTTPS. Seus parâmetros de afiliado serão preservados.</p></>}
      {draft.step === 5 && <>{input('ID do Meta Pixel', 'metaPixelId')}{input('Measurement ID GA4', 'ga4Id')}<p>Configurações são guardadas no rascunho; nenhum rastreamento é disparado na prévia privada.</p></>}
      {draft.step === 6 && <>{input('Endereço desejado', 'publicUrl', 'url')}<p>Cadastro de intenção. DNS, HTTPS e prova de controle serão necessários antes da publicação. Nenhuma rota pública é criada ao salvar.</p></>}
      {draft.step === 7 && <><div className="studio-viewports">{['desktop', 'tablet', 'mobile'].map((size) => <button key={size} onClick={() => setViewport(size)} aria-pressed={viewport === size}>{size}</button>)}</div><div className={`studio-preview-wrap is-${viewport}`}><DraftPreview draft={draft} /></div></>}
      {draft.step === 8 && <><h3>Seu rascunho está privado</h3><p>O provedor escolhido é Asaas. Preço, credenciais, Pix/cartão e confirmação por webhook ainda precisam ser configurados e validados.</p><p>Publicação bloqueada até pagamento confirmado pelo servidor. Nenhuma cobrança foi criada.</p><button onClick={() => run(async () => { if (await flush()) await api(`pages/${page.id}/publish`, 'POST') })}>Verificar disponibilidade de publicação</button></>}
      <footer><button disabled={draft.step === 1} onClick={() => update({ step: draft.step - 1 })}>Voltar</button><span>Etapa {draft.step} de 8</span><button disabled={draft.step === 8} onClick={() => update({ step: draft.step + 1 })}>Próximo</button></footer>
      <details><summary>Histórico e restauração ({page.revisions.length})</summary>{page.revisions.slice().reverse().map((revision) => <div className="studio-revision" key={revision.version}><span>Versão {revision.version} · {new Date(revision.at).toLocaleString('pt-BR')}</span><button disabled={saving || revision.version === page.revision} onClick={() => run(async () => { if (await flush()) select(await api<Page>(`pages/${page.id}/restore`, 'POST', { version: revision.version, revision: current.current?.revision })) })}>Restaurar como nova versão</button></div>)}</details>
    </section></div></>}
    </main></div>
}
