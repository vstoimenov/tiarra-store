import type { SectionOf } from '@/lib/sections/schema'
import { VideoCard } from './VideoCard'
import styles from './VideoReviews.module.css'

/** `290+` becomes the number and a smaller `+` after it, as on the live page. */
function splitSuffix(value: string): [string, string] {
  return value.endsWith('+') ? [value.slice(0, -1), '+'] : [value, '']
}

/** A sideways row of video reviews (thumbnails until clicked) and the two big counters under it. */
export function VideoReviews({ section }: { section: SectionOf<'videoReviews'> }) {
  const { videos, stats } = section.data

  return (
    <section className={styles.reviews} data-section={section.id} aria-label="Видео отзиви">
      {videos.length > 0 && (
        <div className={styles.slider}>
          <ul className={styles.track}>
            {videos.map((video) => (
              <li key={video.youtubeId} className={styles.slide}>
                <VideoCard youtubeId={video.youtubeId} name={video.name} stars={video.stars} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {stats.length > 0 && (
        <ul className={styles.stats}>
          {stats.map((stat) => {
            const [number, suffix] = splitSuffix(stat.value)
            return (
              <li key={stat.label} className={styles.stat}>
                <p className={styles.value}>
                  {number}
                  {suffix && <span className={styles.suffix}>{suffix}</span>}
                </p>
                <p className={styles.label}>{stat.label}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
