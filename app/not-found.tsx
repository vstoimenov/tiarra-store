import Link from 'next/link'
import styles from './not-found.module.css'

export default function NotFound() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Страницата не е намерена</h1>
      <p className={styles.text}>Адресът може да е грешен или страницата вече да я няма.</p>
      <Link href="/" className={styles.button}>
        Към началото
      </Link>
    </div>
  )
}
