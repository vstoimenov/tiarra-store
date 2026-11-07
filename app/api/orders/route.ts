import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { getCourierOffices } from '@/lib/ordyx-offices'
import { syncOrder } from '@/lib/ordyx-sync'
import { promoCodeSchema, promoError } from '@/lib/promo'
import { checkoutRateLimit } from '@/lib/rate-limit'
import { sendOrderEmails } from '@/lib/order-email-queue'

export const runtime = 'nodejs'

const requestSchema = z.object({
  visitSessionId: z.string().uuid().nullable().optional(),
  promoCode: promoCodeSchema,
  requestId: z.string().uuid(),
  expectedTotal: z.number().finite().nonnegative(),
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.union([z.literal(''), z.string().trim().email().max(160)]),
  courier: z.enum(['econt', 'speedy']),
  officeId: z.string().min(1).max(120).nullable(),
  deliveryType: z.enum(['office','automat','address']),
  city: z.string().trim().max(100),
  postCode: z.string().trim().max(20),
  deliveryAddress: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(1000),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable(),
    quantity: z.number().int().min(1).max(99),
    source: z.enum(['bump','upsell']).optional(),
  })).min(1).max(50),
})

export async function POST(request: Request) {
  if (!(await checkoutRateLimit(request, 'order'))) return NextResponse.json({ error: 'Твърде много опити. Изчакай няколко минути.' }, { status: 429 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Невалидна заявка.' }, { status: 400 }) }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Провери въведените данни.' }, { status: 400 })

  try {
    const data = parsed.data
    if (data.deliveryType === 'address') {
      if (data.officeId || !data.city || !data.postCode) return NextResponse.json({ error: 'Попълни точен адрес за доставка.' }, { status: 400 })
      data.deliveryAddress = `${data.city}, ${data.postCode}, ${data.deliveryAddress}`
    } else {
      const office = (await getCourierOffices(data.courier)).find(entry => entry.id === data.officeId)
      if (!office || office.isAutomat !== (data.deliveryType === 'automat')) return NextResponse.json({ error: 'Избери валиден офис на куриера.' }, { status: 400 })
      data.deliveryAddress = `${office.city}, ${office.name}, ${office.address} [${office.code}]`
    }
    const rows = await sql.begin(async tx => {
    const created = await tx<{ order_number: string; total: number; is_new: boolean }[]>`
      select order_number, total::float8 as total, is_new from store.create_order_with_settings_and_promo(
        ${data.requestId}, ${data.customerName}, ${data.phone}, ${data.email}, ${data.courier},
        ${data.deliveryType}, ${data.officeId}, ${data.city}, ${data.postCode},
        ${data.deliveryAddress}, ${data.notes}, ${sql.json(data.items)}, ${data.promoCode})`
    if (created[0].is_new && Math.round(created[0].total * 100) !== Math.round(data.expectedTotal * 100)) throw new Error('PRICE_CHANGED')
    if (created[0].is_new) {
      await tx`insert into store.order_email_queue(order_id,kind) select id,'merchant' from store.orders where order_number=${created[0].order_number}::bigint on conflict(order_id,kind) do nothing`
      if(data.email) await tx`insert into store.order_email_queue(order_id,kind) select id,'customer' from store.orders where order_number=${created[0].order_number}::bigint on conflict(order_id,kind) do nothing`
    }
    return created
    })
    const orderNumber=rows[0].order_number
    after(async () => {
      const tasks:Promise<unknown>[] = [
        syncOrder(orderNumber).catch(error=>console.error('Ordyx sync failed after order creation',error)),
        sendOrderEmails(orderNumber).catch(error=>console.error('Order email queue failed',error)),
      ]
      if(rows[0].is_new) tasks.push(Promise.resolve(sql`select store.attach_order_attribution(${orderNumber}, ${data.visitSessionId ?? null}, ${sql.json(data.items)})`).catch(error=>console.error('Order attribution failed',error)))
      await Promise.all(tasks)
    })
    return NextResponse.json(
      { orderNumber: rows[0].order_number, total: rows[0].total },
      { status: rows[0].is_new ? 201 : 200 },
    )
  } catch (error) {
    const promotionMessage = promoError(error)
    if (promotionMessage) return NextResponse.json({ error: promotionMessage }, { status: 422 })
    const code = error instanceof Error ? error.message : ''
    if (code === 'PRICE_CHANGED') return NextResponse.json({code,error:'Цената се промени. Прегледай обновената сума и потвърди отново.'},{status:409})
    if (code.includes('PRODUCT_NOT_FOUND')) return NextResponse.json({ error: 'Продукт от количката вече не е наличен.' }, { status: 409 })
    if (code.includes('INSUFFICIENT_STOCK')) return NextResponse.json({ error: 'Няма достатъчна наличност за избраното количество.' }, { status: 409 })
    if (code.includes('COURIER_DISABLED')) return NextResponse.json({error:'Избраният куриер временно не е достъпен.'},{status:422})
    console.error('Order creation failed', error)
    return NextResponse.json({ error: 'Поръчката не беше записана. Опитай отново.' }, { status: 500 })
  }
}
