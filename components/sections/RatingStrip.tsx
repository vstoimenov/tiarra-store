import { imageSrcSet, imageUrl } from '@/lib/images'
import type { SectionOf } from '@/lib/sections/schema'
import styles from './RatingStrip.module.css'

/** The thin trust strip under the hero: customer photos, gold stars, the score and a line. */
export function RatingStrip({ section }: { section: SectionOf<'rating'> }) {
  const { stars, score, text, avatars = [] } = section.data

  return (
    <section className={styles.strip} data-section={section.id} aria-label="Оценка от клиенти">
      <div className={styles.inner}>
        {avatars.length > 0 && (
          <ul className={styles.avatars} aria-hidden="true">
            {avatars.map((path) => (
              <li key={path}>
                <img
                  src={imageUrl(path, 400)}
                  srcSet={imageSrcSet(path)}
                  sizes="36px"
                  width={36}
                  height={36}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </li>
            ))}
          </ul>
        )}
        <div>
          <p className={styles.row}>
            <span className={styles.stars} role="img" aria-label={`${stars} от 5 звезди`}>
              {'★'.repeat(stars)}
              <span className={styles.empty}>{'★'.repeat(5 - stars)}</span>
            </span>
            <span className={styles.score}>
              <b>{score}</b> оценка
            </span>
          </p>
          <p className={styles.text}>{text}</p>
        </div>
      </div>
    </section>
  )
}
