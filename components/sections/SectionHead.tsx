import styles from './SectionHead.module.css'

interface Props {
  kicker?: string
  title: string
  /** A part of `title` shown in gold. */
  highlight?: string
  /** `md` is the FAQ size, `lg` the "why" size. */
  size?: 'lg' | 'md'
}

/** The gold kicker with a rule either side, then an uppercase italic title with one gold phrase. */
export function SectionHead({ kicker, title, highlight, size = 'lg' }: Props) {
  const at = highlight ? title.indexOf(highlight) : -1
  const parts = at < 0 ? [title] : [title.slice(0, at), highlight!, title.slice(at + highlight!.length)]

  return (
    <header className={styles.head}>
      {kicker && <p className={styles.kicker}>{kicker}</p>}
      <h2 className={`${styles.title} ${styles[size]}`}>
        {parts.length === 1 ? (
          title
        ) : (
          <>
            {parts[0]}
            <span className={styles.gold}>{parts[1]}</span>
            {parts[2]}
          </>
        )}
      </h2>
    </header>
  )
}
