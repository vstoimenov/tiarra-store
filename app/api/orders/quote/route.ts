import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { promoCodeSchema, promoError } from '@/lib/promo'
import { checkoutRateLimit } from '@/lib/rate-limit'
import { getCommerceSettings } from '@/lib/commerce-settings'
import { courierPrice } from '@/lib/commerce-settings-schema'

export const runtime = 'nodejs'

const schema = z.object({
  promoCode: promoCodeSchema,
  courier: z.enum(['econt', 'speedy', 'boxnow']),
  deliveryType:z.enum(['office','automat','address']).default('office'),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable(),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(50),
})

interface QuoteRow {
  product_id: string
  variant_id: string | null
  quantity: number
  unit_price: number
  stock: number | null
}

export async function POST(request: Request) {
  if (!(await checkoutRateLimit(request, 'quote'))) return NextResponse.json({ error: 'Твърде много опити. Изчакай няколко минути.' }, { status: 429 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Невалидна количка.' }, { status: 400 })
  const { courier,deliveryType, items, promoCode } = parsed.data
  if(courier==='boxnow' && deliveryType!=='automat')return NextResponse.json({error:'BOX NOW доставя до автомат.'},{status:400})
  const settings=await getCommerceSettings()
  if(deliveryType==='address' && ((courier==='econt'&&!settings.econtAddressEnabled)||(courier==='speedy'&&!settings.speedyAddressEnabled)))return NextResponse.json({error:'Доставката до адрес не е достъпна.'},{status:422})
  if((courier==='econt'&&!settings.econtEnabled)||(courier==='speedy'&&!settings.speedyEnabled)||(courier==='boxnow'&&!settings.boxnowEnabled))return NextResponse.json({error:'Избраният куриер временно не е достъпен.'},{status:422})

  const rows = await sql<QuoteRow[]>`
    with requested as (
      select
        (entry->>'productId')::uuid as product_id,
        nullif(entry->>'variantId', '')::uuid as variant_id,
        sum((entry->>'quantity')::int)::int as quantity
      from jsonb_array_elements(${sql.json(items)}::jsonb) entry
      group by (entry->>'productId')::uuid, nullif(entry->>'variantId', '')::uuid
    )
    select
      requested.product_id,
      requested.variant_id,
      requested.quantity,
      (case when requested.variant_id is null then p.price else v.price end)::float8 as unit_price,
      case when requested.variant_id is null then p.stock else v.stock end as stock
    from requested
    join store.products p on p.id = requested.product_id and not p.is_hidden
    left join store.variants v on v.id = requested.variant_id and v.product_id = p.id
    where
      (requested.variant_id is not null and v.id is not null)
      or (
        requested.variant_id is null
        and not exists (select 1 from store.variants pv where pv.product_id = p.id)
      )`

  const requestedKeys = new Set(items.map((item) => `${item.productId}:${item.variantId ?? ''}`))
  if (rows.length !== requestedKeys.size) {
    return NextResponse.json({ error: 'Продукт от количката вече не е наличен.' }, { status: 409 })
  }
  if (rows.some((row) => row.stock !== null && row.stock < row.quantity)) {
    return NextResponse.json({ error: 'Няма достатъчна наличност за избраното количество.' }, { status: 409 })
  }

  const subtotal = rows.reduce((sum, row) => sum + row.unit_price * row.quantity, 0)
  const shipping = subtotal >= settings.freeShippingThreshold ? 0 : courierPrice(settings,courier,deliveryType)
  let discount = 0
  if (promoCode) {
    try {
      const [result] = await sql<{ discount: number }[]>`select store.promo_discount_for_items(${promoCode}, ${subtotal}, ${sql.json(items)})::float8 as discount`
      discount = result.discount
    } catch (error) {
      const message = promoError(error)
      if (message) return NextResponse.json({ error: message }, { status: 422 })
      throw error
    }
  }
  return NextResponse.json({
    promoCode, discount,
    lines: rows.map((row) => ({
      productId: row.product_id,
      variantId: row.variant_id,
      quantity: row.quantity,
      unitPrice: row.unit_price,
    })),
    subtotal,
    shipping,
    total: Math.round((subtotal + shipping - discount) * 100) / 100,
  })
}

