'use client'

import { useEffect, useRef, useState } from 'react'
import type { SectionOf } from '@/lib/sections/schema'
import { GlassyVideoCarousel } from '@/components/ui/glassy-video-carousel'
import styles from './VideoReviews.module.css'

/** `290+` becomes the number and a smaller `+` after it, as on the live page. */
function splitSuffix(value: string): [string, string] {
  return value.endsWith('+') ? [value.slice(0, -1), '+'] : [value, '']
}

function AnimatedValue({ value }: { value: string }) {
  const [number, suffix] = splitSuffix(value)
  const target = Number(number)
  const decimals = number.includes('.') ? number.split('.')[1].length : 0
  const [current, setCurrent] = useState(target)
  const element = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const node = element.current
    if (!node || !Number.isFinite(target)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let animation = 0
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = 8
      const duration = 1400
      const startedAt = performance.now()
      setCurrent(start)
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCurrent(start + (target - start) * eased)
        if (progress < 1) animation = requestAnimationFrame(tick)
      }
      animation = requestAnimationFrame(tick)
    }, { threshold: 0.45 })

    observer.observe(node)
    return () => { observer.disconnect(); cancelAnimationFrame(animation) }
  }, [target])

  return <p ref={element} className={styles.value} aria-label={value}>
    {current.toFixed(decimals)}
    {suffix && <span className={styles.suffix}>{suffix}</span>}
  </p>
}

/** A sideways row of video reviews (thumbnails until clicked) and the two big counters under it. */
export function VideoReviews({ section }: { section: SectionOf<'videoReviews'> }) {
  const { videos, stats } = section.data

  return (
    <section className={styles.reviews} data-section={section.id} aria-label="Видео отзиви">
      <header className={styles.heading}>
        <div><small>ИСТИНСКИ ИСТОРИИ</small><h2>Видео обратна връзка</h2><p>Виж какво споделят клиентите на Tiarra.</p></div>
      </header>
      {videos.length > 0 && <GlassyVideoCarousel items={videos} />}
      {stats.length > 0 && (
        <ul className={styles.stats}>
          {stats.map((stat) => {
            return (
              <li key={stat.label} className={styles.stat}>
                <AnimatedValue value={stat.value} />
                <p className={styles.label}>{stat.label}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
