import { faqJsonLd } from '@/lib/sections/faq-jsonld'
import type { SectionOf } from '@/lib/sections/schema'
import type { Settings } from '@/lib/site/schema'
import styles from './Faq.module.css'
import { SectionHead } from './SectionHead'

/** `https://www.instagram.com/tiarra.cosmetics/` becomes `@tiarra.cosmetics`. */
function instagramHandle(url: string): string {
  const name = url.split(/[?#]/)[0].split('/').filter(Boolean).pop()
  return name ? `@${name}` : url
}

const PLUS = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

/**
 * Port of tiarra-sections/09-faq.html: questions open with a click (no script) and the same
 * questions go to Google as FAQPage structured data.
 */
export function Faq({ section, settings }: { section: SectionOf<'faq'>; settings: Pick<Settings, 'company' | 'social'> }) {
  const { kicker, title, titleHighlight, items, help } = section.data
  const { email } = settings.company
  const { instagram } = settings.social
  // `<` is escaped so no answer can close the script element.
  const jsonLd = JSON.stringify(faqJsonLd(items)).replace(/</g, '\\u003c')

  return (
    <section className={styles.faq} data-section={section.id}>
      <div className={styles.inner}>
        <SectionHead kicker={kicker} title={title} highlight={titleHighlight} size="md" />
        <div className={styles.list}>
          {items.map((item) => (
            <details key={item.q} className={styles.item}>
              <summary className={styles.question}>
                {item.q}
                <span className={styles.plus}>{PLUS}</span>
              </summary>
              {/* Our own seed text, trusted until the stage 3 admin sanitizes it on save. */}
              <div className={styles.answer} dangerouslySetInnerHTML={{ __html: item.aHtml }} />
            </details>
          ))}
        </div>
        {help && (
          <div className={styles.help}>
            <p>
              <b>{help.title}</b> {help.text}
            </p>
            <div className={styles.links}>
              <a href={`mailto:${email}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                {email}
              </a>
              {instagram && (
                <a href={instagram} target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  {instagramHandle(instagram)}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </section>
  )
}
