import { Description } from '@/components/product/Description'
import styles from './ContentPage.module.css'

/**
 * A text page (a legal page, „За нас“, „Контакти“): the title as the `<h1>` over the page's html.
 * The html is our own, written by us and stored with the page; `Description` gives it the
 * typography the page lacks (links underlined again, a line height above the body's 1).
 */
export function ContentPage({ title, html }: { title: string; html: string }) {
  return (
    <article className={styles.wrap}>
      <header className={styles.head}>
        <h1 className={styles.title}>{title}</h1>
      </header>
      <div className={styles.body} data-testid="content-body">
        <Description html={html} />
      </div>
    </article>
  )
}
