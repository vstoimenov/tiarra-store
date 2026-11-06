'use client'

import { useMemo, useState, useTransition } from 'react'
import type { AdminOrder, OrderStatus } from '@/lib/admin/orders'
import styles from './OrdersAdmin.module.css'

const labels: Record<OrderStatus, string> = { new: 'Нова', confirmed: 'Потвърдена', sent: 'Изпратена', completed: 'Завършена', cancelled: 'Анулирана' }
const next: Record<OrderStatus, { status: OrderStatus; label: string }[]> = { new: [{ status: 'confirmed', label: 'Потвърди' }, { status: 'cancelled', label: 'Анулирай' }], confirmed: [{ status: 'sent', label: 'Маркирай изпратена' }, { status: 'cancelled', label: 'Анулирай' }], sent: [{ status: 'completed', label: 'Завърши' }], completed: [], cancelled: [] }

function OrderCard({ order, onStatus, onSaved }: { order: AdminOrder; onStatus: (status: OrderStatus) => void; onSaved: (patch: Partial<AdminOrder>, message: string) => void }) {
  const [notes, setNotes] = useState(order.internalNotes)
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber)
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl)
  const [pending, startTransition] = useTransition()
  function save() { startTransition(async () => { const response = await fetch(`/api/admin/orders/${order.orderNumber}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ internalNotes: notes, trackingNumber, trackingUrl }) }); onSaved(response.ok ? { internalNotes: notes, trackingNumber, trackingUrl } : {}, response.ok ? 'Данните са записани.' : 'Данните не бяха записани.') }) }
  function retryOrdyx() { startTransition(async () => { const response = await fetch(`/api/admin/orders/${order.orderNumber}/ordyx`, { method: 'POST' }); const data = await response.json().catch(() => ({})); onSaved({}, response.ok && data.ok ? 'Ordyx синхронизацията е успешна.' : 'Ordyx не прие заявката. Опитай отново.') }) }
  return <article className={styles.order}>
    <div className={styles.top}><div><span className={styles.eyebrow}>ПОРЪЧКА #{order.orderNumber}</span><h2>{order.customerName}</h2><time>{new Intl.DateTimeFormat('bg-BG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Sofia' }).format(new Date(order.createdAt))}</time></div><span className={`${styles.status} ${styles[order.status]}`}>{labels[order.status]}</span></div>
    <details className={styles.details} open={order.status === 'new'}><summary>Детайли и управление</summary>
      <div className={styles.grid}><div><b>Контакт</b><a href={`tel:${order.phone}`}>{order.phone}</a>{order.email ? <a href={`mailto:${order.email}`}>{order.email}</a> : null}</div><div><b>Доставка · {order.courier.toUpperCase()}</b><span>{order.deliveryAddress}</span></div><div><b>Продукти</b>{order.items.map((item, index) => <span key={`${item.title}-${index}`}>{item.quantity} × {item.title}{item.variantName ? ` · ${item.variantName}` : ''}</span>)}</div></div>
      <div className={styles.operations}><label>Вътрешна бележка<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Вижда се само в администрацията" /></label><label>Номер за проследяване<input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="Товарителница / tracking номер" /></label><label>Линк за проследяване<input type="url" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder="https://…" /></label><button type="button" disabled={pending} onClick={save}>Запази данните</button></div>
    </details>
    {order.promoCode && <p>Промокод: <b>{order.promoCode}</b> · Отстъпка: {order.discountAmount.toFixed(2)} €</p>}
    <div className={styles.bottom}><strong>{order.total.toFixed(2)} €</strong><span className={styles.ordyx}>Ordyx: {order.ordyxStatus}{order.ordyxError ? ` · ${order.ordyxError}` : ''}</span><div className={styles.actions}><button type="button" className={styles.secondary} disabled={pending} onClick={retryOrdyx}>Повтори Ordyx</button>{next[order.status].map((action) => <button type="button" className={action.status === 'cancelled' ? styles.danger : ''} disabled={pending} key={action.status} onClick={() => onStatus(action.status)}>{action.label}</button>)}</div></div>
  </article>
}

export function OrdersAdmin({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const [orders, setOrders] = useState(initialOrders); const [query, setQuery] = useState(''); const [status, setStatus] = useState<'all' | OrderStatus>('all'); const [message, setMessage] = useState(''); const [pending, startTransition] = useTransition()
  const visible = useMemo(() => { const needle = query.trim().toLocaleLowerCase('bg'); return orders.filter((order) => (status === 'all' || order.status === status) && (!needle || `${order.orderNumber} ${order.customerName} ${order.phone} ${order.email ?? ''} ${order.trackingNumber}`.toLocaleLowerCase('bg').includes(needle))) }, [orders, query, status])
  function update(orderNumber: string, nextStatus: OrderStatus) {
    if (nextStatus === 'cancelled' && !window.confirm('Да анулирам ли поръчката? Наличността ще бъде върната автоматично.')) return
    startTransition(async () => { setMessage(''); const response = await fetch(`/api/admin/orders/${orderNumber}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) }); const data = await response.json().catch(() => ({})); if (!response.ok) { setMessage(response.status === 409 ? 'Този преход на статус не е разрешен.' : 'Промяната не беше записана.'); return } setOrders((current) => current.map((order) => order.orderNumber === orderNumber ? { ...order, status: nextStatus, ordyxStatus: nextStatus === 'cancelled' ? (data.ordyxWarning ? 'failed' : 'cancelled') : order.ordyxStatus } : order)); setMessage(data.ordyxWarning ? 'Статусът е записан. Ordyx ще опита отново.' : 'Статусът е записан.') })
  }
  function saved(orderNumber: string, patch: Partial<AdminOrder>, note: string) { setOrders((current) => current.map((order) => order.orderNumber === orderNumber ? { ...order, ...patch } : order)); setMessage(note) }
  return <section className={styles.list}><div className={styles.filters}><label>Търсене<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="№, име, телефон, tracking…" /></label><label>Статус<select value={status} onChange={(event) => setStatus(event.target.value as 'all' | OrderStatus)}><option value="all">Всички</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span>{visible.length} поръчки</span></div><p className={styles.message} role="status">{pending ? 'Записване…' : message}</p>{!orders.length ? <div className={styles.empty}><strong>Все още няма поръчки.</strong><span>Новите поръчки ще се появят тук автоматично.</span></div> : null}{orders.length > 0 && !visible.length ? <div className={styles.empty}><strong>Няма намерени поръчки.</strong><span>Промени търсенето или филтъра.</span></div> : null}{visible.map((order) => <OrderCard order={order} key={order.orderNumber} onStatus={(nextStatus) => update(order.orderNumber, nextStatus)} onSaved={(patch, note) => saved(order.orderNumber, patch, note)} />)}</section>
}
