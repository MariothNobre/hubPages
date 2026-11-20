import { WorkspaceFooter } from '../components/WorkspaceChrome'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import '../studio.css'
interface Customer { id: string; accountId: string; name: string; email: string; emailVerified: boolean }
async function customerApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`/api/customer/${path}`, { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Não foi possível concluir a solicitação.')
  return data
}
export function CustomerAccountPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [user, setUser] = useState<Customer | null>(null)
  const [config, setConfig] = useState<{ termsVersion: string; registrationEnabled: boolean } | null>(null)
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState(''), [confirmation, setConfirmation] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('Carregando acesso seguro…')
  useEffect(() => {
    let active = true
    Promise.all([customerApi<{ termsVersion: string; registrationEnabled: boolean }>('config'), customerApi<{ authenticated: boolean; user?: Customer }>('session')]).then(([settings, session]) => {
      if (!active) return
      setConfig(settings)
      if (session.user) { setUser(session.user); setName(session.user.name); setEmail(session.user.email) }
      setMessage('Ambiente de homologação. Nenhuma cobrança será realizada.')
    }).catch((error) => { if (active) setMessage(error.message) })
    return () => { active = false }
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true)
    try {
      if (user) {
        if (newPassword !== confirmation) throw new Error('As novas senhas devem ser iguais.')
        const result = await customerApi<{ user: Customer; requiresLogin: boolean }>('profile', 'PUT', { name, email, currentPassword: password, newPassword })
        setPassword(''); setNewPassword(''); setConfirmation('')
        if (result.requiresLogin) { setUser(null); setMessage('Senha atualizada. Todas as sessões anteriores foram encerradas. Entre novamente.') }
        else { setUser(result.user); setMessage('Perfil atualizado.') }
      } else {
        if (mode === 'register' && password !== confirmation) throw new Error('As senhas devem ser iguais.')
        await customerApi(mode, 'POST', mode === 'register' ? { name, email, password, acceptTerms, termsVersion: config?.termsVersion } : { email, password })
        setPassword(''); setConfirmation(''); navigate('/studio')
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha na solicitação.') }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true)
    try { await customerApi('logout', 'POST'); setUser(null); setPassword(''); setMessage('Sessão encerrada.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao sair.') }
    finally { setBusy(false) }
  }
  return <div className="studio"><header><Brand /><nav><Link to="/studio">Minhas páginas</Link><Link to="/admin">Acesso administrativo</Link></nav></header><main className="customer-account"><div className="studio-heading"><div><p>HUBPAGES · ACESSO DE HOMOLOGAÇÃO</p><h1>{user ? 'Minha conta' : mode === 'register' ? 'Crie sua conta grátis' : 'Acesse suas páginas'}</h1><p>Crie e guarde seus rascunhos privados.</p></div></div><p role="status" className="studio-notice">{message}</p>{config && <section className="studio-editor">{!user && <div className="studio-viewports"><button disabled={busy} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setPassword(''); setConfirmation('') }}>Entrar</button><button disabled={busy || !config.registrationEnabled} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setPassword(''); setConfirmation('') }}>Criar conta grátis</button></div>}<form onSubmit={submit}>
    {(user || mode === 'register') && <label>Nome<input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>}
    <label>E-mail<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>{user ? 'Senha atual para confirmar alterações' : 'Senha'}<input type="password" required minLength={12} maxLength={200} autoComplete={mode === 'register' && !user ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {user && <label>Nova senha (opcional)<input type="password" minLength={12} maxLength={200} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>}
    {(user || mode === 'register') && <label>{user ? 'Confirme a nova senha' : 'Confirme a senha'}<input type="password" required={!user || Boolean(newPassword)} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>}
    {!user && mode === 'register' && <label className="customer-terms"><input type="checkbox" required checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} /><span>Li e aceito as <Link to="/condicoes-homologacao" target="_blank">condições de homologação e informações de privacidade</Link> ({config.termsVersion}).</span></label>}
    <button type="submit" disabled={busy}>{busy ? 'Aguarde…' : user ? 'Salvar minha conta' : mode === 'register' ? 'Criar conta e acessar Studio' : 'Entrar no Studio'}</button>
    </form>{user ? <><p>Seu e-mail ainda não foi verificado. O envio de mensagens será disponibilizado após configurar o serviço de e-mail.</p><button disabled={busy} onClick={logout}>Encerrar minha sessão</button><p><Link to="/studio">Continuar editando minhas páginas</Link></p></> : <p>A recuperação por e-mail ainda não está disponível nesta homologação. O acesso administrativo existente permanece em <Link to="/admin">/admin</Link>.</p>}</section>}</main><WorkspaceFooter/></div>
}

export function HomologationTermsPage() {
  return <div className="studio"><header><Brand /><Link to="/conta">Voltar para minha conta</Link></header><main className="customer-account"><section className="studio-editor"><h1>Condições de homologação</h1><p>Versão homologacao-2026-11-19. Este ambiente é destinado à validação da plataforma HubPages. Não realiza cobranças nem publica novos rascunhos comercialmente.</p><h2>Conta e rascunhos</h2><p>O cadastro cria um espaço privado para seus rascunhos. Informe dados corretos e use uma senha exclusiva. Guarde apenas conteúdos para os quais você tem direitos de uso. Não insira informações pessoais sensíveis nos rascunhos de teste.</p><h2>Informações tratadas</h2><p>Armazenamos nome, e-mail, senha protegida por hash, aceite desta versão, sessões e rascunhos com histórico para operar o acesso e o editor. Sua senha não é devolvida pelo sistema. Rascunhos não têm endereço público e a prévia não executa pixels de publicidade.</p><h2>Homologação e lançamento</h2><p>Edição e salvamento estão disponíveis para testes. Publicação paga, confirmação de e-mail e recuperação por mensagem ainda não estão ativas. Não há assinatura ou compromisso de pagamento ao criar esta conta de homologação. Os termos comerciais e a política definitiva serão disponibilizados para aprovação antes do lançamento.</p><p>Para questões sobre os dados da conta, procure o responsável da HubPages pelo canal pelo qual recebeu o acesso de homologação. Gestão de retenção e solicitações automatizadas ainda serão disponibilizadas.</p></section></main><WorkspaceFooter/></div>
}
