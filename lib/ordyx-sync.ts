import { sql } from '@/lib/db'
import { getCourierOffices } from '@/lib/ordyx-offices'

type Order = { id: string; order_number: string; customer_name: string; phone: string; email: string | null; courier: 'econt' | 'speedy'; delivery_type: 'office' | 'automat' | 'address' | null; office_id: string | null; city: string | null; post_code: string | null; delivery_address: string; total: number }
type Item = { title: string; variant_name: string | null; unit_price: number; quantity: number }

export async function syncOrder(orderNumber: string): Promise<boolean> {
  const key = process.env.ORDYX_API_KEY
  if (!key) return false
  const orders = await sql<Order[]>`select id, order_number, customer_name, phone, email, courier, delivery_type, office_id, city, post_code, delivery_address, total::float8 as total from store.orders where order_number = ${orderNumber} and ordyx_sync_status != 'synced'`
  const order = orders[0]
  if (!order) return true
  if (!order.delivery_type) return false
  const office = order.office_id ? (await getCourierOffices(order.courier)).find(entry => entry.id === order.office_id) : null
  if (order.delivery_type !== 'address' && !office) return false
  const items = await sql<Item[]>`select title, variant_name, unit_price::float8 as unit_price, quantity from store.order_items where order_id = ${order.id}`
  const payload = {
    source: 'api', external_id: `tiarra-${order.order_number}`,
    name: order.customer_name, phone: order.phone, email: order.email || '',
    delivery_type: `${order.courier}_${order.delivery_type === 'address' ? 'address' : 'office'}`, office_id: office?.id ?? '',
    office_text: office ? `${office.city}, ${office.name}, ${office.address}` : `${order.courier.toUpperCase()} – адрес: ${order.delivery_address}`,
    city: office?.city ?? order.city ?? '', post_code: office?.postCode ?? order.post_code ?? '', address_text: order.delivery_type === 'address' ? order.delivery_address : '',
    items: items.map(item => ({ name: item.variant_name ? `${item.title} — ${item.variant_name}` : item.title, qty: item.quantity, price: item.unit_price, sku: '' })),
    total: order.total, currency: 'EUR', paid: false, payment_method: 'cod', page_url: 'https://tiarra-store.vercel.app',
  }
  try {
    const response = await fetch('https://app.ordyx.eu/api/orders', {
      method: 'POST', headers: {
        Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
        'X-Ordyx-Site': JSON.stringify({ mode: 'checkout', version: 'tiarra-1' }),
      }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      const message = `Ordyx HTTP ${response.status}`
      await sql`update store.orders set ordyx_sync_status = 'failed', ordyx_sync_error = ${message} where id = ${order.id}`
      return false
    }
    await sql`update store.orders set ordyx_sync_status = 'synced', ordyx_sync_error = null, ordyx_synced_at = now() where id = ${order.id}`
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 250) : 'Ordyx connection failed'
    await sql`update store.orders set ordyx_sync_status = 'failed', ordyx_sync_error = ${message} where id = ${order.id}`
    return false
  }
}
