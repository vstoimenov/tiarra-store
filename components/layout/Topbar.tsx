'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import styles from './Topbar.module.css'

// Ported from tiarra-sections/06-topbar.html: same timings, arrows, swipe and font shrink.
const ROTATE_MS = 4500
const FADE_MS = 300
const MIN_FONT_PX = 10
const SWIPE_PX = 40

/** The message bar: one line, rotating every 4.5 s, with arrows and swipe. */
export function Topbar({ messages }: { messages: string[] }) {
  const count = messages.length
  const [shown, setShown] = useState(0)
  const [fading, setFading] = useState(false)
  // The index the next render will show; it moves at once, `shown` follows after the fade.
  const target = useRef(0)
  const textRef = useRef<HTMLDivElement>(null)
  const rotation = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const fade = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const touchStartX = useRef<number | null>(null)
  const reducedMotion = useRef(false)
  const canHover = useRef(false)

  const stop = useCallback(() => {
    clearInterval(rotation.current)
    rotation.current = undefined
  }, [])

  const go = useCallback(
    (step: number) => {
      target.current = (target.current + step + count) % count
      if (reducedMotion.current) {
        setShown(target.current)
        return
      }
      setFading(true)
      clearTimeout(fade.current)
      fade.current = setTimeout(() => {
        setShown(target.current)
        setFading(false)
      }, FADE_MS)
    },
    [count],
  )

  const start = useCallback(() => {
    if (count < 2) return
    stop()
    rotation.current = setInterval(() => go(1), ROTATE_MS)
  }, [count, go, stop])

  /** Shrinks the font in 0.5px steps, down to 10px, until the message fits on one line. */
  const fit = useCallback(() => {
    const el = textRef.current
    if (!el) return
    el.style.removeProperty('--topbar-fs')
    if (!el.clientWidth) return
    let size = parseFloat(getComputedStyle(el).fontSize)
    while (el.scrollWidth > el.clientWidth + 1 && size > MIN_FONT_PX) {
      size -= 0.5
      el.style.setProperty('--topbar-fs', `${size}px`)
    }
  }, [])

  const text = messages[shown] ?? messages[0]

  // Before paint, so a longer message never shows overflowing for a frame.
  useLayoutEffect(fit, [fit, text])

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    canHover.current = window.matchMedia('(hover: hover)').matches
    start()
    window.addEventListener('resize', fit)
    // The web font changes the text width, so measure again once it is in.
    void document.fonts?.ready.then(fit)
    return () => {
      stop()
      clearTimeout(fade.current)
      window.removeEventListener('resize', fit)
    }
  }, [fit, start, stop])

  if (count === 0) return null

  const step = (direction: 1 | -1) => {
    go(direction)
    start()
  }

  return (
    <div
      className={styles.bar}
      onMouseEnter={() => canHover.current && stop()}
      onMouseLeave={() => canHover.current && start()}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const from = touchStartX.current
        touchStartX.current = null
        if (from === null) return
        const delta = (e.changedTouches[0]?.clientX ?? from) - from
        if (Math.abs(delta) > SWIPE_PX) step(delta < 0 ? 1 : -1)
      }}
    >
      {count > 1 && (
        <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Предишно" onClick={() => step(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      <div
        ref={textRef}
        className={fading ? `${styles.msg} ${styles.fade}` : styles.msg}
        role="status"
        aria-live="polite"
        data-testid="topbar-message"
      >
        {text}
      </div>
      {count > 1 && (
        <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Следващо" onClick={() => step(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
