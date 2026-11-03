import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { Navigation, Settings } from '@/lib/site/schema'
import styles from './Footer.module.css'
import { FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, TiktokIcon } from './icons'

// Shown as labels only: they are not links and not editable.
const PAYMENT_METHODS = ['VISA', 'MASTERCARD', 'НАЛОЖЕН ПЛАТЕЖ', 'ЕКОНТ', 'СПИДИ']

/** Ported from tiarra-sections/03-footer.html: brand text and contacts, link groups, legal line. */
export function Footer({ settings, groups }: { settings: Settings; groups: Navigation['footer'] }) {
  const { company, social, footerText } = settings
  const socialLinks = [
    { href: social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: social.tiktok, label: 'TikTok', Icon: TiktokIcon },
  ]

  return (
    <footer className={styles.footer}>
      <div className={styles.in}>
        <div className={styles.grid} style={{ '--groups': groups.length } as CSSProperties}>
          <div>
            {footerText && <p className={styles.brandText}>{footerText}</p>}
            <div className={styles.contacts}>
              <a href={`mailto:${company.email}`} aria-label="Имейл">
                <MailIcon />
                {company.email}
              </a>
              <a href={`tel:${company.phone.replace(/[^\d+]/g, '')}`} aria-label="Телефон">
                <PhoneIcon />
                {company.phone}
              </a>
            </div>
            <div className={styles.socials}>
              {socialLinks.map(({ href, label, Icon }) =>
                href ? (
                  <a key={label} href={href} target="_blank" rel="noopener" aria-label={label}>
                    <Icon />
                  </a>
                ) : null,
              )}
            </div>
          </div>

          {groups.map((group) => (
            <div key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.bottom}>
          <small>
            © 2026 Tiarra Cosmetics® · {company.legalName} · ЕИК {company.eik} · {company.city}. Всички права запазени.
          </small>
          <div className={styles.pay}>
            {PAYMENT_METHODS.map((method) => (
              <span key={method}>{method}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
