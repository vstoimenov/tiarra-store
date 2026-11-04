import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'

const schema = z.object({ productIds: z.array(z.string().uuid()).min(1).max(50) })
interface BumpRow { product_id: string; slug: string; title: string; image_path: string | null; unit_price: number }

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Невалидна количка.' }, { status: 400 })
  const productIds = [...new Set(parsed.data.productIds)]
  const rows = await sql<BumpRow[]>`
    with cart_categories as (
      select distinct category_id from store.product_categories where product_id = any(${productIds}::uuid[])
    ), cart_genders as (
      select distinct gender from store.products where id = any(${productIds}::uuid[])
    ), configured as (
      select distinct on (pb.bump_product_id) pb.bump_product_id as product_id, 1000 as relevance, pb.updated_at
      from store.product_bumps pb join store.products p on p.id = pb.bump_product_id
      where pb.product_id = any(${productIds}::uuid[])
        and pb.bump_product_id <> all(${productIds}::uuid[])
        and not p.is_hidden and (p.stock is null or p.stock > 0)
        and not exists (select 1 from store.variants v where v.product_id = p.id)
      order by pb.bump_product_id, pb.updated_at desc
    ), fallback as (
      select p.id as product_id,
        count(distinct cc.category_id) * 100 + case when p.gender in (select gender from cart_genders) then 10 else 0 end as relevance,
        p.updated_at
      from store.products p
      left join store.product_categories pc on pc.product_id = p.id
      left join cart_categories cc on cc.category_id = pc.category_id
      where p.id <> all(${productIds}::uuid[]) and not p.is_hidden and (p.stock is null or p.stock > 0)
        and not exists (select 1 from store.variants v where v.product_id = p.id) and p.price <= 25
      group by p.id
      order by relevance desc, p.updated_at desc limit 6
    ), candidates as (
      select * from configured union all select f.* from fallback f
      where not exists (select 1 from configured c where c.product_id = f.product_id)
    )
    select c.product_id, p.slug, p.title, p.price::float8 as unit_price,
      (select pi.path from store.product_images pi where pi.product_id = p.id order by pi.position limit 1) as image_path
    from candidates c join store.products p on p.id = c.product_id
    order by c.relevance desc, c.updated_at desc limit 2`
  return NextResponse.json({ bumps: rows.map((row) => ({ productId: row.product_id, slug: row.slug, title: row.title, imagePath: row.image_path, unitPrice: row.unit_price })) }, { headers: { 'Cache-Control': 'no-store' } })
}
