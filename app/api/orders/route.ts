import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getCourierOffices } from '@/lib/ordyx-offices'
import { syncOrder } from '@/lib/ordyx-sync'

export const runtime = 'nodejs'

const requestSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.union([z.literal(''), z.string().trim().email().max(160)]),
  courier: z.enum(['econt', 'speedy']),
  officeId: z.string().min(1).max(120),
  deliveryAddress: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(1000),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable(),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(50),
})

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Невалидна заявка.' }, { status: 400 }) }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Провери въведените данни.' }, { status: 400 })

  try {
    const data = parsed.data
    const office = (await getCourierOffices(data.courier)).find(entry => entry.id === data.officeId)
    if (!office) return NextResponse.json({ error: 'Избери валиден офис на куриера.' }, { status: 400 })
    data.deliveryAddress = `${office.city}, ${office.name}, ${office.address} [${office.code}]`
    const rows = await sql<{ order_number: string; total: number }[]>`
      select order_number, total::float8 as total from store.create_order(
        ${data.customerName}, ${data.phone}, ${data.email}, ${data.courier},
        ${data.deliveryAddress}, ${data.notes}, ${sql.json(data.items)})`
    try { await syncOrder(rows[0].order_number, data.officeId) }
    catch (error) { console.error('Ordyx sync failed after order creation', error) }
    return NextResponse.json({ orderNumber: rows[0].order_number, total: rows[0].total }, { status: 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code.includes('PRODUCT_NOT_FOUND')) return NextResponse.json({ error: 'Продукт от количката вече не е наличен.' }, { status: 409 })
    if (code.includes('INSUFFICIENT_STOCK')) return NextResponse.json({ error: 'Няма достатъчна наличност за избраното количество.' }, { status: 409 })
    console.error('Order creation failed', error)
    return NextResponse.json({ error: 'Поръчката не беше записана. Опитай отново.' }, { status: 500 })
  }
}
