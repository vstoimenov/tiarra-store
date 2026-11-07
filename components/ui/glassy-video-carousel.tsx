'use client'

import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'
import styles from './glassy-video-carousel.module.css'
import playerStyles from './glassy-video-player.module.css'

export interface GlassyVideoItem {
  youtubeId: string
  name: string
  stars: number
}

const wrap = (value: number, length: number) => ((value % length) + length) % length

export function GlassyVideoCarousel({ items }: { items: GlassyVideoItem[] }) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<GlassyVideoItem | null>(null)
  const [reduced, setReduced] = useState(false)
  const gesture = useRef<{ x: number; y: number; horizontal: boolean } | null>(null)
  const suppressClickUntil = useRef(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const activeIndex = items.length ? wrap(index, items.length) : 0
  const active = items[activeIndex]

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update(); media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!playing || reduced || preview || dragging || items.length < 2) return
    const timer = window.setTimeout(() => setIndex(value => value + 1), 5500)
    return () => window.clearTimeout(timer)
  }, [dragging, index, items.length, playing, preview, reduced])

  useEffect(() => {
    if (preview && dialog.current && !dialog.current.open) dialog.current.showModal()
    if (!preview && dialog.current?.open) dialog.current.close()
  }, [preview])

  if (!active) return null

  const select = (next: number) => { setIndex(next); setDrag(0) }
  const distance = (itemIndex: number) => {
    let value = itemIndex - activeIndex
    if (value > items.length / 2) value -= items.length
    if (value < -items.length / 2) value += items.length
    return value
  }
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    gesture.current = { x: event.clientX, y: event.clientY, horizontal: false }
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!start.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { gesture.current = null; return }
    if (!start.horizontal && Math.abs(dx) > 8) { start.horizontal = true; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId) }
    if (start.horizontal) setDrag(Math.max(-1, Math.min(1, dx / 300)))
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    gesture.current = null
    if (start?.horizontal) {
      if (Math.abs(event.clientX - start.x) > 45) setIndex(value => value + (event.clientX < start.x ? 1 : -1))
      suppressClickUntil.current = performance.now() + 300
    }
    setDrag(0); setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return <div className={styles.shell} aria-label="Видео обратна връзка" aria-roledescription="carousel">
    <div className={styles.atmosphere} aria-hidden="true"/>
    <div className={styles.stage} data-dragging={dragging || undefined} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
      <div className={styles.floor} aria-hidden="true"/>
      {items.map((item, itemIndex) => {
        const delta = distance(itemIndex)
        const offset = delta + drag
        const absolute = Math.abs(offset)
        const selected = delta === 0
        return <button key={item.youtubeId} type="button" className={styles.card} data-active={selected || undefined} tabIndex={selected ? 0 : -1}
          aria-label={selected ? `Пусни видео отзива${item.name ? ` на ${item.name}` : ''}` : `Избери видео отзив ${itemIndex + 1}`}
          aria-current={selected ? 'true' : undefined}
          onClick={() => { if (performance.now() < suppressClickUntil.current) return; if (selected) setPreview(item); else select(index + delta) }}
          style={{ transform: `translate3d(${offset * 280}px,0,${-Math.min(absolute, 2) * 145}px) rotateY(${-Math.max(-44, Math.min(44, offset * 31))}deg) scale(${1 - Math.min(absolute, 2) * .09})`, opacity: absolute > 2.2 ? 0 : 1, zIndex: 10 - Math.round(absolute) }}>
          <span className={styles.browser}><span><i/><i/><i/></span><b>TIARRA REVIEW</b></span>
          <span className={styles.poster}>
            <img src={`https://i.ytimg.com/vi/${encodeURIComponent(item.youtubeId)}/hqdefault.jpg`} alt="" width={480} height={360} loading={absolute < 2 ? 'eager' : 'lazy'} draggable={false}/>
            <span className={styles.shade} style={{ opacity: Math.min(absolute, 2) * .18 }}/>
            {selected && <span className={styles.watch}><Play size={15} fill="currentColor"/> Гледай видеото</span>}
          </span>
          <span className={styles.cardInfo}><span><strong>{item.name || `Видео отзив ${String(itemIndex + 1).padStart(2, '0')}`}</strong><small>{'★'.repeat(item.stars)} · Реален клиент</small></span><Play size={19} fill="currentColor"/></span>
        </button>
      })}
    </div>
    <div className={styles.bottom}>
      <div className={styles.activeInfo}><h3>{active.name || `Видео отзив ${String(activeIndex + 1).padStart(2, '0')}`}</h3><p>Истинска обратна връзка от клиент на Tiarra Cosmetics</p></div>
      <div className={styles.dock} role="group" aria-label="Управление на видео отзивите">
        <span><b>{String(activeIndex + 1).padStart(2, '0')}</b> / {String(items.length).padStart(2, '0')}</span>
        <button type="button" aria-label="Предишен видео отзив" onClick={() => select(index - 1)}><ChevronLeft size={20}/></button>
        <button type="button" aria-label={playing ? 'Спри автоматичното прелистване' : 'Пусни автоматичното прелистване'} aria-pressed={playing} onClick={() => setPlaying(value => !value)} disabled={reduced}>{playing ? <Pause size={15} fill="currentColor"/> : <Play size={15} fill="currentColor"/>}</button>
        <button type="button" aria-label="Следващ видео отзив" onClick={() => select(index + 1)}><ChevronRight size={20}/></button>
      </div>
      <p className={styles.hint}>Плъзни, използвай стрелките или избери видео</p>
    </div>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={() => setPreview(null)} onClose={() => setPreview(null)} onClick={event => { if (event.target === event.currentTarget) setPreview(null) }}>
      {preview && <div className={styles.dialogPanel}><header><span className={playerStyles.brand}><i/> TIARRA STORIES</span><button type="button" onClick={() => setPreview(null)}><X size={17}/> Затвори</button></header><div className={`${styles.player} ${playerStyles.cleanPlayer}`}><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(preview.youtubeId)}?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&fs=0&disablekb=1`} title={`Видео отзив${preview.name ? ` на ${preview.name}` : ''}`} allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin"/></div><div className={playerStyles.meta}><span className={playerStyles.avatar}>T</span><div><h3 id={titleId}>{preview.name || 'Клиент на Tiarra Cosmetics'}</h3><p>{'★'.repeat(preview.stars)} <b>Проверена видео обратна връзка</b></p></div><span className={playerStyles.verified}>✓ VERIFIED</span></div></div>}
    </dialog>
  </div>
}
