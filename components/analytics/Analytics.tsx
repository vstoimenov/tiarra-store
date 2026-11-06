'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useEffect, useState } from 'react'
import styles from './Analytics.module.css'

type Consent = 'accepted' | 'essential'
const KEY = 'tiarra-consent-v1'

export function Analytics({googleAnalyticsId,googleTagManagerId,metaPixelId}:{googleAnalyticsId:string|null;googleTagManagerId:string|null;metaPixelId:string|null}) {
  const [consent, setConsent] = useState<Consent | null>(null)
  useEffect(() => { setConsent(window.localStorage.getItem(KEY) as Consent | null) }, [])
  function choose(value: Consent) {
    window.localStorage.setItem(KEY, value); setConsent(value); window.dispatchEvent(new Event('tiarra-consent-updated'))
    window.dataLayer = window.dataLayer ?? []
    window.dataLayer.push({ event: 'consent_update', analytics_storage: value === 'accepted' ? 'granted' : 'denied', ad_storage: value === 'accepted' ? 'granted' : 'denied' })
  }
  return <>
    <Script id="consent-default" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});`}</Script>
    {consent === 'accepted' && googleTagManagerId ? <Script id="google-tag-manager" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${googleTagManagerId}');`}</Script> : consent === 'accepted' && googleAnalyticsId ? <><Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" /><Script id="ga4" strategy="afterInteractive">{`gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'});gtag('js',new Date());gtag('config','${googleAnalyticsId}');`}</Script></> : null}
    {consent === 'accepted' && metaPixelId ? <><Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}</Script></> : null}
    {consent === null ? <aside className={styles.banner} aria-label="Настройки за бисквитки"><div><strong>Твоят избор за поверителност</strong><p>Използваме аналитични и рекламни бисквитки само с твое съгласие. Необходимите бисквитки поддържат количката и поръчката.</p><Link href="/biskvitki">Научи повече</Link></div><div className={styles.actions}><button type="button" className={styles.essential} onClick={() => choose('essential')}>Само необходими</button><button type="button" onClick={() => choose('accepted')}>Приемам</button></div></aside> : null}
  </>
}
