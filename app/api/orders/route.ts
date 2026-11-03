import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'

const requestSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.union([z.literal(''), z.string().trim().email().max(160)]),
  courier: z.enum(['econt', 'speedy']),
  deliveryAddress: z.string().trim().min(5).max(500),
  notes: z.string().trim().max(1000),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable(),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(50),
})

interface ProductRow {
  product_id: string
  variant_id: string | null
  title: string
  variant_name: string | null
  price: number
  stock: number | null
}

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Невалидна заявка.' }, { status: 400 }) }

  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Провери въведените данни.' }, { status: 400 })

  try {
    const result = await sql.begin(async (tx) => {
      const lines: Array<ProductRow & { quantity: number; lineTotal: number }> = []

      for (const item of parsed.data.items) {
        const rows = item.variantId
          ? await tx<ProductRow[]>`
              select p.id as product_id, v.id as variant_id, p.title, v.name as variant_name,
                v.price::float8 as price, v.stock
              from store.products p join store.variants v on v.product_id = p.id
              where p.id = ${item.productId} and v.id = ${item.variantId} and not p.is_hidden`
          : await tx<ProductRow[]>`
              select p.id as product_id, null::uuid as variant_id, p.title, null::text as variant_name,
                p.price::float8 as price, p.stock
              from store.products p
              where p.id = ${item.productId} and not p.is_hidden
                and not exists (select 1 from store.variants v where v.product_id = p.id)`

        const product = rows[0]
        if (!product) throw new Error('PRODUCT_NOT_FOUND')
        if (product.stock !== null && product.stock < item.quantity) throw new Error('INSUFFICIENT_STOCK')
        lines.push({ ...product, quantity: item.quantity, lineTotal: product.price * item.quantity })
      }

      const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
      const shipping = subtotal >= 39 ? 0 : parsed.data.courier === 'econt' ? 4.5 : 3.5
      const orders = await tx<{ id: string; order_number: string }[]>`
        insert into store.orders
          (customer_name, phone, email, courier, delivery_address, notes, subtotal, shipping, total)
        values
          (${parsed.data.customerName}, ${parsed.data.phone}, ${parsed.data.email || null},
           ${parsed.data.courier}, ${parsed.data.deliveryAddress}, ${parsed.data.notes},
           ${subtotal}, ${shipping}, ${subtotal + shipping})
        returning id, order_number`
      const order = orders[0]

      for (const line of lines) {
        await tx`
          insert into store.order_items
            (order_id, product_id, variant_id, title, variant_name, unit_price, quantity, line_total)
          values
            (${order.id}, ${line.product_id}, ${line.variant_id}, ${line.title}, ${line.variant_name},
             ${line.price}, ${line.quantity}, ${line.lineTotal})`
      }

      return { orderNumber: order.order_number, total: subtotal + shipping }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const code = error instanceof Error ? error.message : ''
    if (code === 'PRODUCT_NOT_FOUND') return NextResponse.json({ error: 'Продукт от количката вече не е наличен.' }, { status: 409 })
    if (code === 'INSUFFICIENT_STOCK') return NextResponse.json({ error: 'Няма достатъчна наличност за избраното количество.' }, { status: 409 })
    console.error('Order creation failed', error)
    return NextResponse.json({ error: 'Поръчката не беше записана. Опитай отново.' }, { status: 500 })
  }
}
