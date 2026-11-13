import Link from 'next/link'
import { sql } from '@/lib/db'
import styles from './page.module.css'
import { DeleteSignup } from './DeleteSignup'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Имейли от теста | Tiarra Admin' }
export default async function QuizSignupsPage() {
  const [count] = await sql<{ total: number }[]>`select count(*)::int as total from store.quiz_email_signups`
  const rows = await sql<{ email: string; created_at: Date }[]>`select email, created_at from store.quiz_email_signups order by created_at desc limit 200`
  return <main className={styles.page}><Link href="/admin">← Общ преглед</Link><h1>Имейли от теста за аромат</h1><p>Доброволни записвания за бъдещи оферти: {count.total}. Показани са последните 200.</p><Link className={styles.button} href="/api/admin/quiz-signups" download prefetch={false}>Изтегли всички като CSV</Link>{rows.length ? <div className={styles.tableWrap}><table><thead><tr><th>Имейл</th><th>Дата на съгласие</th><th><span className={styles.srOnly}>Действия</span></th></tr></thead><tbody>{rows.map(row => <tr key={row.email}><td>{row.email}</td><td>{new Date(row.created_at).toLocaleDateString('bg-BG', { timeZone: 'Europe/Sofia' })}</td><td><DeleteSignup email={row.email}/></td></tr>)}</tbody></table></div> : <p>Все още няма записани имейли.</p>}</main>
}
