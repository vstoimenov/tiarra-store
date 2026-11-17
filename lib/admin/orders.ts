import { sql } from '@/lib/db'

export type OrderStatus = 'new' | 'confirmed' | 'sent' | 'completed' | 'cancelled'
export interface AdminOrder {
  updatedAt: string; notes: string; subtotal: number; shipping: number; deliveryType: 'office' | 'automat' | 'address' | null; officeId: string | null; city: string; postCode: string
  promoCode: string | null; discountAmount: number; orderNumber: string; status: OrderStatus; customerName: string; phone: string; email: string | null
  courier: 'econt' | 'speedy' | 'boxnow'; deliveryAddress: string; total: number; createdAt: string
  ordyxStatus: string; ordyxError: string | null
  internalNotes: string; trackingNumber: string; trackingUrl: string
  items: { id: string; productId: string | null; variantId: string | null; title: string; variantName: string | null; quantity: number; unitPrice: number }[]
}

export async function getAdminOrders(orderNumber?: string): Promise<AdminOrder[]> {
  const rows = await sql<{ updated_at: string; notes: string; subtotal: number; shipping: number; delivery_type: AdminOrder['deliveryType']; office_id: string | null; city: string | null; post_code: string | null; promo_code: string | null; discount_amount: number; order_number: string; status: OrderStatus; customer_name: string; phone: string; email: string | null; courier: 'econt' | 'speedy' | 'boxnow'; delivery_address: string; total: number; created_at: string; ordyx_status: string; ordyx_error: string | null; internal_notes: string; tracking_number: string | null; tracking_url: string | null; items: AdminOrder['items'] }[]>`
    select o.updated_at::text, o.notes, o.subtotal::float8, o.shipping::float8, o.delivery_type, o.office_id, o.city, o.post_code, o.promo_code,o.discount_amount::float8 as discount_amount,o.order_number, o.status, o.customer_name, o.phone, o.email, o.courier,
      o.delivery_address, o.total::float8 as total, o.created_at, o.internal_notes, o.tracking_number, o.tracking_url,
      case when o.status = 'cancelled' then o.ordyx_cancel_status else o.ordyx_sync_status end as ordyx_status,
      case when o.status = 'cancelled' then o.ordyx_cancel_error else o.ordyx_sync_error end as ordyx_error,
      coalesce(jsonb_agg(jsonb_build_object('id', oi.id, 'productId', oi.product_id, 'variantId', oi.variant_id, 'title', oi.title, 'variantName', oi.variant_name, 'quantity', oi.quantity, 'unitPrice', oi.unit_price::float8) order by oi.id) filter (where oi.id is not null), '[]'::jsonb) as items
    from store.orders o left join store.order_items oi on oi.order_id = o.id
    where (${orderNumber ?? null}::bigint is null or o.order_number = ${orderNumber ?? null}::bigint)
    group by o.id order by o.created_at desc limit 100`
  return rows.map((row) => ({ updatedAt: row.updated_at, notes: row.notes, subtotal: row.subtotal, shipping: row.shipping, deliveryType: row.delivery_type, officeId: row.office_id, city: row.city ?? '', postCode: row.post_code ?? '', promoCode: row.promo_code, discountAmount: row.discount_amount, orderNumber: row.order_number, status: row.status, customerName: row.customer_name, phone: row.phone, email: row.email, courier: row.courier, deliveryAddress: row.delivery_address, total: row.total, createdAt: row.created_at, ordyxStatus: row.ordyx_status, ordyxError: row.ordyx_error, internalNotes: row.internal_notes, trackingNumber: row.tracking_number ?? '', trackingUrl: row.tracking_url ?? '', items: row.items }))
}

export async function orderEditingAvailable(): Promise<boolean> {
  const [row] = await sql<{available:boolean}[]>`select to_regprocedure('store.admin_edit_order(bigint,jsonb)') is not null as available`
  return row.available
}
