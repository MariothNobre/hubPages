import { useEffect, useState, type FormEvent } from 'react'

export function AdminProfile() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { fetch('/api/admin/profile').then((r) => r.ok ? r.json() : Promise.reject()).then((p) => { setName(p.name); setEmail(p.email) }).catch(() => setMessage('Não foi possível carregar o perfil.')) }, [])
  async function save(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmation) { setMessage('As novas senhas devem ser iguais.'); return }
    try {
      const response = await fetch('/api/admin/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, currentPassword, newPassword }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message)
      setCurrentPassword(''); setNewPassword(''); setConfirmation(''); setMessage('Perfil atualizado.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao salvar perfil.') }
  }
  return <details><summary>Meu perfil e segurança</summary><form className="content-form" onSubmit={save}><label>Nome<input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label><label>E-mail de acesso<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Senha atual<input type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label><label>Nova senha (opcional)<input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label><label>Confirme a nova senha<input type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label><button type="submit">Salvar perfil</button><p role="status">{message}</p></form></details>
}
