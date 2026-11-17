import { OrdersAdmin } from '@/components/admin/OrdersAdmin'
import { getAdminOrders, orderEditingAvailable } from '@/lib/admin/orders'
import styles from '../bumps/page.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Поръчки | Tiarra Admin', robots: { index: false, follow: false } }

export default async function OrdersAdminPage({searchParams}:{searchParams:Promise<{order?:string}>}) {
  const requested=(await searchParams).order
  const initialQuery=requested&&/^\d{1,18}$/.test(requested)?requested:''
  const [orders, editingAvailable] = await Promise.all([getAdminOrders(), orderEditingAvailable()])
  if(initialQuery&&!orders.some(order=>order.orderNumber===initialQuery))orders.push(...await getAdminOrders(initialQuery))
  return <main className={styles.page}>
    <header className={styles.header}>

      <p>TIARRA ADMIN</p><h1>Поръчки</h1>
      <span>Редакция на клиентски данни, доставка и продукти. Потвърждаване, изпращане и анулиране с автоматично връщане на наличността.</span>
    </header>
    <OrdersAdmin initialOrders={orders} initialQuery={initialQuery} editingAvailable={editingAvailable} />
  </main>
}
