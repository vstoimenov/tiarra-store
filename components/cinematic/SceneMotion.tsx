'use client'
import { useEffect, useRef, type ReactNode } from 'react'

/** Server-rendered children remain visible until progressive motion enhancement is ready. */
export function SceneMotion({ children, id, kind, className }: { children: ReactNode; id: string; kind: 'hero' | 'story' | 'categories'; className: string }) {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (disposed || !root.current) return
      gsap.registerPlugin(ScrollTrigger)
      const media = gsap.matchMedia()
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const ctx = gsap.context(() => {
          if (kind === 'hero') {
            gsap.timeline({ defaults: { duration: .9, ease: 'power2.out' } })
              .from('[data-product]', { y: 35, rotation: -5, opacity: 0 })
              .from('[data-reveal]', { y: 25, opacity: 0 }, .15)
          } else gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(el => {
            gsap.from(el, { y: 20, opacity: 0, duration: .65, scrollTrigger: { trigger: el, start: 'top 92%', once: true } })
          })
        }, root)
        return () => ctx.revert()
      })
      media.add('(min-width: 1000px) and (min-height: 750px) and (prefers-reduced-motion: no-preference)', () => {
        const ctx = gsap.context(() => {
          if (kind === 'hero') gsap.to('[data-product]', { y: 100, rotation: 6, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 1 } })
          if (kind === 'story') {
            const steps = gsap.utils.toArray<HTMLElement>('[data-step]')
            gsap.set(steps.slice(1), { opacity: .3 })
            const timeline = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top top', end: '+=1200', pin: true, scrub: 1 } })
            timeline.to('[data-product]', { scale: 1.08, rotation: -6, duration: 1 })
              .to(steps[0], { opacity: .3 }, 0).to(steps[1], { opacity: 1 }, .5)
              .to('[data-product]', { scale: .92, rotation: 3, duration: 1 })
              .to(steps[1], { opacity: .3 }, 1).to(steps[2], { opacity: 1 }, 1.5)
          }
        }, root)
        return () => ctx.revert()
      })
      cleanup = () => media.revert()
    }).catch(() => { /* A failed animation import must leave the SSR content usable. */ })
    return () => { disposed = true; cleanup?.() }
  }, [kind])
  return <section ref={root} id={id} data-section={id} className={className}>{children}</section>
}
