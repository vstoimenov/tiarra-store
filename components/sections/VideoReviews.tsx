'use client'

import { useEffect, useRef, useState } from 'react'
import type { SectionOf } from '@/lib/sections/schema'
import player from './ReviewPlayer.module.css'
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
  const { stats } = section.data

  return (
    <section className={styles.reviews} data-section={section.id} aria-label="Видео отзиви">
      <header className={styles.heading}>
        <div><small>ИСТИНСКИ ИСТОРИИ</small><h2>Видео обратна връзка</h2><p>Виж какво споделят клиентите на Tiarra.</p></div>
      </header>
      <ReviewPlayer />
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

const reviews = ['/reviews/review-1.mp4', '/reviews/review-2.mp4', '/reviews/review-3.mp4']
function ReviewPlayer() {
  const container = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const [index, setIndex] = useState(0)
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const node = container.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) video.current?.pause() }, { threshold: .4 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) video.current?.pause() }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  return <div className={player.wrap} ref={container}>
    <div className={player.intro}><span>TIARRA STORIES</span><h3>Истински думи.<br/><em>Истинска грижа.</em></h3><p>Най-хубавите истории са тези, които споделяте с нас.</p><div className={player.stars}>★★★★★</div><small>ОБРАТНА ВРЪЗКА ОТ НАШИТЕ КЛИЕНТИ</small></div>
    <div className={player.frame}>
      <video key={index} ref={video} poster={`/reviews/review-${index+1}.jpg`} muted={muted} playsInline preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      <div className={player.top}>TIARRA <span> / ИСТИНСКИ ИСТОРИИ</span></div>
      <div className={player.controls}>
        <button type="button" onClick={() => { const node = video.current; if (!node) return; if (!node.getAttribute('src')) node.src = reviews[index]; if (node.paused) node.play().catch(() => {}); else node.pause() }}>{playing ? '❚❚ Пауза' : '▶ Пусни'}</button>
        <button type="button" onClick={() => setMuted(value => !value)}>{muted ? 'Включи звук' : 'Изключи звук'}</button>
      </div>
    </div>
    <div className={player.navigation}><button type="button" aria-label="Предишно видео" onClick={() => { setPlaying(false); setIndex((index + reviews.length - 1) % reviews.length) }}>←</button><span>{index + 1} / {reviews.length} · Видео отзив</span><button type="button" aria-label="Следващо видео" onClick={() => { setPlaying(false); setIndex((index + 1) % reviews.length) }}>→</button></div>
  </div>
}
