import { SearchIcon } from './icons'
import styles from './SearchForm.module.css'

/** Plain GET form to `/store?q=…`, so search works before any script has loaded. */
export function SearchForm({ large = false }: { large?: boolean }) {
  return (
    <form action="/store" method="get" role="search" className={large ? `${styles.form} ${styles.large}` : styles.form}>
      <input type="search" name="q" className={styles.input} placeholder="Търсене..." aria-label="Търсене" autoComplete="off" />
      <button type="submit" className={styles.submit} aria-label="Търси">
        <SearchIcon />
      </button>
    </form>
  )
}
