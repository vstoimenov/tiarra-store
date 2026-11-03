'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './ProductsCarousel.module.css'

/**
 * A row of cards that scrolls sideways and snaps (swipe on a phone, arrows on a mouse).
 * The cards are server-rendered children, so every one of them is in the HTML; this only adds
 * the arrows. Until it mounts both look enabled, so the server and client markup match.
 */
export function ProductsCarousel({ label, children }: { label: string; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null)
  const [atStart, setAtStart] = useState(false)
  const [atEnd, setAtEnd] = useState(false)

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = track.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const resize = new ResizeObserver(update)
    resize.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      resize.disconnect()
    }
  }, [update])

  function scroll(direction: 1 | -1) {
    const el = track.current
    if (!el) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: calm ? 'auto' : 'smooth' })
  }

  return (
    <div className={styles.carousel}>
      <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Назад" disabled={atStart} onClick={() => scroll(-1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>
      <ul className={styles.track} ref={track} aria-label={label}>
        {children}
      </ul>
      <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Напред" disabled={atEnd} onClick={() => scroll(1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
