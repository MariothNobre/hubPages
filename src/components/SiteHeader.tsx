import { Link } from 'react-router-dom'
import type { NavigationItem } from '../content/siteContent'
import { Brand } from './Brand'

interface SiteHeaderProps {
  navigation?: NavigationItem[]
  compact?: boolean
}

export function SiteHeader({ navigation = [], compact = false }: SiteHeaderProps) {
  return (
    <header className={`site-header${compact ? ' site-header--compact' : ''}`}>
      <div className="header-inner">
        <Brand />
        {navigation.length > 0 && (
          <nav aria-label="Navegação principal">
            {navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
        )}
        <Link className="header-login" to="/admin">
          Entrar
        </Link>
        <Link className="header-action" to="/infancia_alem_das_telas">
          Primeiro lançamento <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </header>
  )
}
