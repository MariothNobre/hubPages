import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { InfanciaAlemDasTelas } from '../pages/InfanciaAlemDasTelas'
import { InfanciaAlemDasTelasEs } from '../pages/InfanciaAlemDasTelasEs'
import { NotFound } from '../pages/NotFound'
import { HubPagesHome } from '../pages/HubPagesHome'

export function SalesPageRoute() {
  const location = useLocation()
  const [resolved, setResolved] = useState<{ path: string; slug: string } | null>(null)
  const slug = resolved?.path === location.pathname ? resolved.slug : null
  useEffect(() => {
    let active = true
    fetch(`/api/resolve-page?url=${encodeURIComponent(window.location.href)}`).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => { if (active) setResolved({ path: location.pathname, slug: data.slug }) }).catch(() => { if (active) setResolved({ path: location.pathname, slug: '' }) })
    return () => { active = false }
  }, [location.pathname])
  if (slug === null) return <p role="status">Carregando…</p>
  if (slug === 'infancia_alem_das_telas') return <InfanciaAlemDasTelas />
  if (slug === 'infancia_alem_das_telas_es') return <InfanciaAlemDasTelasEs />
  return location.pathname === '/' && window.location.hostname.endsWith('hubpages.com.br') ? <HubPagesHome /> : <NotFound />
}
