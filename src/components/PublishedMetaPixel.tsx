import { useEffect, useRef } from 'react'
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

function cookieValue(name: string) {
  return document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) ?? ''
}

function initializePixel(pixelId: string, eventId: string, publicationId: string) {
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
  window.fbq?.('trackSingle', pixelId, 'PageView', {}, { eventID: eventId })

  window.setTimeout(() => {
    fetch('/api/public/meta/events', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        eventSourceUrl: window.location.href,
        publicationId,
        fbp: cookieValue('_fbp'),
        fbc: cookieValue('_fbc'),
      }),
    }).catch(() => undefined)
  }, 600)
}

interface PublishedMetaPixelProps {
  enabled: boolean
  pixelId: string
  publicationId: string
}

export function PublishedMetaPixel({ enabled, pixelId, publicationId }: PublishedMetaPixelProps) {
  const validConfiguration = enabled && /^\d{5,30}$/.test(pixelId)
  const tracked = useRef(false)

  useEffect(() => {
    if (validConfiguration && !tracked.current) {
      tracked.current = true
      initializePixel(pixelId, window.crypto.randomUUID(), publicationId)
    }
  }, [publicationId, pixelId, validConfiguration])

  return null
}
