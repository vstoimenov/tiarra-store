import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const schema = z.object({
  internalNotes: z.string().trim().max(2000),
  trackingNumber: z.string().trim().max(120),
  trackingUrl: z.union([z.literal(''), z.string().trim().url().max(500)]),
})

export async function PATCH(request: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const { orderNumber } = await context.params
  if (!/^\d+$/.test(orderNumber)) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const rows = await sql<{ order_number: string }[]>`
    update store.orders set internal_notes = ${parsed.data.internalNotes},
      tracking_number = ${parsed.data.trackingNumber || null}, tracking_url = ${parsed.data.trackingUrl || null}, updated_at = now()
    where order_number = ${orderNumber}::bigint returning order_number`
  if (!rows.length) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
