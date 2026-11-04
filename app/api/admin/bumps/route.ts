import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const payloadSchema = z.object({
  productId: z.string().uuid(),
  bumpProductId: z.string().uuid().nullable(),
  label: z.string().trim().min(1).max(60),
})

export async function PUT(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  const { productId, bumpProductId, label } = parsed.data

  if (bumpProductId === null) {
    await sql`delete from store.product_bumps where product_id = ${productId}`
  } else {
    if (productId === bumpProductId) return NextResponse.json({ error: 'Same product' }, { status: 400 })
    const products = await sql<{ id: string }[]>`
      select id from store.products
      where id in (${productId}, ${bumpProductId}) and not is_hidden`
    if (products.length !== 2) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    await sql`
      insert into store.product_bumps (product_id, bump_product_id, label, updated_at)
      values (${productId}, ${bumpProductId}, ${label}, now())
      on conflict (product_id) do update
      set bump_product_id = excluded.bump_product_id,
          label = excluded.label,
          updated_at = now()`
  }

  revalidatePath('/store/[slug]', 'page')
  revalidatePath('/admin/bumps')
  return NextResponse.json({ ok: true })
}

