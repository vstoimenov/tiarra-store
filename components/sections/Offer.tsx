import { Savings } from '@/components/product/Savings'
import Link from 'next/link'
import { formatPrice, isDiscounted } from '@/lib/format'
import { imageSrcSet, imageUrl } from '@/lib/images'
import type { SectionOf } from '@/lib/sections/schema'
import { effectiveOfferEnd } from '@/lib/countdown'
import { Countdown } from './Countdown'
import styles from './Offer.module.css'

/**
 * The campaign box: product picture, old and new price, a countdown and one button.
 * The old price shows only when it is above the new one (ruling R7). After `endsAt` the
 * countdown goes away and the offer stays; the page is rebuilt every 5 minutes, and the
 * countdown also removes itself in the browser the moment time is up.
 */
export function Offer({ section }: { section: SectionOf<'offer'> }) {
  const { productSlug, title, imagePath, oldPrice, newPrice, endsAt, buttonLabel } = section.data
  // "BRAND — what it is": the brand is the heading, the rest reads as the description under it.
  const [heading, ...rest] = title.split(' — ')
  const description = rest.join(' — ')
  const countdownEnd = endsAt === undefined ? undefined : effectiveOfferEnd(endsAt)
  const running = countdownEnd !== undefined && Date.parse(countdownEnd) > Date.now()

  return (
    <section className={styles.offer} data-section={section.id}>
      <h2 className={styles.title}>{heading}</h2>
      {description && <p className={styles.description}>{description}</p>}
      <img
        className={styles.image}
        src={imageUrl(imagePath, 800)}
        srcSet={imageSrcSet(imagePath)}
        sizes="(min-width: 900px) 360px, calc(100vw - 80px)"
        width={800}
        height={600}
        alt={title}
        loading="lazy"
        decoding="async"
      />
      <div className={styles.prices}>
        {isDiscounted(newPrice, oldPrice) && (
          <p className={styles.was}>
            Обичайна цена: <s>{formatPrice(oldPrice)}</s>
          </p>
        )}
        <p className={styles.now}>СЕГА: {formatPrice(newPrice)}</p>
        <Savings price={newPrice} compareAtPrice={oldPrice} />
      </div>
      {running && <Countdown endsAt={countdownEnd} />}
      <p className={styles.action}>
        <Link href={`/store/${productSlug}`} className={styles.button}>
          {buttonLabel}
        </Link>
      </p>
    </section>
  )
}
