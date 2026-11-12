'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './ProductsCarousel.module.css'

/**
 * A row of cards that scrolls sideways and snaps (swipe on a phone, arrows on a mouse).
 * The cards are server-rendered children, so every one of them is in the HTML; this only adds
 * the arrows. Until it mounts both look enabled, so the server and client markup match.
 */
export function ProductsCarousel({
  label,
  children,
  hasMore = false,
  onLoadMore,
}: {
  label: string
  children: ReactNode
  hasMore?: boolean
  onLoadMore?: () => void
}) {
  const track = useRef<HTMLUListElement>(null)
  const [atStart, setAtStart] = useState(false)
  const [atEnd, setAtEnd] = useState(false)
  const [inView, setInView] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const loadedWidth = useRef(0)

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    setAtStart(el.scrollLeft <= 2)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2)
    // Touch users have no arrow buttons. Append the next batch before the swipe reaches the end.
    if (hasMore && el.scrollLeft > 0 && el.scrollLeft + el.clientWidth * 2 >= el.scrollWidth && loadedWidth.current !== el.scrollWidth) {
      loadedWidth.current = el.scrollWidth
      onLoadMore?.()
    }
  }, [hasMore, onLoadMore])

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

  useEffect(() => {
    const el = track.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 })
    observer.observe(el)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReducedMotion(motion.matches)
    updateMotion()
    motion.addEventListener('change', updateMotion)
    return () => { observer.disconnect(); motion.removeEventListener('change', updateMotion) }
  }, [])

  useEffect(() => {
    if (interacting || reducedMotion || !inView) return
    const timer = window.setInterval(() => {
      const el = track.current
      if (!el || document.hidden || el.scrollWidth <= el.clientWidth + 2) return
      const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
      if (end && hasMore) { onLoadMore?.(); return }
      if (end) el.scrollTo({ left: 0, behavior: 'smooth' })
      else {
        const first = el.querySelector<HTMLElement>('li')
        const gap = parseFloat(getComputedStyle(el).columnGap) || 0
        el.scrollBy({ left: (first?.getBoundingClientRect().width ?? el.clientWidth * 0.9) + gap, behavior: 'smooth' })
      }
    }, 5000)
    return () => window.clearInterval(timer)
  }, [interacting, reducedMotion, inView, hasMore, onLoadMore])

  function scroll(direction: 1 | -1) {
    const el = track.current
    if (!el) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (direction === 1 && atEnd && hasMore) {
      onLoadMore?.()
      requestAnimationFrame(() => el.scrollBy({ left: el.clientWidth * 0.9, behavior: calm ? 'auto' : 'smooth' }))
      return
    }
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: calm ? 'auto' : 'smooth' })
  }

  return (
    <div className={styles.carousel} onPointerEnter={(event) => { if (event.pointerType === 'mouse') setInteracting(true) }} onPointerLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false) }} onTouchStart={() => setInteracting(true)} onTouchEnd={() => setInteracting(false)} onTouchCancel={() => setInteracting(false)}>
      <button type="button" className={`${styles.arrow} ${styles.prev}`} aria-label="Назад" disabled={atStart} onClick={() => scroll(-1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 5-7 7 7 7" />
        </svg>
      </button>
      <ul className={styles.track} ref={track} aria-label={label}>
        {children}
      </ul>
      <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Напред" disabled={atEnd && !hasMore} onClick={() => scroll(1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
