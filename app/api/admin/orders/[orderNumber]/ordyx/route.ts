import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { cancelOrderInOrdyx, syncOrder } from '@/lib/ordyx-sync'

export async function POST(request: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const { orderNumber } = await context.params
  if (!/^\d+$/.test(orderNumber)) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
  const [order] = await sql<{ status: string }[]>`select status from store.orders where order_number = ${orderNumber}::bigint`
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.status === 'cancelled') {
    await sql`update store.orders set ordyx_cancel_status = 'pending', ordyx_cancel_error = null where order_number = ${orderNumber}::bigint and ordyx_cancel_status != 'cancelled'`
    return NextResponse.json({ ok: await cancelOrderInOrdyx(orderNumber) })
  }
  if (!['new', 'confirmed'].includes(order.status)) return NextResponse.json({ error: 'Order cannot be synced in this status' }, { status: 409 })
  await sql`update store.orders set ordyx_sync_status = 'pending', ordyx_sync_error = null where order_number = ${orderNumber}::bigint and ordyx_sync_status != 'synced'`
  return NextResponse.json({ ok: await syncOrder(orderNumber) })
}
