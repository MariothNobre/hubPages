import {goldMoney} from '../lib/gold-plan'
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
  const [config, setConfig] = useState<{ termsVersion: string; registrationEnabled: boolean;environment:string;gold?:{enabled:boolean;plan:{amountCents:number}} } | null>(null)
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState(''), [confirmation, setConfirmation] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('Carregando acesso seguro…')
  useEffect(() => {
    let active = true
    Promise.all([customerApi<{ termsVersion: string; registrationEnabled: boolean;environment:string;gold?:{enabled:boolean;plan:{amountCents:number}} }>('config'), customerApi<{ authenticated: boolean; user?: Customer }>('session')]).then(([settings, session]) => {
      if (!active) return
      setConfig(settings)
      if (session.user) { setUser(session.user); setName(session.user.name); setEmail(session.user.email) }
      setMessage(settings.gold?.enabled?'Plano Gold anual no Sandbox. Seu cadastro reserva a conta; o pagamento confirmado libera o Studio.':settings.environment==='production'?'Crie, edite e publique suas páginas. Publicação gratuita temporariamente.':'Ambiente de homologação. Nenhuma cobrança será realizada.')
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
        setPassword(''); setConfirmation(''); navigate(mode==='register'&&config?.gold?.enabled?'/studio/assinatura':'/studio')
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha na solicitação.') }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true)
    try { await customerApi('logout', 'POST'); setUser(null); setPassword(''); window.location.replace('/entrar') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao sair.') }
    finally { setBusy(false) }
  }
  return <div className="studio"><header><Brand /><nav><Link to="/studio">Minhas páginas</Link><Link to="/admin">Acesso administrativo</Link></nav></header><main className="customer-account"><div className="studio-heading"><div><p>HUBPAGES · STUDIO</p><h1>{user ? 'Minha conta' : mode === 'register' ? config?.gold?.enabled?'Crie sua conta no Plano Gold':'Crie sua conta grátis' : 'Acesse suas páginas'}</h1><p>Crie e guarde seus rascunhos privados.</p></div></div><p role="status" className="studio-notice">{message}</p>{config && <section className="studio-editor">{!user && <div className="studio-viewports"><button disabled={busy} aria-pressed={mode === 'login'} onClick={() => { setMode('login'); setPassword(''); setConfirmation('') }}>Entrar</button><button disabled={busy || !config.registrationEnabled} aria-pressed={mode === 'register'} onClick={() => { setMode('register'); setPassword(''); setConfirmation('') }}>{config.gold?.enabled?'Criar conta Gold':'Criar conta grátis'}</button></div>}{!user&&config.gold?.enabled&&<p className="studio-notice"><strong>Plano Gold: {goldMoney(config.gold.plan.amountCents)} por ano.</strong> Cadastro e pagamento em três passos. Este é um teste no Sandbox, sem cobrança real.</p>}<form onSubmit={submit}>
    {(user || mode === 'register') && <label>Nome<input required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></label>}
    <label>E-mail<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>{user ? 'Senha atual para confirmar alterações' : 'Senha'}<input type="password" required minLength={12} maxLength={200} autoComplete={mode === 'register' && !user ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {user && <label>Nova senha (opcional)<input type="password" minLength={12} maxLength={200} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>}
    {(user || mode === 'register') && <label>{user ? 'Confirme a nova senha' : 'Confirme a senha'}<input type="password" required={!user || Boolean(newPassword)} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>}
    {!user && mode === 'register' && <label className="customer-terms"><input type="checkbox" required checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} /><span>Li e aceito as <Link to="/condicoes-homologacao" target="_blank">condições de uso e informações de privacidade</Link> ({config.termsVersion}).</span></label>}
    <button type="submit" disabled={busy}>{busy ? 'Aguarde…' : user ? 'Salvar minha conta' : mode === 'register' ? config.gold?.enabled?'Criar conta e continuar para ativação':'Criar conta e acessar Studio' : 'Entrar no Studio'}</button>
    </form>{user ? <><p>Seu e-mail ainda não foi verificado. O envio de mensagens será disponibilizado após configurar o serviço de e-mail.</p><button disabled={busy} onClick={logout}>Encerrar minha sessão</button><p><Link to="/studio">Continuar editando minhas páginas</Link></p></> : <p>A recuperação por e-mail ainda não está disponível no momento. O acesso administrativo existente permanece em <Link to="/admin">/admin</Link>.</p>}</section>}</main><WorkspaceFooter/></div>
}

export function HomologationTermsPage() {
  const [config,setConfig]=useState<{termsVersion:string;environment:string;gold?:{enabled:boolean;plan:{amountCents:number}}}|null>(null)
  useEffect(()=>{let active=true;fetch('/api/customer/config').then(r=>r.ok?r.json():null).then(value=>{if(active)setConfig(value)}).catch(()=>undefined);return()=>{active=false}},[])
  const production=config?.environment==='production'
  return <div className="studio"><header><Brand/><Link to="/conta">Voltar para minha conta</Link></header><main className="customer-account"><section className="studio-editor"><h1>{production?'Condições de uso da plataforma':'Condições de homologação'}</h1>{!config?<p role="status">Carregando as condições deste ambiente…</p>:<><p>Versão {config.termsVersion}. {production?'A HubPages permite criar, editar e publicar páginas de vendas. A publicação está temporariamente gratuita, sem cobrança automática.':config.gold?.enabled?'Este ambiente testa a assinatura anual do Plano Gold via Asaas Sandbox. Não movimenta dinheiro real.':'Este ambiente é destinado à validação da plataforma HubPages. Não realiza cobranças.'}</p><h2>Conta, rascunhos e publicação</h2><p>O cadastro cria um espaço privado para suas páginas. Informe dados corretos e use uma senha exclusiva. Guarde apenas conteúdos para os quais você tem direitos de uso. O editor e a prévia exigem acesso à sua conta; publicar torna o conteúdo acessível pelo link escolhido. Você pode retirar a página do ar no Studio.</p><h2>Informações utilizadas</h2><p>Nome, e-mail, senha protegida por hash, aceite desta versão, sessões e rascunhos são utilizados para operar a conta e o editor. Sua senha não é devolvida pelo sistema. O editor e a prévia não executam o Pixel de publicidade da página. Mídias atuais são mantidas por espaço, sem biblioteca de arquivos substituídos; documentos técnicos e backups seguem o funcionamento da plataforma.</p>{config.gold?.enabled&&<><h2>Plano Gold anual · Testes no Sandbox</h2><p>O acesso de novos cadastros ao Studio depende do pagamento anual de {goldMoney(config.gold.plan.amountCents)}. A cobrança é simulada no Asaas Sandbox, com renovação anual. O valor aceito na contratação é preservado nessa assinatura; mudanças de preço valem para novas contratações. Não há cobrança adicional por página neste fluxo. SuperAdmins, a conta isenta autorizada e acessos anteriores preservados não precisam pagar.</p><p>O pagamento precisa ser confirmado no Asaas para liberar um ano de acesso. Estornos ou contestações podem retirar o período correspondente. O cancelamento da recorrência preserva o período já pago até vencer. CPF/CNPJ de teste é encaminhado ao Asaas para preparar o pagamento; a HubPages não guarda esse documento nem recebe o número ou código de segurança de cartão.</p></>}<h2>Links de compra e recursos disponíveis</h2><p>Os botões de compra podem levar ao checkout configurado pelo responsável da página. A cobrança do produto ocorre nesse destino. {config.gold?.enabled?'A assinatura Gold é contratada separadamente dos links de compra dos produtos das páginas. Criar a conta não gera uma cobrança automaticamente: confira o valor e aceite as condições na tela de ativação.':'A cobrança pela publicação via Asaas ainda não está integrada: criar a conta não gera assinatura nem pagamento automático.'} Confirmação e recuperação por e-mail ainda dependem da configuração do serviço de mensagens.</p><p>Para questões sobre a conta ou seus dados, procure o responsável da HubPages pelo canal pelo qual recebeu acesso. As condições comerciais de uma futura cobrança serão apresentadas antes da contratação.</p></>}</section></main><WorkspaceFooter/></div>
}
