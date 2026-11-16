import { Link } from 'react-router-dom'
import { Brand } from '../components/Brand'

export function NotFound() {
  return (
    <main className="not-found">
      <Brand />
      <p className="section-kicker">Erro 404</p>
      <h1>Página não encontrada.</h1>
      <Link className="primary-button" to="/">
        Ir para o início
      </Link>
    </main>
  )
}
