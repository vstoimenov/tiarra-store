'use client'

import { Play } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import styles from './glassy-video-carousel.module.css'
import interaction from './glassy-video-interaction.module.css'

export interface GlassyVideoItem { youtubeId: string; name: string; stars: number }
const wrap = (value: number, length: number) => ((value % length) + length) % length

export function GlassyVideoCarousel({ items }: { items: GlassyVideoItem[] }) {
  const [index, setIndex] = useState(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [cardStep, setCardStep] = useState(280)
  const stage = useRef<HTMLDivElement>(null)
  const videoFrame = useRef<HTMLVideoElement>(null)
  const activeCard = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ x: number; y: number; horizontal: boolean } | null>(null)
  const suppressClickUntil = useRef(0)
  const activeIndex = items.length ? wrap(index, items.length) : 0

  useEffect(() => {
    if (!activeVideo) return
    const outside = (event: globalThis.PointerEvent) => { if (!activeCard.current?.contains(event.target as Node)) { videoFrame.current?.pause(); setPaused(true) } }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [activeVideo])

  useEffect(() => {
    const element = stage.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) { videoFrame.current?.pause(); setPaused(true) } }, { threshold: .2 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (reduced || activeVideo || dragging || items.length < 2) return
    const timer = window.setTimeout(() => setIndex(value => value + 1), 5000)
    return () => window.clearTimeout(timer)
  }, [activeVideo, dragging, index, items.length, reduced])

  useEffect(() => {
    const element = stage.current
    if (!element) return
    const update = () => setCardStep(Math.min(280, Math.max(200, element.clientWidth * .72)))
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  if (!items.length) return null

  const select = (next: number) => { setIndex(next); setDrag(0); setActiveVideo(null); setPaused(false) }
  const distance = (itemIndex: number) => {
    let value = itemIndex - activeIndex
    if (value > items.length / 2) value -= items.length
    if (value < -items.length / 2) value += items.length
    return value
  }
  const toggleVideo = (item: GlassyVideoItem) => {
    if (activeVideo !== item.youtubeId) { setActiveVideo(item.youtubeId); setPaused(false); return }
    if (videoFrame.current?.paused) videoFrame.current.play().then(() => setPaused(false)).catch(() => setPaused(true))
    else { videoFrame.current?.pause(); setPaused(true) }
  }
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    gesture.current = { x: event.clientX, y: event.clientY, horizontal: false }
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start) return
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    if (!start.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return }
    if (!start.horizontal && Math.abs(dx) > 8) { start.horizontal = true; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId) }
    if (start.horizontal) setDrag(Math.max(-1, Math.min(1, dx / cardStep)))
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current; gesture.current = null
    if (start?.horizontal) {
      if (Math.abs(event.clientX - start.x) > 45) select(index + (event.clientX < start.x ? 1 : -1))
      suppressClickUntil.current = performance.now() + 300
    }
    setDrag(0); setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className={`${styles.shell} ${interaction.compactShell}`} aria-label="Видео обратна връзка" aria-roledescription="carousel">
    <div className={styles.atmosphere} aria-hidden="true"/>
    <div ref={stage} className={styles.stage} data-dragging={dragging || undefined} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <div className={styles.floor} aria-hidden="true"/>
      {items.map((item, itemIndex) => {
        const delta = distance(itemIndex), offset = delta + drag, absolute = Math.abs(offset), selected = delta === 0
        const showingVideo = selected && activeVideo === item.youtubeId
        return <div ref={selected ? activeCard : undefined} key={item.youtubeId} className={styles.card} data-active={selected || undefined} style={{ transform: `translate3d(${offset * cardStep}px,0,${-Math.min(absolute, 2) * 145}px) rotateY(${-Math.max(-44, Math.min(44, offset * 31))}deg) scale(${1 - Math.min(absolute, 2) * .09})`, opacity: absolute > 2.2 ? 0 : 1, zIndex: 10 - Math.round(absolute) }}>
          <span className={styles.browser}><span><i/><i/><i/></span><b>TIARRA STORIES</b></span>
          <span className={styles.poster}>
            {showingVideo ? (
              <video ref={videoFrame} className={interaction.nativePlayer} src={`/reviews/review-${item.youtubeId}.mp4`} autoPlay playsInline preload="none" onPause={() => setPaused(true)} onPlay={() => setPaused(false)}/>
            ) : (
              <img src={`/reviews/review-${item.youtubeId}.jpg`} alt="" width={360} height={640} loading="lazy" draggable={false}/>
            )}
            <span className={styles.shade} style={{ opacity: showingVideo ? 0 : Math.min(absolute, 2) * .18 }}/>
            {selected && !showingVideo && <span className={styles.watch}><Play size={15} fill="currentColor"/> Гледай видеото</span>}
          </span>
          <span className={styles.cardInfo}><span><strong>Реална видео обратна връзка</strong><small>{'★'.repeat(item.stars)} · Клиент на Tiarra</small></span></span>
          <button type="button" className={interaction.hit} data-video={showingVideo || undefined} tabIndex={selected ? 0 : -1} aria-current={selected ? 'true' : undefined}
            aria-label={selected ? showingVideo ? paused ? 'Продължи видеото' : 'Постави видеото на пауза' : 'Пусни видео отзива' : `Избери видео отзив ${itemIndex + 1}`}
            onClick={() => { if (performance.now() < suppressClickUntil.current) return; if (selected) toggleVideo(item); else select(index + delta) }}/>
        </div>
      })}
    </div>
    <p className={interaction.hint}>Каруселът се движи автоматично · Натисни активното видео за пускане или пауза</p>
  </div>
}
