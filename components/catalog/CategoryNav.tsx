import Link from 'next/link'
import type { Category } from '@/lib/catalog/types'
import styles from './CategoryNav.module.css'

interface Props {
  categories: Category[]
  /** Slug of the category being shown; left out on the page with every product. */
  current?: string
}

/** One link per category, plus „Всички продукти“; the page being shown is marked. */
export function CategoryNav({ categories, current }: Props) {
  return (
    <nav aria-label="Категории" className={styles.nav}>
      <ul className={styles.list}>
        <li>
          <Link href="/store" className={styles.link} aria-current={current === undefined ? 'page' : undefined}>
            Всички продукти
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/store/category/${encodeURIComponent(category.slug)}`}
              className={styles.link}
              aria-current={category.slug === current ? 'page' : undefined}
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
