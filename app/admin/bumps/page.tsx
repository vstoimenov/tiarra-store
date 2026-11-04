import Link from 'next/link'
import { BumpAdmin } from '@/components/admin/BumpAdmin'
import { getBumpAdminData } from '@/lib/admin/bumps'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Product bumps | Tiarra Admin', robots: { index: false, follow: false } }

export default async function BumpsAdminPage() {
  const data = await getBumpAdminData()
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <nav className={styles.nav}><Link href="/admin/orders">Поръчки</Link><Link href="/admin/bumps">Препоръки</Link></nav>
        <p>TIARRA ADMIN</p>
        <h1>Препоръчани продукти</h1>
        <span>Избери кой допълващ продукт да се показва на всяка продуктова страница.</span>
      </header>
      <BumpAdmin initialProducts={data.products} initialMappings={data.mappings} />
    </main>
  )
}

