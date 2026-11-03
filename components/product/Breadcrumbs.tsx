import Link from 'next/link'
import type { Crumb } from '@/lib/catalog/crumbs'
import styles from './Breadcrumbs.module.css'

/** Home › category › product. The last crumb is the page itself, so it is text and not a link. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Път до продукта" className={styles.nav}>
      <ol className={styles.list}>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1
          return (
            <li key={crumb.href} className={styles.item}>
              {last ? (
                <span aria-current="page">{crumb.label}</span>
              ) : (
                <Link href={crumb.href}>{crumb.label}</Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
