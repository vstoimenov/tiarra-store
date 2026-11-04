'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Keeps the original hero visible while adding the scroll transition on larger screens. */
export function HeroMotion({ children, className, sectionId }: { children: ReactNode; className: string; sectionId: string }) {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (disposed || !root.current) return
      gsap.registerPlugin(ScrollTrigger)
      const media = gsap.matchMedia()
      media.add('(min-width: 1000px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
        const context = gsap.context(() => {
          gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: '+=500', scrub: 1, pin: true, anticipatePin: 1 } })
            .to('[data-hero-image]', { scale: 1.16, y: -34, ease: 'none' }, 0)
            .to('[data-hero-arc]', { scale: 1.15, rotation: 24, opacity: .7, ease: 'none' }, 0)
            .to('[data-hero-copy]', { y: -48, opacity: .12, ease: 'none' }, .22)
            .to('[data-hero-veil]', { opacity: 1, ease: 'none' }, .6)
        }, root)
        return () => context.revert()
      })
      cleanup = () => media.revert()
    }).catch(() => { /* The original hero stays usable without animation. */ })
    return () => { disposed = true; cleanup?.() }
  }, [])

  return <section ref={root} className={className} data-section={sectionId}>{children}</section>
}
