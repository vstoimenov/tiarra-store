'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import styles from './Analytics.module.css'
import { captureMetaClick, flushMetaCommerceEvents } from '@/lib/analytics'
import { googleTagManagerScript, GOOGLE_CONSENT_GRANTED } from '@/lib/google-tags'

type Consent = 'accepted' | 'essential'
const KEY = 'tiarra-consent-v1'

export function Analytics({googleAnalyticsId,googleTagManagerId,metaPixelId}:{googleAnalyticsId:string|null;googleTagManagerId:string|null;metaPixelId:string|null}) {
  const [consent, setConsent] = useState<Consent | null>(null)
  const [metaReady, setMetaReady] = useState(false)
  const pathname = usePathname()
  const lastMetaPage = useRef('')
  useEffect(() => { try { const saved=window.localStorage.getItem(KEY);setConsent(saved==='accepted'||saved==='essential'?saved:null) } catch { setConsent(null) } }, [])
  useEffect(() => { if (consent === 'accepted') captureMetaClick() }, [consent])
  useEffect(() => {
    if (consent !== 'accepted' || !metaReady || !metaPixelId || !pathname) return
    const key = `${metaPixelId}:${pathname}`
    if (lastMetaPage.current !== key) {
      lastMetaPage.current = key
      try { window.fbq?.('track', 'PageView') } catch { /* Optional tracking. */ }
    }
    flushMetaCommerceEvents()
  }, [consent, metaReady, metaPixelId, pathname])
  function choose(value: Consent) {
    try { window.localStorage.setItem(KEY, value) } catch { /* Keep the current choice in memory. */ } setConsent(value); window.dispatchEvent(new Event('tiarra-consent-updated'))
    window.dataLayer = window.dataLayer ?? []
    const state = value === 'accepted' ? 'granted' : 'denied'
    const update = { analytics_storage: state, ad_storage: state, ad_user_data: state, ad_personalization: state }
    window.gtag?.('consent', 'update', update)
    window.dataLayer.push({ event: 'consent_update', ...update })
  }
  return <>
    {consent === 'accepted' && googleTagManagerId ? <Script id="google-tag-manager" strategy="afterInteractive">{googleTagManagerScript(googleTagManagerId)}</Script> : consent === 'accepted' && googleAnalyticsId ? <><Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" /><Script id="ga4" strategy="afterInteractive">{`${GOOGLE_CONSENT_GRANTED}gtag('js',new Date());gtag('config','${googleAnalyticsId}');`}</Script></> : null}
    {consent === 'accepted' && metaPixelId ? <><Script id="meta-pixel" strategy="afterInteractive" onReady={() => setMetaReady(true)}>{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');`}</Script></> : null}
    {consent === null ? <aside className={styles.banner} aria-label="Настройки за бисквитки"><div><strong>Твоят избор за поверителност</strong><p>Използваме аналитични и рекламни бисквитки само с твое съгласие. Необходимите бисквитки поддържат количката и поръчката.</p><Link href="/biskvitki">Научи повече</Link></div><div className={styles.actions}><button type="button" className={styles.essential} onClick={() => choose('essential')}>Само необходими</button><button type="button" onClick={() => choose('accepted')}>Приемам</button></div></aside> : null}
  </>
}
