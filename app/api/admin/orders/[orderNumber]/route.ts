import { after, NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { orderEditSchema } from '@/lib/admin/order-edit-schema'
import { getAdminOrders } from '@/lib/admin/orders'
import { getCourierOffices } from '@/lib/ordyx-offices'
import { syncOrder } from '@/lib/ordyx-sync'

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

export async function PUT(request: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'Невалидна заявка.' }, { status: 403 })
  const { orderNumber } = await context.params
  if (!/^\d{1,18}$/.test(orderNumber)) return NextResponse.json({ error: 'Невалидна поръчка.' }, { status: 400 })
  const parsed = orderEditSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Провери въведените данни.' }, { status: 400 })
  try {
    const data = parsed.data
    const [current] = await getAdminOrders(orderNumber)
    if (!current) return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 })
    const deliveryChanged = current.courier !== data.courier || current.deliveryType !== data.deliveryType || current.officeId !== data.officeId || current.deliveryAddress !== data.deliveryAddress || current.city !== data.city || current.postCode !== data.postCode
    if (deliveryChanged && data.deliveryType !== 'address') {
      const office = (await getCourierOffices(data.courier)).find(office => office.id === data.officeId && office.isAutomat === (data.deliveryType === 'automat'))
      if (!office) return NextResponse.json({ error: 'Избери валиден офис или автомат от списъка.' }, { status: 400 })
      data.city = office.city; data.postCode = office.postCode
      data.deliveryAddress = `${office.city}, ${office.name}, ${office.address} [${office.code}]`
    }
    await sql`select store.admin_edit_order(${orderNumber}::bigint, ${sql.json(data)})`
    const [order] = await getAdminOrders(orderNumber)
    if (order.ordyxStatus !== 'synced') after(async () => { try { await syncOrder(orderNumber) } catch (error) { console.error('Ordyx sync after admin edit failed', error) } })
    revalidatePath('/admin/orders'); revalidatePath('/admin/customers')
    revalidatePath('/', 'layout')
    return NextResponse.json({ order, ordyxManualUpdate: order.ordyxStatus === 'synced' }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('ORDER_NOT_FOUND')) return NextResponse.json({ error: 'Поръчката не е намерена.' }, { status: 404 })
    if (message.includes('ORDER_CHANGED')) return NextResponse.json({ error: 'Поръчката е променена междувременно. Презареди страницата преди редакция.' }, { status: 409 })
    if (message.includes('ORDER_NOT_EDITABLE')) return NextResponse.json({ error: 'Могат да се редактират само нови и потвърдени поръчки.' }, { status: 409 })
    if (message.includes('INSUFFICIENT_STOCK')) return NextResponse.json({ error: 'Няма достатъчна наличност за избраното количество. Промените не са записани.' }, { status: 409 })
    if (message.includes('PRODUCT_NOT_FOUND')) return NextResponse.json({ error: 'Продуктът или вариантът вече не е наличен. Премахни го или намали количеството.' }, { status: 409 })
    if (message.includes('INVALID_')) return NextResponse.json({ error: 'Провери продуктите, количествата и отстъпката.' }, { status: 400 })
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '42883') return NextResponse.json({ error: 'Необходимо е активиране на редакцията в Supabase. Изпълни миграцията 20261117100000_admin_edit_order.sql.' }, { status: 503 })
    console.error('Order edit failed', error)
    return NextResponse.json({ error: 'Поръчката не беше записана. Опитай отново.' }, { status: 500 })
  }
}
