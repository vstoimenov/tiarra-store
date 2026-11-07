import Link from 'next/link'
import { imageSrcSet, imageUrl } from '@/lib/images'
import type { SectionOf } from '@/lib/sections/schema'
import styles from './ImageText.module.css'

/** A photo on one side and a heading with rich text on the other ("Кой стои зад Tiarra Cosmetics"). */
export function ImageText({ section }: { section: SectionOf<'imageText'> }) {
  const { imagePath, title, bodyHtml, buttonLabel, buttonHref } = section.data

  return (
    <section className={styles.about} data-section={section.id}>
      <div className={styles.inner}>
        <img
          className={`${styles.image} ${imagePath==='site/about'?styles.portrait:''}`}
          src={imageUrl(imagePath, 800)}
          srcSet={imageSrcSet(imagePath)}
          sizes="(min-width: 900px) 565px, calc(100vw - 38px)"
          width={imagePath==='site/about'?677:900}
          height={imagePath==='site/about'?677:1200}
          alt={title}
          loading="lazy"
          decoding="async"
        />
        <div className={styles.text}>
          <h2 className={styles.title}>{title}</h2>
          {/* Our own seed text, trusted until the stage 3 admin sanitizes it on save. */}
          <div className={styles.body} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          {buttonLabel && buttonHref && (
            <p className={styles.action}>
              <Link href={buttonHref} className={styles.button}>
                {buttonLabel}
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
