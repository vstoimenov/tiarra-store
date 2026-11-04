import { SearchForm } from '@/components/layout/SearchForm'
import styles from './HomeSearch.module.css'

export function HomeSearch() {
  return (
    <section className={styles.section} aria-labelledby="home-search-title">
      <div className={styles.copy}>
        <p className={styles.kicker}>Открий своя продукт</p>
        <h2 id="home-search-title">Какво търсиш днес?</h2>
      </div>
      <div className={styles.form}>
        <SearchForm large />
      </div>
    </section>
  )
}

