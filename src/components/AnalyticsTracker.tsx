import { useEffect } from 'react'
import { registerPageVisit, type SalesPageSlug } from '../lib/contentApi'

function getVisitorId() {
  const key = 'hubpages_visitor_id'
  const current = window.localStorage.getItem(key)
  if (current) return current
  const created = window.crypto.randomUUID()
  window.localStorage.setItem(key, created)
  return created
}

export function AnalyticsTracker({ pageSlug }: { pageSlug: SalesPageSlug }) {
  useEffect(() => {
    const visitorId = getVisitorId()
    registerPageVisit(pageSlug, visitorId, true).catch(() => undefined)
    const heartbeat = window.setInterval(() => {
      registerPageVisit(pageSlug, visitorId, false).catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(heartbeat)
  }, [pageSlug])

  return null
}
