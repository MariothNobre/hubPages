import type { SalesPageContent } from '../content/siteContent'

export type SalesPageSlug = 'infancia_alem_das_telas' | 'infancia_alem_das_telas_es'

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(payload?.message ?? `Falha na requisição (${response.status}).`)
  }

  return response.json() as Promise<T>
}

export async function getSalesPageContent(pageSlug: SalesPageSlug = 'infancia_alem_das_telas'): Promise<SalesPageContent> {
  return jsonRequest<SalesPageContent>(`/api/pages/${pageSlug}`)
}

export interface MetaTrackingAdminConfig {
  metaConversionsApiToken: string
  metaConversionsApiConfigured: boolean
  metaTestEventCode: string
  clearMetaConversionsApiToken: boolean
}

export async function getAdminSalesPageContent(pageSlug: SalesPageSlug): Promise<SalesPageContent & Pick<MetaTrackingAdminConfig, 'metaConversionsApiConfigured' | 'metaTestEventCode'>> {
  return jsonRequest(`/api/admin/pages/${pageSlug}`)
}

export async function getAdminSession(): Promise<{ authenticated: boolean }> {
  return jsonRequest<{ authenticated: boolean }>('/api/admin/session')
}

export async function getAdminSetupStatus(): Promise<{ needsSetup: boolean }> {
  return jsonRequest<{ needsSetup: boolean }>('/api/admin/setup-status')
}

export async function activateAdmin(email: string, activationCode: string, password: string): Promise<void> {
  await jsonRequest('/api/admin/activate', {
    method: 'POST',
    body: JSON.stringify({ email, activationCode, password }),
  })
}

export async function loginAdmin(email: string, password: string): Promise<void> {
  await jsonRequest('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logoutAdmin(): Promise<void> {
  await jsonRequest('/api/admin/session', { method: 'DELETE' })
}

export async function saveSalesPageContent(pageSlug: SalesPageSlug, content: SalesPageContent, tracking: MetaTrackingAdminConfig): Promise<SalesPageContent & Pick<MetaTrackingAdminConfig, 'metaConversionsApiConfigured' | 'metaTestEventCode'>> {
  return jsonRequest(`/api/admin/pages/${pageSlug}`, {
    method: 'PUT',
    body: JSON.stringify({ ...content, ...tracking }),
  })
}

export interface PageAnalytics {
  slug: SalesPageSlug
  label: string
  visits: number
  online: number
}

export async function getAdminAnalytics(): Promise<{ pages: PageAnalytics[]; measuredAt: string }> {
  return jsonRequest('/api/admin/analytics')
}

export async function registerPageVisit(pageSlug: SalesPageSlug, visitorId: string, isNewVisit: boolean): Promise<void> {
  await jsonRequest('/api/analytics/visit', {
    method: 'POST',
    body: JSON.stringify({ pageSlug, visitorId, isNewVisit }),
  })
}
