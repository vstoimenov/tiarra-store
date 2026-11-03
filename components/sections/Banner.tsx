import Link from 'next/link'
import { imageSrcSet, imageUrl } from '@/lib/images'
import type { SectionOf } from '@/lib/sections/schema'
import styles from './Banner.module.css'

/** A campaign banner: a picture with a headline, a line of text and one button over it. */
export function Banner({ section }: { section: SectionOf<'banner'> }) {
  const { imagePath, title, text, buttonLabel, buttonHref } = section.data

  return (
    <section className={styles.banner} data-section={section.id}>
      <img
        className={styles.image}
        src={imageUrl(imagePath, 1200)}
        srcSet={imageSrcSet(imagePath)}
        sizes="100vw"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <div className={styles.content}>
        <h2 className={styles.title}>{title}</h2>
        {text && <p className={styles.text}>{text}</p>}
        <Link href={buttonHref} className={styles.button}>
          {buttonLabel}
        </Link>
      </div>
    </section>
  )
}
