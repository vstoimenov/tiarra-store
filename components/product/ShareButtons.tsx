'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './ShareButtons.module.css'

// Port of tiarra-sections/04-product-share.html.
//  - Facebook: the phone's share menu when there is one, else the Facebook sharer in a popup.
//  - Messenger: opens the app on a phone; on a computer it copies the link.
//  - Instagram and TikTok have no web share address, so the share menu is the only way the
//    link gets there; without one the link is copied and a note says where to paste it.

type Network = 'facebook' | 'messenger' | 'instagram' | 'tiktok'

const TOAST_MS = 2600

const isMobile = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent)

async function copyLink(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // No clipboard API (or no permission): the old way, through a hidden field.
    const field = document.createElement('textarea')
    field.value = url
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    try {
      document.execCommand('copy')
    } catch {
      // Nothing more to try; the note below still tells the visitor what to do.
    }
    document.body.removeChild(field)
  }
}

export function ShareButtons() {
  const [toast, setToast] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function showToast(message: string) {
    setToast(message)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), TOAST_MS)
  }

  function systemShare(url: string, app: string) {
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => {})
      return
    }
    void copyLink(url).then(() => showToast(`Линкът е копиран — постави го в ${app}`))
  }

  function share(network: Network) {
    const url = window.location.href

    if (network === 'facebook') {
      if (isMobile() && navigator.share) {
        navigator.share({ title: document.title, url }).catch(() => {})
        return
      }
      const sharer = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
      // `noopener` in the features would make window.open answer null even when the popup opened, and
      // the null would look like a blocked popup: the visitor's own tab would follow to Facebook too.
      // So open it without, and cut the popup's link back to this page by hand.
      const popup = window.open(sharer, '_blank', 'width=600,height=640')
      if (popup) popup.opener = null
      // A blocked popup opens in the same tab instead.
      else window.location.href = sharer
    } else if (network === 'messenger') {
      if (isMobile()) window.location.href = `fb-messenger://share?link=${encodeURIComponent(url)}`
      else void copyLink(url).then(() => showToast('Линкът е копиран — постави го в Messenger'))
    } else {
      systemShare(url, network === 'instagram' ? 'Instagram' : 'TikTok')
    }
  }

  return (
    <div className={styles.share} data-testid="share">
      <span className={styles.label}>Сподели:</span>
      <div className={styles.row}>
        <button type="button" className={styles.btn} aria-label="Сподели във Facebook" onClick={() => share('facebook')}>
          <svg viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r="21" fill="#1877F2" />
            <path
              fill="#FFFFFF"
              d="M23.3 33v-9.3h3.1l.5-3.6h-3.6v-2.3c0-1 .3-1.8 1.8-1.8h1.9V12.8c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.6h-3.2v3.6h3.2V33h3.8z"
            />
          </svg>
        </button>

        <button type="button" className={styles.btn} aria-label="Отвори Messenger" onClick={() => share('messenger')}>
          <svg viewBox="0 0 42 42" aria-hidden="true">
            <defs>
              <linearGradient id="shareMessengerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#00B2FF" />
                <stop offset="1" stopColor="#006AFF" />
              </linearGradient>
            </defs>
            <circle cx="21" cy="21" r="21" fill="url(#shareMessengerGradient)" />
            <path
              fill="#FFFFFF"
              d="M21 10.5c-5.9 0-10.5 4.3-10.5 9.8 0 3.1 1.4 5.7 3.8 7.5v3.7l3.5-1.9c1 .3 2.1.4 3.2.4 5.9 0 10.5-4.3 10.5-9.8S26.9 10.5 21 10.5zm1.1 13.2-2.7-2.9-5.2 2.9 5.7-6.1 2.8 2.9 5.1-2.9-5.7 6.1z"
            />
          </svg>
        </button>

        <button type="button" className={styles.btn} aria-label="Отвори Instagram" onClick={() => share('instagram')}>
          <svg viewBox="0 0 42 42" aria-hidden="true">
            <defs>
              <radialGradient id="shareInstagramGradient" cx="0.3" cy="1.1" r="1.3">
                <stop offset="0" stopColor="#FFDD55" />
                <stop offset="0.35" stopColor="#FA7E1E" />
                <stop offset="0.62" stopColor="#D62976" />
                <stop offset="0.85" stopColor="#962FBF" />
                <stop offset="1" stopColor="#4F5BD5" />
              </radialGradient>
            </defs>
            <circle cx="21" cy="21" r="21" fill="url(#shareInstagramGradient)" />
            <rect x="12" y="12" width="18" height="18" rx="5.5" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
            <circle cx="21" cy="21" r="4.2" fill="none" stroke="#FFFFFF" strokeWidth="2.2" />
            <circle cx="26.4" cy="15.6" r="1.4" fill="#FFFFFF" />
          </svg>
        </button>

        <button type="button" className={styles.btn} aria-label="Отвори TikTok" onClick={() => share('tiktok')}>
          <svg viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r="21" fill="#010101" />
            <g transform="translate(9.5 9.5) scale(0.96)">
              <path
                fill="#25F4EE"
                d="M16.1 5.32A4.28 4.28 0 0 1 15.04 2.5h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.27a5.76 5.76 0 0 0-.77-.05 5.66 5.66 0 1 0 5.66 5.66V8.51a7.35 7.35 0 0 0 4.3 1.38V6.8a4.34 4.34 0 0 1-3.22-1.48z"
              />
              <path
                fill="#FE2C55"
                d="M17.1 6.32A4.28 4.28 0 0 1 16.04 3.5h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12v-3.16a5.76 5.76 0 0 0-.77-.05 5.66 5.66 0 1 0 5.66 5.66V9.51a7.35 7.35 0 0 0 4.3 1.38V7.8a4.34 4.34 0 0 1-3.22-1.48z"
              />
              <path
                fill="#FFFFFF"
                d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.77.12V9.77a5.76 5.76 0 0 0-.77-.05 5.66 5.66 0 1 0 5.66 5.66V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.34 4.34 0 0 1-3.22-1.48z"
              />
            </g>
          </svg>
        </button>
      </div>

      <div className={`${styles.toast} ${toast ? styles.show : ''}`} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  )
}
