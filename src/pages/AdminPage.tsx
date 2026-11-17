import { FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { infanciaDraft, type SalesPageContent } from '../content/siteContent'
import {
  getAdminSession,
  getAdminSetupStatus,
  activateAdmin,
  getAdminSalesPageContent,
  loginAdmin,
  logoutAdmin,
  saveSalesPageContent,
} from '../lib/contentApi'

type ViewState = 'checking' | 'activate' | 'login' | 'editor'

export function AdminPage() {
  const [view, setView] = useState<ViewState>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [content, setContent] = useState<SalesPageContent>(infanciaDraft)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [apiConfigured, setApiConfigured] = useState(false)
  const [clearApiToken, setClearApiToken] = useState(false)
  const [testEventCode, setTestEventCode] = useState('')

  function applyAdminContent(saved: SalesPageContent & { metaConversionsApiConfigured?: boolean; metaTestEventCode?: string }) {
    setContent({ ...infanciaDraft, ...saved })
    setApiConfigured(saved.metaConversionsApiConfigured === true)
    setTestEventCode(saved.metaTestEventCode ?? '')
    setApiToken('')
    setClearApiToken(false)
  }

  useEffect(() => {
    getAdminSession()
      .then(async ({ authenticated }) => {
        if (!authenticated) {
          const { needsSetup } = await getAdminSetupStatus()
          setView(needsSetup ? 'activate' : 'login')
          return
        }

        const saved = await getAdminSalesPageContent().catch(() => infanciaDraft)
        applyAdminContent(saved)
        setView('editor')
      })
      .catch(() => {
        setError('O painel ainda não está conectado ao servidor de administração.')
        setView('login')
      })
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      await loginAdmin(email, password)
      const saved = await getAdminSalesPageContent().catch(() => infanciaDraft)
      applyAdminContent(saved)
      setPassword('')
      setView('editor')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Não foi possível entrar.')
    }
  }

  async function handleActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== passwordConfirmation) {
      setError('As senhas informadas não são iguais.')
      return
    }
    try {
      await activateAdmin(email, activationCode, password)
      setActivationCode('')
      setPassword('')
      setPasswordConfirmation('')
      setContent(infanciaDraft)
      setView('editor')
      setMessage('Acesso criado com sucesso. Agora você já pode editar a página.')
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : 'Não foi possível criar o acesso.')
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await saveSalesPageContent(content, {
        metaConversionsApiToken: apiToken,
        metaConversionsApiConfigured: apiConfigured,
        metaTestEventCode: testEventCode,
        clearMetaConversionsApiToken: clearApiToken,
      })
      applyAdminContent(saved)
      setMessage('Alterações salvas. A página pública já usa o conteúdo atualizado.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    await logoutAdmin().catch(() => undefined)
    setView('login')
    setMessage('')
  }

  function updateField<Key extends keyof SalesPageContent>(key: Key, value: SalesPageContent[Key]) {
    setContent((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Brand />
        <Link to="/">Voltar ao site</Link>
      </header>

      <main className="admin-shell">
        {view === 'checking' && <p className="admin-status">Verificando sessão segura…</p>}

        {view === 'activate' && (
          <section className="login-card">
            <p className="section-kicker">Primeiro acesso</p>
            <h1>Crie sua senha</h1>
            <p>Confirme o e-mail cadastrado e use o código de ativação de uso único.</p>
            <form onSubmit={handleActivation}>
              <label htmlFor="activation-email">E-mail cadastrado</label>
              <input id="activation-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
              <label htmlFor="activation-code">Código de ativação</label>
              <input id="activation-code" type="password" value={activationCode} onChange={(event) => setActivationCode(event.target.value)} autoComplete="one-time-code" required />
              <label htmlFor="new-password">Nova senha</label>
              <input id="new-password" type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required />
              <label htmlFor="password-confirmation">Confirmar nova senha</label>
              <input id="password-confirmation" type="password" minLength={12} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} autoComplete="new-password" required />
              <button type="submit">Criar acesso</button>
            </form>
            {error && <p className="form-error" role="alert">{error}</p>}
            <small>O código deixa de funcionar imediatamente após a ativação.</small>
          </section>
        )}

        {view === 'login' && (
          <section className="login-card">
            <p className="section-kicker">Área restrita</p>
            <h1>Gestão HubPages</h1>
            <p>Entre para editar os textos principais e o link do botão de venda.</p>
            <form onSubmit={handleLogin}>
              <label htmlFor="admin-email">E-mail</label>
              <input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required />
              <label htmlFor="admin-password">Senha de acesso</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <button type="submit">Entrar com segurança</button>
            </form>
            {error && <p className="form-error" role="alert">{error}</p>}
            <small>A senha nunca é armazenada no navegador nem no código do site.</small>
          </section>
        )}

        {view === 'editor' && (
          <section className="editor-card">
            <div className="editor-heading">
              <div>
                <p className="section-kicker">Página de vendas</p>
                <h1>Infância Além das Telas</h1>
                <p>Edite somente os campos comerciais liberados para gestão.</p>
              </div>
              <button className="logout-button" type="button" onClick={handleLogout}>Sair</button>
            </div>

            <form className="content-form" onSubmit={handleSave}>
              <label>
                Red Line
                <input value={content.redLine} onChange={(event) => updateField('redLine', event.target.value)} required />
              </label>
              <label>
                Linha de contexto
                <input value={content.eyebrow} onChange={(event) => updateField('eyebrow', event.target.value)} required />
              </label>
              <label className="form-wide">
                Título principal
                <input value={content.title} onChange={(event) => updateField('title', event.target.value)} required />
              </label>
              <label className="form-wide">
                Texto de abertura
                <textarea
                  rows={5}
                  value={content.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  required
                />
              </label>
              <label>
                Texto do botão
                <input value={content.ctaLabel} onChange={(event) => updateField('ctaLabel', event.target.value)} required />
              </label>
              <label>
                Link do botão de vendas
                <input
                  type="text"
                  value={content.ctaHref}
                  placeholder="https://pay.hotmart.com/..."
                  onChange={(event) => updateField('ctaHref', event.target.value)}
                  required
                />
              </label>
              <fieldset className="tracking-settings form-wide">
                <legend>Rastreamento da página de vendas</legend>
                <label className="tracking-toggle">
                  <input
                    type="checkbox"
                    checked={content.metaPixelEnabled}
                    onChange={(event) => updateField('metaPixelEnabled', event.target.checked)}
                  />
                  <span>
                    <strong>Ativar Meta Pixel</strong>
                    <small>Aplica-se somente à página “Infância Além das Telas”.</small>
                  </span>
                </label>
                <label>
                  ID do Meta Pixel
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="[0-9]*"
                    maxLength={30}
                    value={content.metaPixelId}
                    placeholder="Ex.: 123456789012345"
                    onChange={(event) => updateField('metaPixelId', event.target.value.replace(/\D/g, ''))}
                    required={content.metaPixelEnabled}
                  />
                </label>
                <p className="tracking-help">Informe somente o identificador numérico. O evento PageView será enviado após o visitante aceitar o rastreamento de marketing.</p>
                <div className="tracking-divider" />
                <label>
                  Token da API de Conversões (opcional)
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={apiToken}
                    placeholder={apiConfigured ? 'Token já configurado — deixe vazio para manter' : 'Cole o token de acesso da Meta'}
                    onChange={(event) => { setApiToken(event.target.value); setClearApiToken(false) }}
                  />
                </label>
                <label>
                  Código de evento de teste (opcional)
                  <input
                    type="text"
                    autoComplete="off"
                    maxLength={100}
                    value={testEventCode}
                    placeholder="Ex.: TEST12345"
                    onChange={(event) => setTestEventCode(event.target.value)}
                  />
                </label>
                {apiConfigured && (
                  <label className="tracking-toggle tracking-toggle--danger">
                    <input type="checkbox" checked={clearApiToken} onChange={(event) => setClearApiToken(event.target.checked)} />
                    <span><strong>Remover token salvo</strong><small>Desativa o envio pelo servidor após salvar.</small></span>
                  </label>
                )}
                <p className="tracking-help">O token é sigiloso: fica armazenado somente no volume privado do servidor e nunca é enviado à página pública. Com ele, o PageView também é enviado pela API e deduplicado pelo mesmo event_id.</p>
              </fieldset>
              <div className="form-actions form-wide">
                <a href="/infancia_alem_das_telas" target="_blank" rel="noreferrer">Visualizar página ↗</a>
                <button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button>
              </div>
            </form>
            {message && <p className="form-success" role="status">{message}</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
          </section>
        )}
      </main>
    </div>
  )
}
