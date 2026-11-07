import { timingSafeEqual } from 'node:crypto'
import { sql } from '@/lib/db'
import { cancelOrderInOrdyx, syncOrder } from '@/lib/ordyx-sync'
import { sendQueuedOrderEmail } from '@/lib/order-email-queue'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const expected = Buffer.from(`Bearer ${secret ?? ''}`)
  const supplied = Buffer.from(request.headers.get('authorization') ?? '')
  if (!secret || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (process.env.BREVO_API_KEY) {
    const emails = await sql<{id:string}[]>`select id from store.order_email_queue where status in ('pending','failed') and attempts < 10 and created_at > now() - interval '7 days' order by created_at limit 3`
    for(const email of emails) { try { await sendQueuedOrderEmail(email.id) } catch { console.error('Scheduled email retry failed') } }
  }
  if (!process.env.ORDYX_API_KEY) return Response.json({ error: 'Ordyx is not configured' }, { status: 503 })
  // Hobby schedules run once daily, with a variable start time. Use a 48-hour
  // window to avoid losing orders near the daily scheduling boundary.
  const orders = await sql<{ order_number: string }[]>`
    select order_number from store.orders
    where ordyx_sync_status in ('pending', 'failed')
      and status in ('new', 'confirmed') and delivery_type is not null
      and created_at > now() - interval '48 hours'
      and created_at < now() - interval '5 minutes'
    order by created_at limit 3`
  let synced = 0
  for (const order of orders) {
    try { if (await syncOrder(order.order_number)) synced++ }
    catch { console.error('Scheduled Ordyx sync failed', order.order_number) }
  }
  const cancellations = await sql<{ order_number: string }[]>`
    select order_number from store.orders
    where status = 'cancelled' and ordyx_cancel_status in ('pending', 'failed')
      and cancelled_at > now() - interval '48 hours'
    order by cancelled_at limit 3`
  let cancelled = 0
  for (const order of cancellations) {
    try { if (await cancelOrderInOrdyx(order.order_number)) cancelled++ }
    catch { console.error('Scheduled Ordyx cancellation failed', order.order_number) }
  }
  return Response.json({ attempted: orders.length, synced, cancellationAttempts: cancellations.length, cancelled }, { headers: { 'Cache-Control': 'no-store' } })
}
