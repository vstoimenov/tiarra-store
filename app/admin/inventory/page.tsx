import { InventoryAdmin } from '@/components/admin/InventoryAdmin'
import { getInventory } from '@/lib/admin/inventory'
import styles from '../bumps/page.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Наличности | Tiarra Admin', robots: { index: false, follow: false } }

export default async function InventoryPage() {
  return <main className={styles.page}><header className={styles.header}><p>TIARRA ADMIN</p><h1>Наличности</h1><span>Промените се прилагат веднага в checkout-а и продуктовата страница.</span></header><InventoryAdmin initialItems={await getInventory()} /></main>
}
