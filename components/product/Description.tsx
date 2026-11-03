import styles from './Description.module.css'

/**
 * The description as it was imported. The html was cleaned at import (a short list of tags, no
 * styles or scripts), so it goes in as it is; this only gives it the typography the page lacks.
 */
export function Description({ html }: { html: string }) {
  if (!html.trim()) return null
  return <div className={styles.prose} dangerouslySetInnerHTML={{ __html: html }} />
}
