import type { SalesPageContent } from '../content/siteContent'

const PAGE_SLUG = 'infancia_alem_das_telas'

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

export async function getSalesPageContent(): Promise<SalesPageContent> {
  return jsonRequest<SalesPageContent>(`/api/pages/${PAGE_SLUG}`)
}

export interface MetaTrackingAdminConfig {
  metaConversionsApiToken: string
  metaConversionsApiConfigured: boolean
  metaTestEventCode: string
  clearMetaConversionsApiToken: boolean
}

export async function getAdminSalesPageContent(): Promise<SalesPageContent & Pick<MetaTrackingAdminConfig, 'metaConversionsApiConfigured' | 'metaTestEventCode'>> {
  return jsonRequest(`/api/admin/pages/${PAGE_SLUG}`)
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

export async function saveSalesPageContent(content: SalesPageContent, tracking: MetaTrackingAdminConfig): Promise<SalesPageContent & Pick<MetaTrackingAdminConfig, 'metaConversionsApiConfigured' | 'metaTestEventCode'>> {
  return jsonRequest(`/api/admin/pages/${PAGE_SLUG}`, {
    method: 'PUT',
    body: JSON.stringify({ ...content, ...tracking }),
  })
}
