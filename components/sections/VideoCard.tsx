'use client'

import { useState } from 'react'
import styles from './VideoCard.module.css'

interface Props {
  /** Exactly 11 URL-safe characters: the schema guarantees it, and it is encoded again here. */
  youtubeId: string
  name: string
  stars: number
}

/**
 * A YouTube facade. The page shows only the still picture and a play button; the player, with
 * its scripts and cookies, is created when somebody asks for it. The privacy-friendly domain
 * keeps YouTube from setting cookies until then.
 */
export function VideoCard({ youtubeId, name, stars }: Props) {
  const [playing, setPlaying] = useState(false)
  const id = encodeURIComponent(youtubeId)
  const who = name ? ` на ${name}` : ''

  return (
    <div className={styles.card}>
      <div className={styles.media}>
        {playing ? (
          <iframe
            className={styles.player}
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
            title={`Видео отзив${who}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            <img
              className={styles.thumb}
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              width={480}
              height={360}
              alt=""
              loading="lazy"
              decoding="async"
            />
            {name && <span className={styles.name}>{name}</span>}
            <button type="button" className={styles.play} aria-label={`Пусни видео отзива${who}`} onClick={() => setPlaying(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
            </button>
          </>
        )}
      </div>
      <div className={styles.bar} role="img" aria-label={`${stars} от 5 звезди`}>
        {'★'.repeat(stars)}
      </div>
    </div>
  )
}
