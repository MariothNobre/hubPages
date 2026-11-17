import { useEffect, useRef, useState } from 'react'

const CONSENT_KEY = 'hubpages_meta_pixel_consent'

type Consent = 'granted' | 'denied' | null
type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  loaded: boolean
  version: string
  push: Fbq
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

function readConsent(): Consent {
  const stored = window.localStorage.getItem(CONSENT_KEY)
  return stored === 'granted' || stored === 'denied' ? stored : null
}

function cookieValue(name: string) {
  return document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) ?? ''
}

function initializePixel(pixelId: string, eventId: string) {
  if (!window.fbq) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue.push(args)
    } as Fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq

    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/pt_BR/fbevents.js'
    script.dataset.hubpagesMetaPixel = 'true'
    document.head.appendChild(script)
  }

  window.fbq?.('init', pixelId)
  window.fbq?.('track', 'PageView', {}, { eventID: eventId })

  window.setTimeout(() => {
    fetch('/api/meta/events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        eventSourceUrl: window.location.href,
        fbp: cookieValue('_fbp'),
        fbc: cookieValue('_fbc'),
      }),
    }).catch(() => undefined)
  }, 600)
}

interface MetaPixelProps {
  enabled: boolean
  pixelId: string
}

export function MetaPixel({ enabled, pixelId }: MetaPixelProps) {
  const validConfiguration = enabled && /^\d{5,30}$/.test(pixelId)
  const [consent, setConsent] = useState<Consent>(() => readConsent())
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const tracked = useRef(false)

  useEffect(() => {
    if (validConfiguration && consent === 'granted' && !tracked.current) {
      tracked.current = true
      initializePixel(pixelId, window.crypto.randomUUID())
    }
  }, [consent, pixelId, validConfiguration])

  if (!validConfiguration) return null

  const decide = (decision: Exclude<Consent, null>) => {
    window.localStorage.setItem(CONSENT_KEY, decision)
    setConsent(decision)
    setPreferencesOpen(false)
  }

  return (
    <>
      {(consent === null || preferencesOpen) && (
        <aside className="pixel-consent" role="dialog" aria-label="Preferências de privacidade" aria-live="polite">
          <div>
            <strong>Você escolhe como sua visita é medida</strong>
            <p>Com sua permissão, a HubPages usa o Meta Pixel nesta página para medir visitas e melhorar campanhas. Sem aceitar, nenhum rastreamento da Meta é carregado.</p>
          </div>
          <div className="pixel-consent__actions">
            <button type="button" className="pixel-consent__reject" onClick={() => decide('denied')}>Continuar sem rastreamento</button>
            <button type="button" className="pixel-consent__accept" onClick={() => decide('granted')}>Aceitar rastreamento</button>
          </div>
        </aside>
      )}
      {consent !== null && !preferencesOpen && (
        <button className="pixel-preferences" type="button" onClick={() => setPreferencesOpen(true)}>Preferências de privacidade</button>
      )}
    </>
  )
}
