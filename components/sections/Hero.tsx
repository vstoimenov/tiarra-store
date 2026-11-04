import Link from 'next/link'
import { imageSrcSet, imageUrl } from '@/lib/images'
import type { SectionOf } from '@/lib/sections/schema'
import styles from './Hero.module.css'
import { HeroMotion } from './HeroMotion'

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

/**
 * Port of tiarra-sections/01-hero-v2.html. The picture is the largest thing above the fold, so
 * it is the LCP element: eager, high priority, and given its real size so nothing jumps.
 * The promise line is the page's h1.
 */
export function Hero({ section }: { section: SectionOf<'hero'> }) {
  const { imagePath, imageHref, imageAlt, subtitleHtml, buttons, trust } = section.data

  return (
    <HeroMotion className={styles.hero} sectionId={section.id}>
      <div className={styles.arc} data-hero-arc aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.veil} data-hero-veil aria-hidden="true" />
      <div className={styles.inner}>
        <Link href={imageHref} className={styles.imageLink} aria-label="Към магазина">
          <img
            className={styles.image}
            data-hero-image
            src={imageUrl(imagePath, 800)}
            srcSet={imageSrcSet(imagePath)}
            sizes="(min-width: 900px) 640px, min(440px, 100vw)"
            width={640}
            height={479}
            alt={imageAlt}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </Link>
        {/* Our own seed text, trusted until the stage 3 admin sanitizes it on save. */}
        <div data-hero-copy><h1 className={styles.sub} dangerouslySetInnerHTML={{ __html: subtitleHtml }} />
        <div className={styles.buttons}>
          {buttons.map((button) => (
            <Link key={button.href + button.label} href={button.href} className={`${styles.button} ${styles[button.style]}`}>
              {button.label}
            </Link>
          ))}
        </div>
        <ul className={styles.trust}>
          {trust.map((item) => (
            <li key={item}>
              {CHECK}
              {item}
            </li>
          ))}
        </ul>
        </div>
      </div>
    </HeroMotion>
  )
}
