import { OrdersAdmin } from '@/components/admin/OrdersAdmin'
import { getAdminOrders } from '@/lib/admin/orders'
import styles from '../bumps/page.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Поръчки | Tiarra Admin', robots: { index: false, follow: false } }

export default async function OrdersAdminPage() {
  const orders = await getAdminOrders()
  return <main className={styles.page}>
    <header className={styles.header}>

      <p>TIARRA ADMIN</p><h1>Поръчки</h1>
      <span>Потвърждаване, изпращане и безопасно анулиране с автоматично връщане на наличността.</span>
    </header>
    <OrdersAdmin initialOrders={orders} />
  </main>
}
