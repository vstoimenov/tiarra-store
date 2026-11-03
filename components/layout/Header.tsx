import Link from 'next/link'
import type { ReactNode } from 'react'
import { imageSrcSet, imageUrl } from '@/lib/images'
import { CartLink } from '@/components/cart/CartLink'
import type { Navigation } from '@/lib/site/schema'
import styles from './Header.module.css'
import { MobileMenu } from './MobileMenu'
import { SearchForm } from './SearchForm'

/**
 * The black header. On desktop it sits under the gold topbar; on mobile the topbar sits under
 * it, so both are rendered here and CSS orders them. Below 1180px the menu moves into the drawer.
 */
export function Header({ menu, topbar }: { menu: Navigation['menu']; topbar: ReactNode }) {
  return (
    <div className={styles.top}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <MobileMenu menu={menu} />
          <Link href="/" className={styles.logo}>
            <img
              src={imageUrl('site/logo', 400)}
              srcSet={imageSrcSet('site/logo')}
              sizes="100px"
              width={100}
              height={50}
              alt="Tiarra Cosmetics"
            />
          </Link>
          <nav className={styles.nav} aria-label="Основно меню">
            <ul className={styles.list}>
              {menu.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={styles.link}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.search}>
            <SearchForm />
          </div>
          <CartLink className={styles.cart} textClassName={styles.cartText} badgeClassName={styles.cartBadge} />
        </div>
      </header>
      {topbar}
    </div>
  )
}
