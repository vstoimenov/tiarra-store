import type { ReactNode } from 'react'
import type { SectionOf } from '@/lib/sections/schema'
import { SectionHead } from './SectionHead'
import styles from './Why.module.css'

const SVG = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

// The four icons of 02-why-white.html, by the names the document uses.
const ICONS: Record<string, ReactNode> = {
  shield: (
    <svg {...SVG} aria-hidden="true">
      <path d="M12 2l7 4v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  truck: (
    <svg {...SVG} aria-hidden="true">
      <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="1.8" />
      <circle cx="17" cy="19" r="1.8" />
    </svg>
  ),
  card: (
    <svg {...SVG} aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
    </svg>
  ),
  return: (
    <svg {...SVG} aria-hidden="true">
      <path d="M3 12a9 9 0 109-9" />
      <path d="M3 4v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  ),
}

/** Port of tiarra-sections/02-why-white.html: four reasons to buy, each with a round icon. */
export function Why({ section }: { section: SectionOf<'why'> }) {
  const { kicker, title, titleHighlight, items } = section.data

  return (
    <section className={styles.why} data-section={section.id}>
      <div className={styles.inner}>
        <SectionHead kicker={kicker} title={title} highlight={titleHighlight} size="lg" />
        <ul className={styles.grid}>
          {items.map((item) => (
            <li key={item.title} className={styles.item}>
              {Object.hasOwn(ICONS, item.icon) && <div className={styles.icon}>{ICONS[item.icon]}</div>}
              <h3 className={styles.itemTitle}>{item.title}</h3>
              <p className={styles.text}>{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
