import { sql } from '@/lib/db'
import { PromoAdmin } from '@/components/admin/PromoAdmin'
import { getAdminPromos } from '@/lib/admin/promos'
import styles from '../bumps/page.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Промокодове | Tiarra Admin', robots: { index: false, follow: false } }
export default async function PromoAdminPage() {
  const brands = await sql<{brand:string}[]>`select distinct brand from store.products where brand is not null and trim(brand) <> '' order by brand`
  return <main className={styles.page}><header className={styles.header}>
    
    <p>TIARRA ADMIN</p><h1>Промокодове</h1><span>Създавай, редактирай и спирай кодове за отстъпка.</span>
    </header><PromoAdmin initialPromos={await getAdminPromos()} brands={brands.map(row => row.brand)} /></main>
}
