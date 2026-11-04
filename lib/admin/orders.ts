import { sql } from '@/lib/db'

export type OrderStatus = 'new' | 'confirmed' | 'sent' | 'completed' | 'cancelled'
export interface AdminOrder {
  orderNumber: string; status: OrderStatus; customerName: string; phone: string; email: string | null
  courier: 'econt' | 'speedy'; deliveryAddress: string; total: number; createdAt: string
  ordyxStatus: string; ordyxError: string | null
  items: { title: string; variantName: string | null; quantity: number; unitPrice: number }[]
}

export async function getAdminOrders(): Promise<AdminOrder[]> {
  const rows = await sql<{ order_number: string; status: OrderStatus; customer_name: string; phone: string; email: string | null; courier: 'econt' | 'speedy'; delivery_address: string; total: number; created_at: string; ordyx_status: string; ordyx_error: string | null; items: AdminOrder['items'] }[]>`
    select o.order_number, o.status, o.customer_name, o.phone, o.email, o.courier,
      o.delivery_address, o.total::float8 as total, o.created_at,
      case when o.status = 'cancelled' then o.ordyx_cancel_status else o.ordyx_sync_status end as ordyx_status,
      case when o.status = 'cancelled' then o.ordyx_cancel_error else o.ordyx_sync_error end as ordyx_error,
      coalesce(jsonb_agg(jsonb_build_object('title', oi.title, 'variantName', oi.variant_name, 'quantity', oi.quantity, 'unitPrice', oi.unit_price::float8) order by oi.id) filter (where oi.id is not null), '[]'::jsonb) as items
    from store.orders o left join store.order_items oi on oi.order_id = o.id
    group by o.id order by o.created_at desc limit 100`
  return rows.map((row) => ({ orderNumber: row.order_number, status: row.status, customerName: row.customer_name, phone: row.phone, email: row.email, courier: row.courier, deliveryAddress: row.delivery_address, total: row.total, createdAt: row.created_at, ordyxStatus: row.ordyx_status, ordyxError: row.ordyx_error, items: row.items }))
}
