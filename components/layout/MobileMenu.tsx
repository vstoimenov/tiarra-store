'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Navigation } from '@/lib/site/schema'
import { BurgerIcon, CloseIcon } from './icons'
import styles from './MobileMenu.module.css'
import { SearchForm } from './SearchForm'

// Must match the desktop breakpoint in Header.module.css and MobileMenu.module.css.
const DESKTOP_QUERY = '(min-width: 1180px)'

/** Burger button and the slide-in drawer with the menu and search. Only shown below the desktop breakpoint. */
export function MobileMenu({ menu }: { menu: Navigation['menu'] }) {
  const [open, setOpen] = useState(false)
  const burger = useRef<HTMLButtonElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const opener = burger.current
    const desktop = window.matchMedia(DESKTOP_QUERY)
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    const onBreakpoint = () => desktop.matches && setOpen(false)
    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onBreakpoint)
    closeButton.current?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onBreakpoint)
      opener?.focus()
    }
  }, [open])

  return (
    <>
      <button
        ref={burger}
        type="button"
        className={styles.burger}
        aria-label="Меню"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        <BurgerIcon width="22" height="17" />
      </button>
      <div className={open ? `${styles.root} ${styles.open}` : styles.root}>
        <div className={styles.backdrop} onClick={() => setOpen(false)} aria-hidden="true" />
        <div id="mobile-menu" className={styles.drawer}>
          <nav aria-label="Мобилно меню">
            <ul className={styles.list}>
              {menu.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.link} onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <SearchForm large />
        </div>
        <button ref={closeButton} type="button" className={styles.close} aria-label="Затвори менюто" onClick={() => setOpen(false)}>
          <CloseIcon width="20" height="20" />
        </button>
      </div>
    </>
  )
}
