'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Pointer-driven depth without pinning, scroll interception or an animation library. */
export function HeroMotion({ children, className, sectionId }: { children: ReactNode; className: string; sectionId: string }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const stage = root.current?.querySelector<HTMLElement>('[data-hero-image]')?.parentElement
    if (!stage) return
    const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    let frame = 0
    function reset() {
      cancelAnimationFrame(frame)
      stage!.style.removeProperty('--tilt-x')
      stage!.style.removeProperty('--tilt-y')
      stage!.style.removeProperty('--lift')
    }
    function move(event: PointerEvent) {
      if (!media.matches || event.pointerType === 'touch') return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = stage!.getBoundingClientRect()
        const x = Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1))
        const y = Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1))
        stage!.style.setProperty('--tilt-x', `${-y * 6}deg`)
        stage!.style.setProperty('--tilt-y', `${x * 9}deg`)
        stage!.style.setProperty('--lift', '-8px')
      })
    }
    stage.addEventListener('pointermove', move, { passive: true })
    stage.addEventListener('pointerleave', reset)
    stage.addEventListener('pointercancel', reset)
    media.addEventListener('change', reset)
    window.addEventListener('blur', reset)
    return () => {
      reset()
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerleave', reset)
      stage.removeEventListener('pointercancel', reset)
      media.removeEventListener('change', reset)
      window.removeEventListener('blur', reset)
    }
  }, [])

  return <section ref={root} className={className} data-section={sectionId}>{children}</section>
}
