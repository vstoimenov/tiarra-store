import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateAdminOrderStatus } from '@/lib/admin/order-status'
import { cancelOrderInOrdyx } from '@/lib/ordyx-sync'

const schema = z.object({ status: z.enum(['confirmed', 'sent', 'completed', 'cancelled']) })

export async function PATCH(request: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  const { orderNumber } = await context.params
  if (!/^\d+$/.test(orderNumber)) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  try {
    const result = await updateAdminOrderStatus(orderNumber, parsed.data.status)
    let ordyxWarning = false
    if (result.ordyx_cancel_required) ordyxWarning = !(await cancelOrderInOrdyx(orderNumber))
    return NextResponse.json({ ok: true, ...result, ordyxWarning })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('ORDER_NOT_FOUND')) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (message.includes('INVALID_STATUS_TRANSITION')) return NextResponse.json({ error: 'Invalid status transition' }, { status: 409 })
    console.error('Order status update failed', error)
    return NextResponse.json({ error: 'Status update failed' }, { status: 500 })
  }
}
