'use client'

import { useEffect, useRef } from 'react'

// Refresh only while the admin is visible; iOS suspends timers in the background.
// Waking the app must fetch again, even if no new-order notification was received.
export function useAdminLiveRefresh(refresh: () => void) {
  const latest = useRef(refresh)
  useEffect(() => { latest.current = refresh }, [refresh])
  useEffect(() => {
    const run = () => { if (document.visibilityState !== 'hidden') latest.current() }
    const push = (event: MessageEvent) => { if (event.data?.type === 'TIARRA_NEW_ORDER') run() }
    const timer = window.setInterval(run, 30_000)
    document.addEventListener('visibilitychange', run)
    window.addEventListener('focus', run)
    window.addEventListener('online', run)
    window.addEventListener('tiarra-orders-changed', run)
    navigator.serviceWorker?.addEventListener('message', push)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', run)
      window.removeEventListener('focus', run)
      window.removeEventListener('online', run)
      window.removeEventListener('tiarra-orders-changed', run)
      navigator.serviceWorker?.removeEventListener('message', push)
    }
  }, [])
}
