'use client'

import { useState, useTransition } from 'react'
import type { AdminOrder, OrderStatus } from '@/lib/admin/orders'
import styles from './OrdersAdmin.module.css'

const labels: Record<OrderStatus, string> = { new: 'Нова', confirmed: 'Потвърдена', sent: 'Изпратена', completed: 'Завършена', cancelled: 'Анулирана' }
const next: Record<OrderStatus, { status: OrderStatus; label: string }[]> = {
  new: [{ status: 'confirmed', label: 'Потвърди' }, { status: 'cancelled', label: 'Анулирай' }],
  confirmed: [{ status: 'sent', label: 'Маркирай изпратена' }, { status: 'cancelled', label: 'Анулирай' }],
  sent: [{ status: 'completed', label: 'Завърши' }], completed: [], cancelled: [],
}

export function OrdersAdmin({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const [orders, setOrders] = useState(initialOrders)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()
  function update(orderNumber: string, status: OrderStatus) {
    if (status === 'cancelled' && !window.confirm('Да анулирам ли поръчката? Наличността ще бъде върната автоматично.')) return
    startTransition(async () => {
      setMessage('')
      const response = await fetch(`/api/admin/orders/${orderNumber}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setMessage(response.status === 409 ? 'Този преход на статус не е разрешен.' : 'Промяната не беше записана.'); return }
      setOrders((current) => current.map((order) => order.orderNumber === orderNumber ? { ...order, status } : order))
      setMessage(data.ordyxWarning ? 'Статусът е записан. Ordyx ще опита анулирането отново.' : 'Статусът е записан.')
    })
  }
  if (!orders.length) return <section className={styles.empty}><strong>Все още няма поръчки.</strong><span>Новите поръчки ще се появят тук автоматично.</span></section>
  return <section className={styles.list}>
    <p className={styles.message} role="status">{message}</p>
    {orders.map((order) => <article className={styles.order} key={order.orderNumber}>
      <div className={styles.top}><div><span className={styles.eyebrow}>ПОРЪЧКА #{order.orderNumber}</span><h2>{order.customerName}</h2><time>{new Intl.DateTimeFormat('bg-BG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Sofia' }).format(new Date(order.createdAt))}</time></div><span className={`${styles.status} ${styles[order.status]}`}>{labels[order.status]}</span></div>
      <div className={styles.grid}>
        <div><b>Контакт</b><a href={`tel:${order.phone}`}>{order.phone}</a>{order.email ? <a href={`mailto:${order.email}`}>{order.email}</a> : null}</div>
        <div><b>Доставка · {order.courier.toUpperCase()}</b><span>{order.deliveryAddress}</span></div>
        <div><b>Продукти</b>{order.items.map((item, index) => <span key={`${item.title}-${index}`}>{item.quantity} × {item.title}{item.variantName ? ` · ${item.variantName}` : ''}</span>)}</div>
      </div>
      <div className={styles.bottom}><strong>{order.total.toFixed(2)} €</strong><span className={styles.ordyx}>Ordyx: {order.ordyxStatus}{order.ordyxError ? ` · ${order.ordyxError}` : ''}</span><div className={styles.actions}>{next[order.status].map((action) => <button className={action.status === 'cancelled' ? styles.danger : ''} disabled={pending} key={action.status} onClick={() => update(order.orderNumber, action.status)}>{action.label}</button>)}</div></div>
    </article>)}
  </section>
}
